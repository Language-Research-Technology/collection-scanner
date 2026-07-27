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
  const authorInput = el('input', { value: initial.author ?? '' });

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
    const author = authorInput.value.trim();
    if (author) item.author = author;
    else delete item.author;
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
      el('h2', {}, 'Catalogue entry'),
      el('label', {}, ['@id', idInput]),
      el('label', {}, ['Linked register id', registerIdInput]),
      el('label', {}, ['@type', typeInput]),
      el('label', {}, ['Name', nameInput]),
      el('label', {}, ['Description', descriptionInput]),
      el('label', {}, ['Date published', dateInput]),
      el('label', {}, ['Author', authorInput]),
      el('div', { class: 'form-actions' }, actions),
    ],
  );
}
