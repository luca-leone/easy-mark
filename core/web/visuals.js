const chartInstance = Symbol('easyMarkChart');
const allowedChartTypes = new Set([
  'bar',
  'bubble',
  'doughnut',
  'line',
  'pie',
  'polarArea',
  'radar',
  'scatter'
]);
const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
let mermaidInitialized = false;
let visualId = 0;

function assertPlainObject(value, message) {
  if (!value || Object.prototype.toString.call(value) !== '[object Object]') {
    throw new Error(message);
  }
}

function cloneSafeJson(value, depth = 0) {
  if (depth > 12) throw new Error('Chart configuration is too deeply nested.');
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map((item) => cloneSafeJson(item, depth + 1));
  assertPlainObject(value, 'Chart configuration must contain only JSON objects, arrays, and primitive values.');
  const clone = {};
  for (const [key, child] of Object.entries(value)) {
    if (dangerousKeys.has(key)) throw new Error(`Chart configuration contains a disallowed key: ${key}.`);
    clone[key] = cloneSafeJson(child, depth + 1);
  }
  return clone;
}

export function normalizeChartConfig(source, { print = false } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('Chart configuration must be valid JSON.');
  }

  const config = cloneSafeJson(parsed);
  assertPlainObject(config, 'Chart configuration must be a JSON object.');

  const type = config.type === 'donut' ? 'doughnut' : config.type;
  if (typeof type !== 'string' || !allowedChartTypes.has(type)) {
    throw new Error('Chart type must be one of: bar, line, pie, doughnut, donut, polarArea, radar, bubble, scatter.');
  }
  assertPlainObject(config.data, 'Chart configuration must include a data object.');
  if (!Array.isArray(config.data.datasets) || config.data.datasets.length === 0) {
    throw new Error('Chart data must include at least one dataset.');
  }

  const title = typeof config.title === 'string' ? config.title.trim() : '';
  delete config.title;
  config.type = type;
  config.options = {
    ...(config.options ?? {}),
    responsive: true,
    maintainAspectRatio: false,
    animation: false
  };
  if (print) config.options.devicePixelRatio = 2;
  if (title) {
    config.options.plugins = {
      ...(config.options.plugins ?? {}),
      title: {
        ...(config.options.plugins?.title ?? {}),
        display: true,
        text: title
      }
    };
  }
  return { config, title: title || 'Chart' };
}

function svgDataUrl(svg) {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function showVisualError(stage, message, documentObject) {
  const error = documentObject.createElement('p');
  error.className = 'visual__error';
  error.textContent = message;
  stage.replaceChildren(error);
}

function waitForVisualFrame(documentObject) {
  const frame = documentObject.defaultView?.requestAnimationFrame ?? globalThis.requestAnimationFrame;
  if (!frame) return Promise.resolve();
  return new Promise((resolve) => frame(resolve));
}

function chartRenderSize(stage, { print }) {
  const bounds = stage.getBoundingClientRect?.();
  return {
    width: Math.max(1, Math.round(bounds?.width || stage.clientWidth || (print ? 768 : 832))),
    height: Math.max(1, Math.round(bounds?.height || stage.clientHeight || (print ? 224 : 288)))
  };
}

function createChartCanvas(documentObject, size) {
  const OffscreenCanvasConstructor = documentObject.defaultView?.OffscreenCanvas ?? globalThis.OffscreenCanvas;
  if (OffscreenCanvasConstructor) return new OffscreenCanvasConstructor(size.width, size.height);
  const canvas = documentObject.createElement('canvas');
  canvas.setAttribute('width', String(size.width));
  canvas.setAttribute('height', String(size.height));
  return canvas;
}

async function blobToDataUrl(blob, documentObject) {
  const FileReaderConstructor = documentObject.defaultView?.FileReader ?? globalThis.FileReader;
  if (!FileReaderConstructor) throw new Error('Chart image export is unavailable.');
  return await new Promise((resolve, reject) => {
    const reader = new FileReaderConstructor();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function chartImageSource(chart, canvas, documentObject) {
  try {
    const source = chart.toBase64Image?.();
    if (typeof source === 'string' && source.startsWith('data:image/')) return source;
  } catch {
    // OffscreenCanvas has no toDataURL API, so use convertToBlob below.
  }
  if (typeof canvas.toDataURL === 'function') return canvas.toDataURL('image/png');
  if (typeof canvas.convertToBlob === 'function') {
    return blobToDataUrl(await canvas.convertToBlob({ type: 'image/png' }), documentObject);
  }
  throw new Error('Chart image export is unavailable.');
}

function initializeMermaid(mermaid) {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false
  });
  mermaidInitialized = true;
}

async function renderMermaid(figure, stage, source, { mermaid, documentObject }) {
  if (!mermaid?.render) throw new Error('Mermaid runtime is unavailable.');
  initializeMermaid(mermaid);
  const renderId = `easy-mark-mermaid-${visualId += 1}`;
  const { svg } = await mermaid.render(renderId, source);
  const image = documentObject.createElement('img');
  image.className = 'visual__image';
  image.alt = figure.getAttribute('data-visual-title') || 'Mermaid diagram';
  image.decoding = 'async';
  image.src = svgDataUrl(svg);
  stage.replaceChildren(image);
}

async function renderChart(figure, stage, source, { Chart, documentObject, print }) {
  if (!Chart) throw new Error('Chart.js runtime is unavailable.');
  const { config, title } = normalizeChartConfig(source, { print });
  const label = figure.getAttribute('data-visual-title') || title;
  const canvas = createChartCanvas(documentObject, chartRenderSize(stage, { print }));
  config.platform = Chart.BasicPlatform ?? Chart.platforms?.BasicPlatform ?? config.platform;
  config.options = {
    ...config.options,
    responsive: false,
    maintainAspectRatio: false
  };
  const chart = new Chart(canvas, config);
  chart.update?.('none');
  await waitForVisualFrame(documentObject);
  const image = documentObject.createElement('img');
  image.className = 'visual__image';
  image.alt = label;
  image.decoding = 'async';
  image.src = await chartImageSource(chart, canvas, documentObject);
  chart.destroy?.();
  stage.replaceChildren(image);
}

export function cleanupVisuals(root) {
  root.querySelectorAll?.('.visual__stage').forEach((stage) => {
    if (stage[chartInstance]?.destroy) stage[chartInstance].destroy();
    delete stage[chartInstance];
    stage.removeAttribute?.('data-visual-rendered');
  });
}

export async function renderVisuals(root, {
  mermaid = globalThis.mermaid,
  Chart = globalThis.Chart,
  documentObject = document,
  print = false
} = {}) {
  const figures = [...(root.querySelectorAll?.('.visual[data-visual-kind]') ?? [])];
  await Promise.all(figures.map(async (figure) => {
    const stage = figure.querySelector('.visual__stage');
    if (!stage || stage.getAttribute('data-visual-rendered') === 'true') return;
    const source = figure.getAttribute('data-visual-source') ?? '';
    const kind = figure.getAttribute('data-visual-kind');
    try {
      if (kind === 'mermaid') await renderMermaid(figure, stage, source, { mermaid, documentObject });
      else if (kind === 'chart') await renderChart(figure, stage, source, { Chart, documentObject, print });
      stage.setAttribute('data-visual-rendered', 'true');
    } catch (error) {
      showVisualError(stage, error instanceof Error ? error.message : 'Unable to render visual.', documentObject);
    }
  }));
}
