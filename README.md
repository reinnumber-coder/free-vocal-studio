# Free Vocal Studio — starter build

This is an Android-friendly, installable PWA interface starter.

## Current working features
- Responsive mobile interface
- Local audio file picker and preview (audio remains in the browser)
- PWA manifest and service-worker app-shell caching
- UI for vocal/instrument targets, model choice, quality and ensemble settings

## Important: AI processing is not yet connected
This starter does NOT currently separate stems, clean vocals, or export processed audio. The controls are a prepared UI, not a functioning AI pipeline. It deliberately does not fake results.

## Recommended engine integration
A browser-local Demucs ONNX engine is a realistic first milestone:
- Four stems: vocals, drums, bass, other
- Six stems: adds guitar and piano
- ONNX Runtime Web inference in the browser
- Large model download on first use; cache the model for later sessions

Reference implementation and model notes:
- https://stemsplit.github.io/demucs-onnx/browser/
- https://github.com/HRSadeghi/demucs-onnx
- UVR GUI (MIT; preserve attribution): https://github.com/Anjok07/ultimatevocalremovergui

Advanced targets such as lead-vs-backing, harmony/doubles, and male/female voice separation need additional specialist models and should not be represented as features of a standard Demucs 4/6-stem model.

## Run locally
Open `index.html` for the basic interface and local audio preview. For PWA installation and service-worker support, host over HTTPS (for example, GitHub Pages).

## Free / unlimited caveat
There is no paid inference API in this starter. Local inference avoids server quotas, but speed and practical track length depend on device memory, CPU/GPU, browser support and model size. "Unlimited" means no app-imposed credit counter, not unlimited device resources.
