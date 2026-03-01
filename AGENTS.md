## Cursor Cloud specific instructions

This is a static HTML/CSS/JS website (no build system, no package manager, no dependencies).

### Running the dev server

Serve the site with Python's built-in HTTP server:

```sh
python3 -m http.server 8000 &
```

Then open `http://localhost:8000/` in the browser.

### Project structure

- `index.html` — single-page site
- `styles.css` — all styles
- `script.js` — vanilla JS (product filtering, mobile nav, logo loader, demo contact form)
- `assets/logos/` — SVG supplier logos

### Notes

- There is no linter, test runner, or build step configured.
- The contact form is a client-side demo stub (not wired to a backend).
- No `package.json`, `node_modules`, or lockfile exists; do not run `npm install`.
