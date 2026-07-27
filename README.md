# Collection Scanner

A camera-based QR scanner for an [RO-Crate](https://www.researchobject.org/ro-crate/) catalogue and register, built as a plain HTML/CSS/JS site. No npm install, no bundler, no TypeScript: just static files served as-is, using native ES modules.

## TODO
- Check RO-Crate validity
- Use real cat IDs
- Use real cat properties

## Use it online

The app is hosted on GitHub Pages, so you can use it without running anything locally:

**https://language-research-technology.github.io/collection-scanner/**

Scan this QR code with your phone's camera to open it directly:

![QR code linking to the GitHub Pages deployment](images/github-pages-qr.png)

Want to try the scanner itself without printing anything? [Sample QR codes](https://language-research-technology.github.io/collection-scanner/data/codes/) are hosted alongside the app — open that page on one device and scan the codes on it from another.

## How it works

- **Scan** a QR code with the device camera. It's looked up by `@id` in the **register**: found and already promoted → opens the linked **catalogue** entry; found, not yet promoted → opens that **register** entry; not found at all → creates a new register entry pre-filled with the scanned code.
- **Browse** toggles between the catalogue and the register.
- **Promote to catalogue** gives the new catalogue entry its own freshly-generated `@id` (`crypto.randomUUID()`), linked back to the register entry via `custom:registerId`. Every catalogue `@id` is meant to have a register entry referencing it this way — catalogue entries can only be created by promoting a register entry, and a register entry can't be deleted once it's linked.
- Data lives in the browser's IndexedDB (hand-rolled wrapper, no `idb-keyval`) and round-trips to real `ro-crate-metadata.json` files via the **Export**/**Import** buttons.

See [data/](data/) for sample crates and QR codes, and the top-level README there for more on the data model.

## Generating QR codes

A code encodes nothing but a plain-text `@id` string — no URL, no JSON, just the exact value the scanner matches against the register (e.g. `#reg-2023-014`). Any QR generator works; for example, with [`qrencode`](https://fukuchi.org/works/qrencode/):

```bash
qrencode -o my-code.png -s 10 -m 2 "#reg-2023-014"
```

- **Code for an existing item** — encode that register entry's `@id` value exactly as it appears in `ro-crate-metadata.json`, including the leading `#`.
- **Code for a new item** — pick any `@id` string not already used in the register (following the same `#`-prefixed convention) and encode it. Scanning it won't match anything, so the app opens the "create new register entry" flow pre-filled with that id — see `#new-001` / `#new-002` in [data/codes/](data/codes/) for examples.

## Project structure

| file | description |
| --- | --- |
| index.html | entry point, loads styles.css and src/main.js |
| styles.css | all styles |
| src/ | source modules |
| src/main.js | bootstraps the app |
| src/app.js | state + render orchestration |
| src/dom.js | tiny hyperscript-style element builder — the only "framework" here |
| src/rocrate.js | RO-Crate helpers (crate model, CRUD, id generation) |
| src/storage.js | raw IndexedDB wrapper |
| src/fileIO.js | export (download) / import (file picker) of ro-crate-metadata.json |
| src/scanner.js | camera QR scanning, wraps the vendored qr-scanner library |
| src/listView.js | list screen builder |
| src/catalogueForm.js | catalogue entry form builder |
| src/registerForm.js | register entry form builder |
| vendor/ | vendored libraries |
| vendor/qr-scanner.min.js + vendor/qr-scanner-worker.min.js | vendored from the qr-scanner npm package (ESM build, MIT licensed — see qr-scanner-LICENSE) |


## Running it locally

Camera access requires a secure context (HTTPS or `localhost`) and ES module `<script>` tags require a real HTTP origin — you can't just double-click `index.html`. Serve the folder with any static file server, for example:

```bash
python3 -m http.server 4400
```

or

```bash
npx serve .
```

then open `http://localhost:4400` (or whatever port/tool you used).

### Testing on a phone over the same WiFi

You need HTTPS to test camera access from another device on your network. Any static-server option with a `--ssl`/HTTPS flag works, or put a tool like `mkcert`-generated certs in front of the plain server.

Quickest path, using `local-web-server` (no install required):


1. From this folder, start an HTTPS static server:
   ```bash
   npx local-web-server --https --port 4400
   ```
   This generates a self-signed certificate automatically.
2. On the phone, open `https://<your-ip>:4400` (e.g. `https://192.168.1.64:4400`).
3. Accept the certificate warning — it's self-signed, so the browser will flag it as untrusted:
   - Chrome/Android: **Advanced → Proceed**
   - Safari/iOS: **Show Details → visit this website**
4. Allow camera access when prompted.

To avoid the warning entirely, generate a locally-trusted cert with `mkcert` (`brew install mkcert`) and point your static server at it instead.
