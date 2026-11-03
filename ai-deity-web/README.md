# DIVINE Frontend

React + Vite frontend for the AI-Deity-Web interactive artwork.

- [App.jsx](src/App.jsx): interaction state, camera capture, archive API calls and print requests.
- [App.css](src/App.css): page layout and styling.
- [main.jsx](src/main.jsx): React entry point.

See the [repository guide](../README.md) for setup and the [asset inventory](../docs/ASSETS.md) for images that must be restored before building this source edition.

The frontend calls the Express backend at `http://localhost:3001`. After restoring assets, run `npm ci` and `npm run dev` from this directory.
