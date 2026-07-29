import { qrcode } from '../vendor/qrcode-generator.mjs';
import { el, clear } from './dom.js';
import { generateRegisterId } from './rocrate.js';
import { pickJsonFile, downloadJson } from './fileIO.js';

// Matches a common sheet of 63.5x33.9mm labels (e.g. Avery 5160/L7160) on A4.
// Anyone with different label stock can upload their own template instead —
// see TEMPLATE_KEYS below for the shape.
const DEFAULT_TEMPLATE = {
  pageWidthMm: 210,
  pageHeightMm: 297,
  columns: 3,
  rows: 8,
  cellWidthMm: 63.5,
  cellHeightMm: 33.9,
  marginTopMm: 12,
  marginLeftMm: 7,
  gapXMm: 3,
  gapYMm: 0,
};

const TEMPLATE_KEYS = Object.keys(DEFAULT_TEMPLATE);

export function buildPrintScreen() {
  let template = { ...DEFAULT_TEMPLATE };
  let codes = [];

  const countInput = el('input', { type: 'number', value: 10, min: 1, max: 500 });
  const templateStatus = el('span', { class: 'hint' }, 'Using default layout (63.5×33.9mm labels, 3×8 per A4 sheet)');
  const previewArea = el('div', { class: 'print-preview' });

  function applyTemplate(data) {
    const next = { ...DEFAULT_TEMPLATE };
    for (const key of TEMPLATE_KEYS) {
      const value = Number(data[key]);
      if (Number.isFinite(value) && value > 0) next[key] = value;
    }
    template = next;
  }

  async function handleUploadTemplate() {
    const data = await pickJsonFile();
    if (!data) return;
    if (typeof data !== 'object') {
      alert('That file does not look like a valid layout template (expected a JSON object).');
      return;
    }
    applyTemplate(data);
    templateStatus.textContent = 'Using uploaded layout';
    if (codes.length) renderPreview();
  }

  function handleDownloadExampleTemplate() {
    downloadJson('print-layout-template.json', DEFAULT_TEMPLATE);
  }

  async function handleGenerate() {
    const count = Math.max(1, Math.min(500, Math.round(Number(countInput.value)) || 1));
    codes = await Promise.all(Array.from({ length: count }, () => generateRegisterId()));
    renderPreview();
  }

  function buildQrCell(id) {
    const qr = qrcode(0, 'M');
    qr.addData(id);
    qr.make();
    const qrWrap = el('div', { class: 'print-cell-qr' });
    qrWrap.innerHTML = qr.createSvgTag({ scalable: true });
    return el('div', { class: 'print-cell' }, [qrWrap, el('div', { class: 'print-cell-label' }, id)]);
  }

  function renderPreview() {
    clear(previewArea);
    if (codes.length === 0) {
      previewArea.appendChild(el('p', { class: 'hint' }, 'Generate codes to preview them here.'));
      return;
    }
    const page = el('div', { class: 'print-page' }, codes.map(buildQrCell));
    // Sized off the smaller cell dimension so the QR always fits within the
    // cell regardless of whether the label is landscape or portrait, leaving
    // room below/beside it for the id label.
    const qrSizeMm = Math.min(template.cellWidthMm, template.cellHeightMm) * 0.65;
    page.style.setProperty('--page-w', `${template.pageWidthMm}mm`);
    page.style.setProperty('--cols', template.columns);
    page.style.setProperty('--cell-w', `${template.cellWidthMm}mm`);
    page.style.setProperty('--cell-h', `${template.cellHeightMm}mm`);
    page.style.setProperty('--qr-size', `${qrSizeMm}mm`);
    page.style.setProperty('--gap-x', `${template.gapXMm}mm`);
    page.style.setProperty('--gap-y', `${template.gapYMm}mm`);
    page.style.setProperty('--margin-top', `${template.marginTopMm}mm`);
    page.style.setProperty('--margin-left', `${template.marginLeftMm}mm`);
    previewArea.appendChild(page);
  }

  renderPreview();

  return el('div', { class: 'print-screen' }, [
    el(
      'p',
      { class: 'hint' },
      'Generate a batch of blank QR codes to print and stick onto objects ahead of time — scanning one later creates its register entry.',
    ),
    el('div', { class: 'print-controls' }, [
      el('label', {}, ['Number of codes', countInput]),
      el('div', { class: 'browse-io' }, [
        el('button', { class: 'primary', onclick: handleGenerate }, 'Generate'),
        el('button', { onclick: () => window.print() }, 'Print'),
      ]),
    ]),
    el('div', { class: 'print-controls' }, [
      templateStatus,
      el('div', { class: 'browse-io' }, [
        el('button', { onclick: handleUploadTemplate }, 'Upload print layout template'),
        el('button', { onclick: handleDownloadExampleTemplate }, 'Download example template'),
      ]),
    ]),
    previewArea,
  ]);
}
