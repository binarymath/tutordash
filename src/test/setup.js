// src/test/setup.js — Configuração global dos testes Vitest
import '@testing-library/jest-dom';

// ── Canvas mock (jsdom não suporta canvas nativo) ──────────────────────────
HTMLCanvasElement.prototype.getContext = () => ({
  fillStyle: '',
  fillRect: () => {},
  drawImage: () => {},
});
HTMLCanvasElement.prototype.toBlob = (callback) => {
  callback(new Blob(['fakepng'], { type: 'image/png' }));
};

// ── Image mock (jsdom não carrega imagens reais) ──────────────────────────
class MockImage {
  constructor() {
    this._src = '';
    this._onload = null;
  }
  set onload(fn) { this._onload = fn; }
  get onload() { return this._onload; }
  set onerror(fn) {}
  set src(v) {
    this._src = v;
    // Dispara onload de forma síncrona
    if (this._onload) setTimeout(() => this._onload(), 0);
  }
  get src() { return this._src; }
  get width() { return 100; }
  get height() { return 100; }
}
global.Image = MockImage;

// ── window.prompt mock (ConfigModal usa prompt para criar perfis) ──────────
global.prompt = () => null;
