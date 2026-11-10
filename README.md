# VaultCompress

A static, browser-based image compressor. Image files are decoded and re-encoded in the browser; this app does not upload them.

## Run locally

From this directory, start a local web server:

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a browser. You can also open `index.html` directly, but a local server is more reliable.

The page loads Tailwind CSS, Font Awesome, and JSZip from public CDNs, so an internet connection is needed to load those libraries. The selected images are processed locally and are not sent to those services.

## Project structure

```text
.
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
└── README.md
```

The browser's Canvas API performs image conversion and compression. JPEG, PNG, and WebP are supported output formats. Batch downloads are packaged into a ZIP with JSZip.
