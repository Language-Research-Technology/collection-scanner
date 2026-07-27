import { el } from './dom.js';

function typeToString(type) {
  if (!type) return '';
  return Array.isArray(type) ? type.join(', ') : type;
}

function stringToType(value) {
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : parts[0] ?? 'Thing';
}

export function buildCatalogueForm({ initial, onSave, onDelete, onCancel }) {
  const idInput = el('input', { value: initial['@id'], readonly: true });
  const registerIdInput = el('input', { value: initial['custom:registerId'] ?? '', readonly: true });
  const typeInput = el('input', {
    value: typeToString(initial['@type']) || 'Thing',
    placeholder: 'e.g. Photograph',
  });
  const nameInput = el('input', { value: initial.name ?? '', required: true, autofocus: true });
  const descriptionInput = el('textarea', { value: initial.description ?? '', rows: 3 });
  const dateInput = el('input', { type: 'date', value: initial.datePublished ?? '' });
  const rowInput = el('input', { type: 'number', value: initial['custom:row'] ?? '' });
  const bayInput = el('input', { type: 'number', value: initial['custom:bay'] ?? '' });
  const shelfInput = el('input', { type: 'number', value: initial['custom:shelf'] ?? '' });
  const boxInput = el('input', { type: 'number', value: initial['custom:box'] ?? '' });

  function setNumberField(item, key, input) {
    const value = input.value.trim();
    if (value) item[key] = Number(value);
    else delete item[key];
  }

  function handleSubmit(e) {
    e.preventDefault();
    const item = {
      ...initial,
      '@id': initial['@id'],
      '@type': stringToType(typeInput.value),
      name: nameInput.value.trim(),
    };
    const description = descriptionInput.value.trim();
    if (description) item.description = description;
    else delete item.description;
    const datePublished = dateInput.value.trim();
    if (datePublished) item.datePublished = datePublished;
    else delete item.datePublished;
    setNumberField(item, 'custom:row', rowInput);
    setNumberField(item, 'custom:bay', bayInput);
    setNumberField(item, 'custom:shelf', shelfInput);
    setNumberField(item, 'custom:box', boxInput);
    onSave(item);
  }

  const actions = [
    el('button', { type: 'submit', class: 'primary' }, 'Save'),
    el('button', { type: 'button', onclick: onCancel }, 'Cancel'),
  ];
  if (onDelete) {
    actions.push(el('button', { type: 'button', class: 'danger', onclick: onDelete }, 'Delete'));
  }

  return el(
    'form',
    { class: 'item-form', onsubmit: handleSubmit },
    [
      el('div', { class: 'form-toolbar' }, actions),
      el('div', { class: 'form-fields' }, [
        el('h2', {}, 'Catalogue entry'),
        el('label', {}, ['@id', idInput]),
        el('label', {}, ['Linked register id', registerIdInput]),
        el('label', {}, ['@type', typeInput]),
        el('label', {}, ['Name', nameInput]),
        el('label', {}, ['Description', descriptionInput]),
        el('label', {}, ['Date published', dateInput]),
        el('div', { class: 'form-row' }, [
          el('label', {}, ['Row', rowInput]),
          el('label', {}, ['Bay', bayInput]),
          el('label', {}, ['Shelf', shelfInput]),
          el('label', {}, ['Box', boxInput]),
        ]),
      ]),
    ],
  );
}
