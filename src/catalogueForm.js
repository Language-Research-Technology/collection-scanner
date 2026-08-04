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

function field(label, value) {
  return el('label', {}, [label, el('div', { class: 'field-value' }, value || '—')]);
}

function buildViewRegisterSection(onViewRegisterEntry) {
  if (!onViewRegisterEntry) return null;
  return el('div', { class: 'form-actions' }, [
    el('button', { type: 'button', class: 'accent', onclick: onViewRegisterEntry }, 'View register entry'),
  ]);
}

export function buildCatalogueDetail({ item, onEdit, onCancel, onDelete, onViewRegisterEntry }) {
  const actions = [el('button', { class: 'primary', onclick: onEdit }, 'Edit'), el('button', { onclick: onCancel }, 'Back')];
  if (onDelete) {
    actions.push(el('button', { type: 'button', class: 'danger', onclick: onDelete }, 'Delete'));
  }

  return el('div', { class: 'item-form' }, [
    el('div', { class: 'form-toolbar' }, actions),
    el('div', { class: 'form-fields' }, [
      el('h2', {}, 'Catalogue entry'),
      field('@id', item['@id']),
      field('Linked register id', item['custom:registerId']),
      field('@type', typeToString(item['@type']) || 'Thing'),
      field('Name', item.name),
      field('Description', item.description),
      field('Date published', item.datePublished),
      buildViewRegisterSection(onViewRegisterEntry),
    ]),
  ]);
}

export function buildCatalogueForm({ initial, onSave, onDelete, onCancel }) {
  const idInput = el('div', { class: 'field-value' }, initial['@id']);
  const registerIdInput = el('div', { class: 'field-value' }, initial['custom:registerId'] ?? '');
  const typeInput = el('input', {
    value: typeToString(initial['@type']) || 'Thing',
    placeholder: 'e.g. Photograph',
  });
  const nameInput = el('input', { value: initial.name ?? '', required: true, autofocus: true });
  const descriptionInput = el('textarea', { value: initial.description ?? '', rows: 3 });
  const dateInput = el('input', { type: 'date', value: initial.datePublished ?? '' });

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
      ]),
    ],
  );
}
