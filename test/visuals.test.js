import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanupVisuals,
  normalizeChartConfig,
  renderVisuals
} from '../core/web/visuals.js';

class FakeElement {
  constructor(tagName = 'div') {
    this.attributes = new Map();
    this.children = [];
    this.className = '';
    this.tagName = tagName;
    this.textContent = '';
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.children = nodes;
  }

  querySelector(selector) {
    if (selector !== '.visual__stage') return null;
    return this.children.find((child) => child.className === 'visual__stage') ?? null;
  }

  querySelectorAll(selector) {
    if (selector === '.visual[data-visual-kind]') {
      return this.children.filter((child) => child.className?.startsWith('visual ') && child.hasAttribute('data-visual-kind'));
    }
    if (selector === '.visual__stage') {
      return this.children.flatMap((child) => child.children ?? []).filter((child) => child.className === 'visual__stage');
    }
    return [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

function createVisual(kind, source, title = kind) {
  const figure = new FakeElement('figure');
  figure.className = `visual visual--${kind}`;
  figure.setAttribute('data-visual-kind', kind);
  figure.setAttribute('data-visual-source', source);
  figure.setAttribute('data-visual-title', title);
  const stage = new FakeElement();
  stage.className = 'visual__stage';
  figure.append(stage);
  return { figure, stage };
}

test('normalizza configurazioni Chart.js JSON e mappa donut a doughnut', () => {
  const { config, title } = normalizeChartConfig(JSON.stringify({
    type: 'donut',
    title: 'Revenue',
    data: { labels: ['Core'], datasets: [{ data: [10] }] }
  }));

  assert.equal(config.type, 'doughnut');
  assert.equal(title, 'Revenue');
  assert.equal(config.options.animation, false);
  assert.equal(config.options.plugins.title.text, 'Revenue');
});

test('rifiuta configurazioni Chart.js non JSON o pericolose', () => {
  assert.throws(() => normalizeChartConfig('{ type: "pie" }'), /valid JSON/);
  assert.throws(() => normalizeChartConfig('{"type":"pie","data":{"datasets":[{"data":[1],"__proto__":{"polluted":true}}]}}'), /disallowed key/);
  assert.throws(() => normalizeChartConfig(JSON.stringify({
    type: 'unknown',
    data: { datasets: [{ data: [1] }] }
  })), /Chart type/);
});

test('renderizza Mermaid e Chart.js con adapter fake e pulisce le chart', async () => {
  const root = new FakeElement();
  const mermaidVisual = createVisual('mermaid', 'flowchart TD\nA-->B', 'Flow');
  const chartVisual = createVisual('chart', JSON.stringify({
    type: 'pie',
    data: { labels: ['A'], datasets: [{ data: [1] }] }
  }), 'Pie');
  root.append(mermaidVisual.figure, chartVisual.figure);

  let initialized = false;
  let destroyed = false;
  const charts = [];
  class FakeChart {
    static BasicPlatform = class {};

    constructor(canvas, config) {
      this.canvas = canvas;
      this.config = config;
      charts.push({ canvas, config });
    }

    update() {
    }

    toBase64Image() {
      return 'data:image/png;base64,pie';
    }

    destroy() {
      destroyed = true;
    }
  }

  await renderVisuals(root, {
    documentObject: { createElement: (tagName) => new FakeElement(tagName) },
    mermaid: {
      initialize() {
        initialized = true;
      },
      async render(id, source) {
        assert.match(id, /^easy-mark-mermaid-/);
        assert.equal(source, 'flowchart TD\nA-->B');
        return { svg: '<svg><text>Flow</text></svg>' };
      }
    },
    Chart: FakeChart
  });

  assert.equal(initialized, true);
  assert.equal(mermaidVisual.stage.children[0].tagName, 'img');
  assert.match(mermaidVisual.stage.children[0].src, /^data:image\/svg\+xml;base64,/);
  assert.equal(charts.length, 1);
  assert.equal(charts[0].config.type, 'pie');
  assert.equal(charts[0].config.platform, FakeChart.BasicPlatform);
  assert.equal(charts[0].config.options.responsive, false);
  assert.equal(charts[0].config.options.maintainAspectRatio, false);
  assert.equal(charts[0].canvas.getAttribute('width'), '832');
  assert.equal(charts[0].canvas.getAttribute('height'), '288');
  assert.equal(chartVisual.stage.children[0].tagName, 'img');
  assert.equal(chartVisual.stage.children[0].src, 'data:image/png;base64,pie');

  cleanupVisuals(root);
  assert.equal(destroyed, true);
});

test('converte Chart.js in immagine stabile durante il rendering per stampa', async () => {
  const root = new FakeElement();
  const chartVisual = createVisual('chart', JSON.stringify({
    type: 'bar',
    data: { labels: ['A'], datasets: [{ data: [1] }] }
  }), 'Print chart');
  root.append(chartVisual.figure);

  const calls = [];
  class FakeChart {
    static BasicPlatform = class {};

    constructor(canvas, config) {
      this.canvas = canvas;
      this.config = config;
      calls.push(['create', config.options.devicePixelRatio, config.options.responsive, config.platform === FakeChart.BasicPlatform]);
    }

    update(mode) {
      calls.push(['update', mode]);
    }

    toBase64Image() {
      calls.push(['image']);
      return 'data:image/png;base64,chart';
    }

    destroy() {
      calls.push(['destroy']);
    }
  }

  await renderVisuals(root, {
    documentObject: {
      defaultView: { requestAnimationFrame: (callback) => callback() },
      createElement: (tagName) => new FakeElement(tagName)
    },
    Chart: FakeChart,
    print: true
  });

  assert.deepEqual(calls, [['create', 2, false, true], ['update', 'none'], ['image'], ['destroy']]);
  assert.equal(chartVisual.stage.children[0].tagName, 'img');
  assert.equal(chartVisual.stage.children[0].className, 'visual__image');
  assert.equal(chartVisual.stage.children[0].alt, 'Print chart');
  assert.equal(chartVisual.stage.children[0].src, 'data:image/png;base64,chart');
});
