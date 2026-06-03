## Cursor Cloud specific instructions

This is a static HTML/CSS/JS website (no build system, no package manager, no dependencies).

### Running the dev server

Serve the site with Python's built-in HTTP server:

```sh
python3 -m http.server 8000 &
```

Then open `http://localhost:8000/` in the browser.

### Project structure

- `index.html` — main homepage (and additional static pages at repo root, e.g. `motorcycle-suspension-canberra.html`, `the-suspension-engineers-handbook.html`)
- `assets/css/styles.css` — shared styles linked by the current HTML pages
- `assets/images/` — book covers and other images
- `assets/logos/` — SVG supplier logos
- `script.js` — legacy vanilla JS (product grid, mobile nav, logo loader); not referenced by the current root `index.html`
- `styles.css` — older stylesheet at repo root; live pages use `assets/css/styles.css`
- `mountain-race-shop-site/` — alternate copy of the site bundle (not required for local dev if serving from repo root)

### Notes

- There is no linter, test runner, or build step configured.
- CTAs use `mailto:` and `tel:` links; there is no backend API.
- No `package.json`, `node_modules`, or lockfile exists; do not run `npm install`.
- The VM update script is a no-op (`true`) because this repo has no installable dependencies.
