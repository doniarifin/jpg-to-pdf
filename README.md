# PDF Toolkit

A fast, privacy-friendly web app for everyday PDF tasks — built with React, TypeScript, and Vite. Everything runs in the browser; no files are ever uploaded to a server.

**Live demo:** [https://doniarifin.github.io/pdf-toolkit](https://doniarifin.github.io/pdf-toolkit)

---

## Features

### JPG / PNG → PDF
- Convert multiple images into a single PDF
- Drag-and-drop to reorder pages
- Real-time PDF preview with page layout
- Adjustable settings:
  - Page orientation (portrait / landscape)
  - Page size (A4, Letter, Legal)
  - Custom margins
- Delete individual pages before generating the PDF
- Automatic file naming based on the first uploaded image

### Merge PDF
- Combine multiple PDF files into a single document
- Drag-and-drop to reorder files before merging
- Page order in the output matches the order in the list
- Friendly error handling for password-protected or unreadable PDFs

---

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- jsPDF — image → PDF generation
- pdf-lib — merging & cropping existing PDFs
- pdfjs-dist — rendering PDF pages for the preview/thumbnail UI
- @dnd-kit — drag-and-drop reordering
- react-router-dom — client-side routing
- FontAwesome — icons

---

## Libraries per Feature

A quick map of which npm packages power each tool:

| Feature | Library | What it does |
| --- | --- | --- |
| JPG / PNG to PDF | [jsPDF](https://github.com/parallax/jsPDF) | Places each image onto a PDF page (with the chosen orientation, size, and margin) and exports the file. |
| Merge PDF | [pdf-lib](https://pdf-lib.js.org/) | Loads each PDF and copies its pages, in the chosen order, into a new document. |
| Crop PDF | [pdf-lib](https://pdf-lib.js.org/) | Shrinks each page by rewriting its `MediaBox`/`CropBox` to the selected region, then saves the file. |
| PDF Preview/Thumbnails | [pdfjs-dist](https://mozilla.github.io/pdf.js/) | Renders page previews and thumbnails in the browser so the crop area can be selected visually. |
| PDF to JPG | [pdfjs-dist](https://mozilla.github.io/pdf.js/) + [jszip](https://stuk.github.io/jszip/) | Renders each page to a JPG image via canvas; when more than one page is converted, JSZip bundles them into a downloadable `.zip`. |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173/pdf-toolkit/](http://localhost:5173/pdf-toolkit/) in your browser.

### Build for production

```bash
npm run build
```

Output goes to `dist/`.

### Preview the production build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Project Structure

```
src/
├── components/        # Reusable UI: UploadArea, Button, SortableItem, etc.
├── pages/             # Top-level pages: Home, Merge
├── features/pdf/      # PDF logic: pdfService (image → PDF), mergeService (PDF + PDF)
├── utils/             # Shared helpers
├── App.tsx            # Nav bar + route definitions
└── main.tsx           # App entry, wrapped in HashRouter
```

---

## How It Works

**Image → PDF:** Each uploaded image is loaded into an `Image` element, drawn onto a `jsPDF` page at the configured size/orientation/margin, then saved as a single PDF.

**PDF + PDF → merged PDF:** Each uploaded PDF is loaded as raw bytes with `pdf-lib`'s `PDFDocument.load`. Pages are copied into a new document with `copyPages` in the user-chosen order, then saved back out as a downloadable Blob.

All processing happens locally in the browser — no network calls, no backend.

---

## Deployment

This project is deployed to GitHub Pages via `.github/workflows/deploy.yml`. Pushing to `master` triggers a build and publishes `dist/` to the `gh-pages` environment.

`vite.config.ts` uses `base: "/pdf-toolkit/"` so the bundle paths resolve correctly under the GitHub Pages subpath. The app uses `HashRouter` from `react-router-dom` because GitHub Pages does not perform SPA fallback for deep links — URLs look like `/#/merge` instead of `/merge`.

---

## Contributing

Contributions are welcome! Whether it's a bug fix, a new tool, a UI improvement, or a docs tweak — pull requests and issues are appreciated.

### Ways to contribute

- **Report bugs** — open an issue with steps to reproduce, expected vs actual behavior, and your browser/OS.
- **Suggest features** — open an issue describing the use case. PDF tools that would benefit from being bundled: split, compress, rotate, watermark, sign, redact.
- **Improve the UI** — accessibility, responsive layouts, dark mode, animations.
- **Write code** — see below.
- **Improve docs** — README, code comments, examples.

### Local development setup

1. Fork the repository on GitHub.
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/pdf-toolkit.git
   cd pdf-toolkit
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch:
   ```bash
   git checkout -b feature/my-change
   ```
5. Start the dev server and verify the app loads at `http://localhost:5173/pdf-toolkit/`:
   ```bash
   npm run dev
   ```
6. Make your changes. Run `npm run lint` and `npm run build` before opening a PR.

### Pull request guidelines

- Keep changes focused. One feature or fix per PR.
- Match the existing code style (TypeScript, Tailwind utilities, the existing `Button`/`UploadArea` component patterns).
- Don't add heavy dependencies without discussing in an issue first.
- Run `npm run lint` and `npm run build` locally before pushing.
- Describe **what** changed and **why** in the PR description. Screenshots help for UI changes.

### Adding a new PDF tool

The codebase is structured so a new tool is roughly:

1. A new page under `src/pages/` (e.g. `Split.tsx`).
2. A service under `src/features/pdf/<tool>Service.ts`.
3. A new `<Route>` in `src/App.tsx`.
4. A new `<NavLink>` in the top nav.

If you're planning something substantial, open an issue first so we can discuss the approach.

---

## License

This project is licensed under the [MIT License](LICENSE).
