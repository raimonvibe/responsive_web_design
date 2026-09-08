#!/usr/bin/env bash
#
# Checks the vendored JavaScript in assets/js against the GitHub Advisory
# Database.
#
# This site has no package.json - its dependencies are committed files, so
# neither Dependabot nor `npm audit` can see them. This script reads the
# version out of each library's banner comment and asks the advisory API
# whether that exact version is affected by anything.
#
# Exits non-zero only when a vulnerability is found. Being out of date is
# reported but does not fail the run: replacing a vendored file is a manual
# edit, not something to break the build over.
#
# Depends only on `gh` (its --jq is built in) and `npm view`, both of which
# are preinstalled on GitHub runners.

set -euo pipefail

JS_DIR="assets/js"

# file basename -> npm package that carries its advisories.
# Libraries with no npm counterpart are listed for manual review instead.
map_package() {
  case "$1" in
    jquery.min.js)          echo "jquery" ;;
    jquery.scrollex.min.js) echo "jquery.scrollex" ;;
    jquery.scrolly.min.js)  echo "jquery.scrolly" ;;
    *)                      echo "" ;;
  esac
}

# is_newer A B - true when A is a strictly higher version than B.
# Guards against reporting "newer available" for a vendored library whose npm
# entry is an unrelated or stale publish sitting below the bundled version.
is_newer() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -1)" = "$1" ]
}

# Pull "3.7.1" out of a banner like "/*! jQuery v3.7.1 | (c) ... */".
extract_version() {
  head -c 400 "$1" \
    | grep -oiE 'v[0-9]+\.[0-9]+(\.[0-9]+)?(-[0-9A-Za-z.]+)?' \
    | head -1 \
    | sed 's/^[vV]//'
}

vulnerable=0
checked=0
summary=""

emit() {
  echo "$1"
  summary+="$1"$'\n'
}

emit "## Vendored JavaScript dependency check"
emit ""
emit "| Library | Version | Source | Status |"
emit "|---|---|---|---|"

for file in "$JS_DIR"/*.js; do
  [ -e "$file" ] || continue
  name="$(basename "$file")"
  version="$(extract_version "$file" || true)"
  package="$(map_package "$name")"

  # First-party or unversioned files: nothing upstream to compare against.
  if [ -z "$version" ]; then
    emit "| \`$name\` | - | first-party | not tracked |"
    continue
  fi

  if [ -z "$package" ]; then
    emit "| \`$name\` | $version | no npm counterpart | manual review |"
    continue
  fi

  checked=$((checked + 1))

  # The advisories API does the version-range matching itself, so this needs
  # no semver logic of its own.
  if ! lines="$(gh api "/advisories?ecosystem=npm&affects=${package}@${version}&per_page=100" \
                  --jq '.[] | "  - \(.ghsa_id) [\(.severity)] \(.summary)"' 2>/dev/null)"; then
    emit "| \`$name\` | $version | npm:$package | could not reach advisory API |"
    continue
  fi

  if [ -n "$lines" ]; then
    count="$(printf '%s\n' "$lines" | grep -c '^')"
  else
    count=0
  fi

  latest="$(npm view "$package" version 2>/dev/null || true)"
  [ -n "$latest" ] || latest="unknown"

  if [ "$count" -gt 0 ]; then
    vulnerable=1
    emit "| \`$name\` | $version | npm:$package | **$count advisory/advisories** (latest upstream: $latest) |"
    while IFS= read -r line; do
      emit "$line"
    done <<< "$lines"
  elif [ "$latest" != "unknown" ] && is_newer "$latest" "$version"; then
    emit "| \`$name\` | $version | npm:$package | no advisories, newer available ($latest) |"
  else
    emit "| \`$name\` | $version | npm:$package | up to date, no advisories |"
  fi
done

emit ""
emit "Checked $checked library/libraries against the GitHub Advisory Database."

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  printf '%s' "$summary" >> "$GITHUB_STEP_SUMMARY"
fi

if [ "$vulnerable" -ne 0 ]; then
  echo "::error::A vendored library has a known vulnerability - see the table above."
  exit 1
fi

echo "No known vulnerabilities in the vendored JavaScript."
