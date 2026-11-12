# VaultCompress

A static, browser-based image compressor. Image files are decoded and re-encoded in the browser; this app does not upload them. After the first online visit, a service worker saves the app and its dependencies so it can also be used offline.

## Run locally

From this directory, start a local web server:

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a browser. A local server (or HTTPS hosting) is required for offline support because browsers only allow service workers on secure origins.

Visit the page once while online and wait for its local libraries to load. The service worker then caches the app shell and dependencies for later offline visits. If offline support is not available in the browser, compression still runs locally while the page is open.

## Project structure

```text
.
├── index.html
├── service-worker.js
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── assets/
│   ├── vendor/
│   │   ├── fontawesome.min.css
│   │   ├── jszip.min.js
│   │   └── tailwindcss.js
│   └── webfonts/
└── README.md
```

The browser's Canvas API performs image conversion and compression. JPEG, PNG, and WebP are supported output formats. Batch downloads are packaged into a ZIP with JSZip.

## Bundled libraries and licenses

The app bundles Tailwind CSS (Play CDN), Font Awesome Free 6.4.0, and JSZip 3.10.1 so the page does not need a CDN connection. Tailwind CSS and JSZip are MIT-licensed. Font Awesome Free code is MIT-licensed, its fonts are SIL OFL 1.1, and its icons are CC BY 4.0. See the [Tailwind CSS license](https://github.com/tailwindlabs/tailwindcss/blob/v3.4.17/LICENSE), [JSZip license](https://github.com/Stuk/jszip/blob/v3.10.1/LICENSE.markdown), and [Font Awesome Free license details](https://fontawesome.com/license/free).
