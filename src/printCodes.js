import { qrcode } from '../vendor/qrcode-generator.mjs';
import { el, clear } from './dom.js';
import { generateRegisterId } from './rocrate.js';
import { pickJsonFile, downloadJson } from './fileIO.js';

const PAGE_WIDTH_MM = 210; // A4
const PAGE_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 10;

// "N per page" options map to a grid that evenly fills an A4 page. Anyone
// with real label stock (specific cell sizes/margins) can upload an exact
// template instead — see TEMPLATE_KEYS below for the shape.
const LAYOUT_PRESETS = [
  { count: 6, columns: 2, rows: 3 },
  { count: 12, columns: 3, rows: 4 },
  { count: 24, columns: 4, rows: 6 },
  { count: 30, columns: 3, rows: 10 },
];

const TEMPLATE_KEYS = [
  'pageWidthMm',
  'pageHeightMm',
  'columns',
  'rows',
  'cellWidthMm',
  'cellHeightMm',
  'marginTopMm',
  'marginLeftMm',
  'gapXMm',
  'gapYMm',
];

function presetToTemplate({ columns, rows }) {
  const printableWidth = PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2;
  const printableHeight = PAGE_HEIGHT_MM - PAGE_MARGIN_MM * 2;
  return {
    pageWidthMm: PAGE_WIDTH_MM,
    pageHeightMm: PAGE_HEIGHT_MM,
    columns,
    rows,
    cellWidthMm: printableWidth / columns,
    cellHeightMm: printableHeight / rows,
    marginTopMm: PAGE_MARGIN_MM,
    marginLeftMm: PAGE_MARGIN_MM,
    gapXMm: 0,
    gapYMm: 0,
  };
}

export function buildPrintScreen() {
  let template = presetToTemplate(LAYOUT_PRESETS[1]); // 12 per page
  let codes = [];

  const countInput = el('input', { type: 'number', value: 12, min: 1, max: 500 });
  const layoutStatus = el('span', { class: 'hint' });
  const previewArea = el('div', { class: 'print-preview' });
  const presetButtons = new Map();

  function applyPreset(preset) {
    template = presetToTemplate(preset);
    layoutStatus.textContent = `${preset.count} per A4 page (${preset.columns}×${preset.rows})`;
    for (const [count, button] of presetButtons) {
      button.classList.toggle('active', count === preset.count);
    }
    if (codes.length) renderPreview();
  }

  function applyCustomTemplate(data) {
    const next = presetToTemplate(LAYOUT_PRESETS[1]);
    for (const key of TEMPLATE_KEYS) {
      const value = Number(data[key]);
      if (Number.isFinite(value) && value > 0) next[key] = value;
    }
    template = next;
    layoutStatus.textContent = 'Using uploaded layout';
    for (const button of presetButtons.values()) button.classList.remove('active');
    if (codes.length) renderPreview();
  }

  async function handleUploadTemplate() {
    const data = await pickJsonFile();
    if (!data) return;
    if (typeof data !== 'object') {
      alert('That file does not look like a valid layout template (expected a JSON object).');
      return;
    }
    applyCustomTemplate(data);
  }

  function handleDownloadExampleTemplate() {
    downloadJson('print-layout-template.json', presetToTemplate(LAYOUT_PRESETS[1]));
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

  for (const preset of LAYOUT_PRESETS) {
    const button = el('button', { onclick: () => applyPreset(preset) }, `${preset.count} per page`);
    presetButtons.set(preset.count, button);
  }
  applyPreset(LAYOUT_PRESETS[1]);

  renderPreview();

  return el('div', { class: 'print-screen' }, [
    el(
      'p',
      { class: 'hint' },
      'Generate a batch of blank QR codes to print and stick onto objects ahead of time — scanning one later creates its register entry.',
    ),
    el('div', { class: 'print-controls' }, [
      el('label', { class: 'print-count-label' }, ['Number of codes', countInput]),
      el('div', { class: 'browse-io' }, [el('button', { class: 'primary', onclick: handleGenerate }, 'Generate')]),
    ]),
    el('div', { class: 'print-controls' }, [
      el('div', { class: 'browse-io' }, [...presetButtons.values()]),
      el('div', { class: 'browse-io' }, [
        el('button', { onclick: handleUploadTemplate }, 'Upload custom layout template'),
        el('button', { onclick: handleDownloadExampleTemplate }, 'Download example template'),
      ]),
      layoutStatus,
    ]),
    el('div', { class: 'browse-io' }, [el('button', { class: 'primary', onclick: () => window.print() }, 'Print')]),
    previewArea,
  ]);
}
