import JSZip from 'jszip';

const $ = id => document.getElementById(id);
const picker = $('audioFile');
const run = $('run');
const status = $('status');
const statusText = $('statusText');
const progress = $('progress');
const results = $('results');
const zipBtn = $('zip');
let file = null;
let worker = null;
let stemsForZip = [];
let previewUrl = null;
let busy = false;

function say(message, percent = null) {
  status.style.display = 'block';
  statusText.textContent = message;
  if (percent !== null) progress.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}
function setBusy(value) {
  busy = value;
  run.disabled = value || !file;
  run.textContent = value ? 'Processing… keep this tab open' : (file ? 'Separate with AI' : 'Choose an audio file first');
}
function getWorker() {
  if (!worker) {
    worker = new Worker('./worker.js');
    worker.onerror = event => {
      say(`AI worker could not start: ${event.message || 'unknown worker error'}`);
      setBusy(false);
      worker?.terminate(); worker = null;
    };
    worker.onmessage = handleWorkerMessage;
  }
  return worker;
}
function renderStems(tracks) {
  results.innerHTML = '';
  stemsForZip = [];
  const selected = new Set([...document.querySelectorAll('input[name="stem"]:checked')].map(input => input.value));
  for (const name of ['vocals', 'drums', 'bass', 'other']) {
    if (!selected.has(name) || !tracks[name]) continue;
    const blob = new Blob([tracks[name]], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    stemsForZip.push({ name, blob });
    const card = document.createElement('div'); card.className = 'output';
    const title = document.createElement('strong'); title.textContent = name[0].toUpperCase() + name.slice(1);
    const player = document.createElement('audio'); player.controls = true; player.src = url;
    const link = document.createElement('a'); link.href = url; link.download = `${file.name.replace(/\.[^.]+$/, '')}_${name}.wav`; link.textContent = 'Download WAV';
    card.append(title, player, link); results.append(card);
  }
  zipBtn.hidden = stemsForZip.length === 0;
}
function handleWorkerMessage(event) {
  const message = event.data;
  if (message.type === 'status') say(message.text);
  if (message.type === 'progress') {
    const percent = message.total ? (message.step / message.total) * 100 : 0;
    say(`Separating audio… segment ${message.step} of ${message.total}`, percent);
  }
  if (message.type === 'done') {
    renderStems(message.tracks);
    say('Finished! Preview or download your separated stems.', 100);
    setBusy(false);
  }
  if (message.type === 'error') {
    console.error('Separation error:', message.message, message.stack);
    say(`Separation failed: ${message.message}`);
    setBusy(false);
  }
}

picker.addEventListener('change', () => {
  file = picker.files?.[0] || null;
  if (!file) return;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  $('preview').src = previewUrl;
  $('preview').hidden = false;
  $('fileLine').style.display = 'block';
  $('fileLine').textContent = `${file.name} · ${(file.size / 1048576).toFixed(1)} MB`;
  results.innerHTML = ''; zipBtn.hidden = true; stemsForZip = [];
  setBusy(false);
});

run.addEventListener('click', async () => {
  if (!file || busy) return;
  if (file.size > 150 * 1024 * 1024) {
    say('This file is over 150 MB. Try a smaller audio file for this mobile test.'); return;
  }
  setBusy(true); results.innerHTML = ''; zipBtn.hidden = true; stemsForZip = [];
  let context;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('This browser does not support Web Audio.');
    context = new AudioContextClass({ sampleRate: 44100 });
    if (context.state === 'suspended') await context.resume();
    say('Reading and decoding your audio…');
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    if (decoded.duration > 180) throw new Error('This mobile test is limited to 3 minutes per song. Try a shorter section first.');
    let audioBuffer = decoded;
    if (decoded.sampleRate !== 44100) {
      say('Converting audio to the model sample rate (44.1 kHz)…');
      const frames = Math.ceil(decoded.duration * 44100);
      const offline = new OfflineAudioContext(2, frames, 44100);
      const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
      audioBuffer = await offline.startRendering();
    }
    const left = new Float32Array(audioBuffer.getChannelData(0));
    const right = audioBuffer.numberOfChannels > 1 ? new Float32Array(audioBuffer.getChannelData(1)) : new Float32Array(left);
    say('Sending audio to the local AI worker…');
    getWorker().postMessage({ type: 'separate', rawAudio: { channelData: [left, right], sampleRate: 44100 } }, [left.buffer, right.buffer]);
  } catch (error) {
    console.error(error); say(`Could not prepare audio: ${error?.message || String(error)}`); setBusy(false);
  } finally {
    if (context) await context.close().catch(() => {});
  }
});

zipBtn.addEventListener('click', async () => {
  if (!stemsForZip.length) return;
  zipBtn.disabled = true; zipBtn.textContent = 'Preparing ZIP…';
  try {
    const zip = new JSZip();
    const base = file.name.replace(/\.[^.]+$/, '');
    for (const stem of stemsForZip) zip.file(`${base}_${stem.name}.wav`, stem.blob);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${base}_stems.zip`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) { say(`ZIP export failed: ${error.message}`); }
  finally { zipBtn.disabled = false; zipBtn.textContent = 'Download all stems (ZIP)'; }
});
