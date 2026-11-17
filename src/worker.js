
import { ONNXHTDemucs } from 'demucs/dist/onnx-htdemucs.js';
import { separateTracks } from 'demucs/dist/apply.js';
import { samplesToWav } from 'demucs/dist/wav-utils.js';
import * as ort from 'onnxruntime-web';

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = new URL('./', self.location.href).href;
ort.env.logLevel = 'warning';

let modelPromise = null;
let model = null;
let busy = false;

function sendStatus(text) {
  self.postMessage({ type: 'status', text });
}

async function initializeModel() {
  if (model) return model;
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    sendStatus('Downloading HTDemucs AI model (about 170 MB)…');

    const modelUrl = new URL('./htdemucs.onnx', self.location.href);
    const response = await fetch(modelUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Model download failed (HTTP ${response.status}).`);
    }

    let weights = await response.arrayBuffer();

    if (weights.byteLength < 100 * 1024 * 1024) {
      throw new Error(
        `Model file is incomplete (${(weights.byteLength / 1048576).toFixed(1)} MB).`
      );
    }

    sendStatus('Initializing AI model. Please wait…');

    const loadedModel = await ONNXHTDemucs.init(weights);

    // Release our reference to the downloaded model bytes.
    weights = null;

    model = loadedModel;
    sendStatus('AI model is ready.');

    return model;
  })().catch(error => {
    modelPromise = null;
    model = null;
    throw error;
  });

  return modelPromise;
}

async function separate(rawAudio) {
  if (!model) throw new Error('AI model is not initialized.');

  if (!rawAudio?.channelData || rawAudio.channelData.length < 2) {
    throw new Error('Audio could not be prepared as stereo.');
  }

  if (rawAudio.sampleRate !== 44100) {
    throw new Error(`Audio must be 44.1 kHz (received ${rawAudio.sampleRate} Hz).`);
  }

  sendStatus('Separating vocals, drums, bass and other instruments…');

  const tracks = await separateTracks(
    model,
    rawAudio,
    (step, total) => {
      self.postMessage({ type: 'progress', step, total });
    }
  );

  const results = {};

  for (const [name, audio] of Object.entries(tracks)) {
    const wav = samplesToWav(audio.channelData, audio.sampleRate);
    results[name] = wav.buffer;
  }

  self.postMessage(
    { type: 'done', tracks: results },
    Object.values(results)
  );
}

self.onmessage = async event => {
  if (busy) return;

  const message = event.data;
  if (!message) return;

  if (message.type === 'init') {
    busy = true;

    try {
      await initializeModel();
      self.postMessage({ type: 'ready' });
    } catch (error) {
      console.error('[Free Vocal Studio model]', error);
      self.postMessage({
        type: 'error',
        message: error?.message || String(error),
        stack: error?.stack || ''
      });
    } finally {
      busy = false;
    }

    return;
  }

  if (message.type === 'separate') {
    busy = true;

    try {
      await separate(message.rawAudio);
    } catch (error) {
      console.error('[Free Vocal Studio separation]', error);
      self.postMessage({
        type: 'error',
        message: error?.message || String(error),
        stack: error?.stack || ''
      });
    } finally {
      busy = false;
    }
  }
};
