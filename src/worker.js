
import { ONNXHTDemucs } from 'demucs/dist/onnx-htdemucs.js';
import { separateTracks } from 'demucs/dist/apply.js';
import { samplesToWav } from 'demucs/dist/wav-utils.js';
import * as ort from 'onnxruntime-web';

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = new URL('./', self.location.href).href;
ort.env.logLevel = 'warning';

let modelPromise = null;

function sendStatus(text) {
  self.postMessage({ type: 'status', text });
}

async function getModel() {
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    const modelUrl = new URL('./htdemucs.onnx', self.location.href).href;
    let weights = null;

    sendStatus('Checking for a previously downloaded AI model…');

    // Try browser cache, but never let cache errors stop processing.
    try {
      if ('caches' in self) {
        const cache = await caches.open('free-vocal-studio-model-v6');
        const cached = await cache.match(modelUrl);

        if (cached) {
          const cachedBytes = await cached.arrayBuffer();

          if (cachedBytes.byteLength >= 100 * 1024 * 1024) {
            weights = cachedBytes;
            sendStatus('Using the saved AI model…');
          } else {
            try {
              await cache.delete(modelUrl);
            } catch (_) {}
          }
        }
      }
    } catch (error) {
      console.warn('Model cache unavailable; downloading directly.', error);
    }

    // Download directly if no valid cached model exists.
    if (!weights) {
      sendStatus('Downloading HTDemucs AI model (about 170 MB)…');

      const response = await fetch(modelUrl, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(
          `AI model download failed (HTTP ${response.status}).`
        );
      }

      weights = await response.arrayBuffer();

      if (weights.byteLength < 100 * 1024 * 1024) {
        throw new Error(
          `AI model is incomplete (${(weights.byteLength / 1048576).toFixed(1)} MB).`
        );
      }

      // Save a copy only if browser storage allows it.
      try {
        if ('caches' in self) {
          const cache = await caches.open('free-vocal-studio-model-v6');

          await cache.put(
            modelUrl,
            new Response(weights.slice(0), {
              headers: {
                'Content-Type': 'application/octet-stream'
              }
            })
          );

          sendStatus('AI model downloaded and saved.');
        }
      } catch (error) {
        console.warn(
          'Could not save model in browser cache. Continuing without cache.',
          error
        );
      }
    }

    sendStatus('Loading AI model into browser memory…');

    return await ONNXHTDemucs.init(weights);
  })().catch(error => {
    modelPromise = null;
    throw error;
  });

  return modelPromise;
}

self.onmessage = async event => {
  if (event.data?.type !== 'separate') return;

  try {
    const rawAudio = event.data.rawAudio;

    if (!rawAudio?.channelData || rawAudio.channelData.length < 2) {
      throw new Error('Audio could not be prepared as stereo.');
    }

    if (rawAudio.sampleRate !== 44100) {
      throw new Error(
        `Audio must be 44.1 kHz (received ${rawAudio.sampleRate} Hz).`
      );
    }

    sendStatus('Preparing the AI model…');

    const model = await getModel();

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

  } catch (error) {
    console.error('[Free Vocal Studio worker]', error);

    self.postMessage({
      type: 'error',
      message: error?.message || String(error),
      stack: error?.stack || ''
    });
  }
};
