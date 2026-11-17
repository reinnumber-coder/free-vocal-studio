# Free Vocal Studio — v2

## What is working in this version
- Mobile-friendly website / PWA shell.
- Local audio file selection and preview.
- Browser-based Demucs four-stem AI separation using `demucs-web` + `onnxruntime-web`.
- Select which stems to export: vocals, drums, bass, other.
- Preview each generated stem and download WAV files.
- Download all selected stems as a ZIP.
- Audio inference is performed in the browser; uploaded audio is not sent to a processing server.

## Model download and requirements
- The first separation downloads the Demucs ONNX model (roughly 172 MB for the referenced demucs-web implementation).
- The model is hosted by the project's public model host; model download requires an internet connection.
- Processing speed and maximum practical track length depend on the phone's CPU, available memory, browser and thermal conditions.
- The app currently enforces a 5-minute limit as a conservative mobile stability guard, not a paid usage quota.
- Keep Chrome open during processing. Start with a short test track.

## Not implemented yet
Lead/backing vocal isolation, harmony/doubles, male/female split, six-stem guitar/piano separation, cleanup models, multiple model selection and ensemble mode are NOT yet implemented. The current engine provides only the four broad Demucs stems. Do not describe the advanced targets as active until specialist models and tested pipelines are added.

## Deploy
Replace the existing repository's `index.html`, `manifest.webmanifest`, `sw.js`, and `README.md` with these files at the repository root. GitHub Pages will publish the changes after commit.

## Runtime dependencies
Loaded as browser ES modules:
- `onnxruntime-web` 1.20.1 via esm.sh
- `demucs-web` via esm.sh
- `jszip` 3.10.1 via esm.sh (only when ZIP export is tapped)

This is a static-site integration; no backend or paid inference API is included.
