FREE VOCAL STUDIO — VERSION 6.0

This release replaces the old demucs-web CDN wrapper with a bundled HTDemucs v4 + ONNX Runtime Web pipeline based on the client-side-ml reference architecture.

WHAT CHANGED
- HTDemucs inference runs in a Web Worker rather than on the page's main thread.
- GitHub Actions installs the dependencies, bundles the worker and app, and copies the model and ONNX Runtime WASM files into the Pages build output.
- The browser uses local same-origin model/runtime files, not the previous esm.sh demucs-web wrapper.
- One WASM thread is used initially for mobile compatibility.
- Clearer progress and error messages; four selectable outputs; individual WAV downloads and ZIP export.
- The website displays VERSION 6.0 prominently.

DEPLOYMENT (ANDROID / GITHUB MOBILE)
1. Upload the CONTENTS of this ZIP into the root of your existing free-vocal-studio repository on the main branch. Keep the .github/workflows/deploy.yml file and src folder structure. Replace the old index.html with the new project files.
2. In GitHub repository Settings → Pages, change Build and deployment → Source to GitHub Actions. Save.
3. Open the Actions tab and wait for “Build and deploy Free Vocal Studio” to finish successfully.
4. Open the Pages website. Confirm the large WEBSITE VERSION 6.0 banner.

IMPORTANT
- This package has not been run through GitHub Actions or tested on the user's Android phone in this environment. Do not treat it as confirmed working until the workflow succeeds and an audio test finishes.
- First use downloads/loads a model of roughly 170 MB. Browser cache may retain it for later sessions.
- v6.0 currently offers the four broad Demucs stems only. Lead/backing split, harmony/doubles, male/female split, guitar/piano 6-stem, de-reverb/de-echo and noise reduction are not implemented in this build.
- Mobile processing is resource-intensive. This test build limits a song to 3 minutes and 150 MB; shorter clips are recommended for the first test.
- “Free/unlimited” means there is no paid inference API or usage-credit meter. Actual use is still limited by phone memory, storage, battery, browser and GitHub Pages hosting limits.
