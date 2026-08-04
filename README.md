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
- **Promote to catalogue** gives the new catalogue entry its own freshly-generated `@id` (see [Id schemes](#id-schemes) below), linked back to the register entry via `custom:registerId`. Every catalogue `@id` is meant to have a register entry referencing it this way — catalogue entries can only be created by promoting a register entry, and a register entry can't be deleted once it's linked.
- Data lives in the browser's IndexedDB (hand-rolled wrapper, no `idb-keyval`) and round-trips to real `ro-crate-metadata.json` files via the **Export**/**Import** buttons.

See [data/](data/) for sample crates and QR codes, and the top-level README there for more on the data model.

### Id schemes

Catalogue and register ids are generated independently, since the two are expected to evolve separately. Both follow the same `#<prefix>-<hash>` shape — a full, untruncated SHA-256 hash of the generation time (plus an internal counter, so generating many ids in the same millisecond — e.g. a Print batch — can't collide). No security property is needed here; SHA-256 was just the easiest hash already built into the browser.

- **Catalogue** — `#cat-<hash>`, e.g. `#cat-606657315528fc7d7d5db17299d1f7c949c8d63955bd81735304aa436e472f6c`.
- **Register** — `#reg-<hash>`, e.g. `#reg-7ba39b5294e21b7a6aecc2215ed8a32febabd28508d7871f4bbe87502edc9edc`.

## Generating QR codes

A code encodes nothing but a plain-text `@id` string — no URL, no JSON, just the exact value the scanner matches against the register (e.g. `#3fa71ae22cf0790a59ae4acac136c93a66378f539dcc85c9f673f3c313787a2f`). Any QR generator works; for example, with [`qrencode`](https://fukuchi.org/works/qrencode/):

```bash
qrencode -o my-code.png -s 10 -m 2 "#3fa71ae22cf0790a59ae4acac136c93a66378f539dcc85c9f673f3c313787a2f"
```

- **Code for an existing item** — encode that register entry's `@id` value exactly as it appears in `ro-crate-metadata.json`, including the leading `#`.
- **Code for a new item** — pick any `@id` string not already used in the register (following the same `#`-prefixed convention) and encode it. Scanning it won't match anything, so the app opens the "create new register entry" flow pre-filled with that id — see the two "Unassigned" examples in [data/codes/](data/codes/).

The **Print** screen in the app does this for you: choose how many blank codes to generate (fresh register-scheme ids — see [Id schemes](#id-schemes) below) and a layout — 6/12/24/30 per A4 page, evenly gridded — then print and stick them onto objects ahead of time; scan one later to create its register entry. For exact label stock, upload your own layout as a JSON file instead of a preset; use "Download example template" on that screen to get the exact shape to edit (`pageWidthMm`/`pageHeightMm`, `columns`/`rows`, `cellWidthMm`/`cellHeightMm`, `marginTopMm`/`marginLeftMm`, `gapXMm`/`gapYMm`).

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
| src/printCodes.js | Print screen: generate blank codes and a page layout, then print them |
| vendor/ | vendored libraries |
| vendor/qr-scanner.min.js + vendor/qr-scanner-worker.min.js | vendored from the qr-scanner npm package (ESM build, MIT licensed — see qr-scanner-LICENSE) |
| vendor/qrcode-generator.mjs | vendored from the qrcode-generator npm package (dependency-free ES module, MIT licensed — see qrcode-generator-LICENSE) |


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

You need HTTPS to test camera access from another device on your network. A plain self-signed cert (`npx local-web-server --https`) puts up a certificate warning you can click through, but **on Safari/iOS this often isn't enough** — WebKit can silently block camera access on a self-signed cert even after you've accepted the warning, since the cert chain itself isn't trusted by the system. It works fine on GitHub Pages (a real CA-issued cert) but not necessarily over a self-signed one on your LAN. Use [`mkcert`](https://github.com/FiloSottile/mkcert) instead — it generates a cert trusted by your machine's own certificate store, so there's no warning and no WebKit special-casing.

1. Install `mkcert` and add its local CA to your system's trust store (one-time, needs your password):
   ```bash
   brew install mkcert
   mkcert -install
   ```
2. From this folder, generate a cert covering `localhost` and your machine's LAN IP (find the IP with `ipconfig getifaddr en0`):
   ```bash
   mkdir -p .certs
   mkcert -cert-file .certs/local-cert.pem -key-file .certs/local-key.pem localhost 127.0.0.1 <your-ip>
   ```
   `.certs/` is gitignored — regenerate it locally on each machine you test from rather than committing it.
3. Start the server with that cert:
   ```bash
   npx local-web-server --port 4400 --key .certs/local-key.pem --cert .certs/local-cert.pem
   ```
4. **One-time per phone:** `mkcert -install` only trusts the CA on the machine you ran it on — the phone has never seen it and will still show a "connection not private" warning until it trusts the CA too. Get the CA's root cert onto the phone and install it there:
   ```bash
   cp "$(mkcert -CAROOT)/rootCA.pem" mkcert-rootCA.pem
   ```
   With the server above still running, open `https://<your-ip>:4400/mkcert-rootCA.pem` in Safari/Chrome on the phone — it'll offer to download a configuration profile. Then:
   - **iOS:** Settings → (tap "Profile Downloaded" near the top) → **Install** → enter passcode → **Install** → **Install** → **Done**. Then Settings → General → About → scroll to the bottom → **Certificate Trust Settings** → toggle **full trust** on for the mkcert entry.
   - **Android:** Settings → Security → Encryption & credentials → Install a certificate → CA certificate → select the downloaded file.

   Delete `mkcert-rootCA.pem` from the project root afterward — it's just a temporary copy to get the file onto the phone over the same HTTPS connection, not something to keep around or commit.
5. On the phone, open `https://<your-ip>:4400` (e.g. `https://192.168.1.64:4400`) — no certificate warning, and camera access should just work.

If you'd rather not deal with `mkcert`, the plain self-signed route (`npx local-web-server --https --port 4400`, then click through the warning) still works for everything except camera access on Safari/iOS specifically.
