## Cursor Cloud specific instructions

This is a static HTML/CSS marketing site (no build system, no package manager, no installable dependencies).

### Running the dev server

From the repo root, serve files with Python (use a named tmux session so the server survives backgrounding):

```sh
SESSION_NAME="static-http-8000"
tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION_NAME" 2>/dev/null || \
  tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$PWD" -- "${SHELL:-bash}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" 'python3 -m http.server 8000' C-m
```

Then open `http://localhost:8000/` in the browser.

### Project structure

- `index.html` — homepage
- `motorcycle-suspension-canberra.html` — Canberra SEO landing page
- `suspension-tuning-made-simple.html`, `the-suspension-engineers-handbook.html` — book landing pages (Payhip checkout links)
- `assets/css/styles.css` — shared styles used by all HTML pages
- `assets/images/`, `assets/logos/` — images and supplier SVG logos
- `script.js`, root `styles.css` — legacy/unused by current HTML (no `<script src="script.js">` in pages)
- `mountain-race-shop-site/` — smaller duplicate bundle (homepage + Canberra only)

### Lint / test / build

There is no linter, test runner, or build step. Smoke-test with `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/` and key paths under `assets/`.

### Notes

- Contact is via `mailto:` / `tel:` links, not a backend form.
- Book purchases go to external Payhip URLs; no local API or database.
- Do not run `npm install` — there is no `package.json` or lockfile.
