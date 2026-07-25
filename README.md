
---

# Ethereal Responsive Website

[Live Site](https://www.raimonvibe.com/)

## Overview

This project is a clean, ethereal-style responsive website built with HTML5, CSS/SCSS and JavaScript. It adapts smoothly across desktop, tablet and mobile, offering a calm, sophisticated visual experience.

## Features

* Fully responsive layout – optimized for all screen sizes.
* Elegant design with soft colours, subtle animations and well-balanced whitespace.
* Built with SCSS for more maintainable styling.
* Minimal, clean JavaScript for page interactions.
* Easy to customise (update content, images, layout) to suit your personal portfolio or brand.

## Demo

You can explore the live version here:
[https://www.raimonvibe.com/](https://www.raimonvibe.com/)

## Getting Started

### Prerequisites

* A modern web browser.
* (Optional) Node.js & npm if you use a build toolchain for SCSS or bundling.

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/raimonvibe/responsive_web_design.git
   ```
2. Navigate into the project directory

   ```bash
   cd responsive_web_design
   ```
3. (Optional) If build tooling (SCSS compile, etc) is used, install dependencies:

   ```bash
   npm install
   ```
4. Open `index.html` (or the main entry file) in your browser.
5. For deployment: upload the files to your web hosting provider or use static-site hosting.

## File Structure

```
/assets/
   /css/tour.css   ← guided tour styling
   /js/tour.js     ← guided tour steps + engine
   /images/        ← ethereal style visuals
index.html         ← Main home page
LegalNotice.html   ← Legal page
PrivacyNotice.html ← Privacy page
sitemap.xml        ← Sitemap (if included)
LICENSE            ← MIT licence (or other) 
README.md          ← This file
...other files
```

## Guided Tour

First-time visitors get a spotlight walkthrough of the site: an 11-step journey
across `index.html` → `about.html` → `casestudy.html`, ending on the contact form.
A **Tour** button in the bottom-right corner replays it at any time.

* **Editing the steps** – all copy lives in the `ROUTE` array at the top of
  `assets/js/tour.js`. Each step is `{ target, title, body }`, where `target` is a
  CSS selector; omit it for a centred step with no spotlight. Smaller pages
  (elements, legal, privacy) have a single contextual note in `ASIDES`.
* **Only shown once** – completion is remembered in `localStorage` under
  `rv-tour-v1-done`; clear that key to see the first-visit behaviour again.
  Mid-tour position is held in `sessionStorage` so the tour survives page changes.
* **Responsive** – steps can declare `minWidth` to be skipped on narrow screens
  (the sidebar step is, since the sidebar is hidden below 737px), and the step
  count adjusts to match. Below 737px the card docks to the bottom as a sheet.
* **Accessibility** – `role="dialog"` with a focus trap, arrow keys to move
  between steps, `Esc` to leave, and `prefers-reduced-motion` is respected.
* **Cookie banner** – auto-start waits until the CookieScript banner has been
  answered, so the two never fight over the screen.

## Customisation Guide

* **Colour palette**: Modify SCSS variables to adjust primary, secondary or accent colours.
* **Images**: Replace the image files inside `/assets/images/` with your own visuals to match your personal style or brand.
* **Fonts / Icons**: Edit the `<head>` in `index.html` to include your chosen fonts or icon set.
* **Deploying**: If using a hosting service like Vercel or similar, connect the repository and set the root directory; the site will build and publish automatically.

## Why this project?

* Provides a refined, elegant website template that’s polished and ready for use.
* Demonstrates modern responsive web design techniques (flexible layouts, media queries, mobile-first) in a stylish format.
* Gives you a strong base to launch a small website, portfolio, or campaign quickly and with minimal fuss.

## Contributions

Contributions are welcome! If you’d like to suggest improvements — such as additional page templates, performance optimisations, accessibility enhancements, or multi-language support — please submit a pull request or open an issue.

## License

This project is provided under the MIT License — you’re free to use it for personal or commercial projects (please check the `LICENSE` file in the repo).

---

Feel free to let me know if you’d like me to add:

* Badges (build status, license, version)
* A screenshot or preview section
* Accessibility notes, supported-browsers list
* Multi-language version (English + Dutch)
* Or anything else you’d like included in the README.
