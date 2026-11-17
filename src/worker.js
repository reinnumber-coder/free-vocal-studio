import { ONNXHTDemucs } from 'demucs/dist/onnx-htdemucs.js';
import { separateTracks } from 'demucs/dist/apply.js';
import { samplesToWav } from 'demucs/dist/wav-utils.js';
import * as ort from 'onnxruntime-web';

// Keep the initial mobile build conservative: one WASM thread, local runtime assets.
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = new URL('./', self.location.href).href;
ort.env.logLevel = 'warning';

let modelPromise = null;
function sendStatus(text) { self.postMessage({ type: 'status', text }); }

async function getModel() {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    sendStatus('Downloading the HTDemucs AI model (about 170 MB). First use may take a while…');
    const modelUrl = new URL('./htdemucs.onnx', self.location.href).href;
    const cache = await caches.open('free-vocal-studio-model-v6');
    let response = await cache.match(modelUrl);
    if (response) {
      const cached = await response.clone().arrayBuffer();
      if (cached.byteLength < 100 * 1024 * 1024) {
        await cache.delete(modelUrl);
        response = null;
      }
    }
    if (!response) {
      const downloaded = await fetch(modelUrl);
      if (!downloaded.ok) throw new Error(`AI model download failed (HTTP ${downloaded.status}).`);
      const copy = downloaded.clone();
      const bytes = await copy.arrayBuffer();
      if (bytes.byteLength < 100 * 1024 * 1024) throw new Error(`AI model file is incomplete (${(bytes.byteLength / 1048576).toFixed(1)} MB). Check that the GitHub Actions build deployed the model.`);
      response = new Response(bytes, { headers: downloaded.headers });
      await cache.put(modelUrl, response.clone());
    }
    sendStatus('Loading AI model into the browser…');
    const weights = await response.arrayBuffer();
    sendStatus(`Initializing AI model (${(weights.byteLength / 1048576).toFixed(0)} MB)…`);
    return await ONNXHTDemucs.init(weights);
  })().catch(error => { modelPromise = null; throw error; });
  return modelPromise;
}

self.onmessage = async event => {
  if (event.data?.type !== 'separate') return;
  try {
    const rawAudio = event.data.rawAudio;
    if (!rawAudio?.channelData || rawAudio.channelData.length < 2) throw new Error('The audio could not be prepared as stereo.');
    if (rawAudio.sampleRate !== 44100) throw new Error(`Audio must be 44.1 kHz after decoding (received ${rawAudio.sampleRate} Hz).`);
    sendStatus('Preparing the AI model…');
    const model = await getModel();
    sendStatus('Separating vocals, drums, bass and other instruments…');
    const tracks = await separateTracks(model, rawAudio, (step, total) => {
      self.postMessage({ type: 'progress', step, total });
    });
    const results = {};
    for (const [name, audio] of Object.entries(tracks)) {
      const wav = samplesToWav(audio.channelData, audio.sampleRate);
      results[name] = wav.buffer;
    }
    self.postMessage({ type: 'done', tracks: results }, Object.values(results));
  } catch (error) {
    console.error('[Free Vocal Studio worker]', error);
    self.postMessage({ type: 'error', message: error?.message || String(error), stack: error?.stack || '' });
  }
};
