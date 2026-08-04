import { el } from './dom.js';
import { toEntityId } from './rocrate.js';

const LOCATION_FIELD_MAX = 50;

// A <select> is a native scrolling list of options — on iOS it's a spinning
// wheel picker — so it covers "scrolling list of numbers" with no extra UI
// library needed. Pre-selecting a value has to go through the `selected`
// attribute on the matching <option>, since setting `value` on the <select>
// element itself (the generic path `el()` would otherwise take) doesn't
// select anything.
function buildNumberSelect(current) {
  const options = [el('option', { value: '', selected: current == null }, '—')];
  for (let n = 1; n <= LOCATION_FIELD_MAX; n++) {
    options.push(el('option', { value: n, selected: current === n }, String(n)));
  }
  return el('select', {}, options);
}

function field(label, value) {
  return el('label', {}, [label, el('div', { class: 'field-value' }, value ?? '—')]);
}

function buildPromoteSection({ onCreateCatalogueEntry, catalogueEntryExists, onViewCatalogueEntry }) {
  if (!onCreateCatalogueEntry) return null;
  return el('div', { class: 'form-actions' }, [
    catalogueEntryExists
      ? [
          el(
            'p',
            { class: 'hint' },
            'A catalogue entry already exists for this object. Delete that entry first if you need to remove this register record too.',
          ),
          onViewCatalogueEntry &&
            el('button', { type: 'button', class: 'accent', onclick: onViewCatalogueEntry }, 'View catalogue entry'),
        ]
      : el('button', { type: 'button', class: 'accent', onclick: onCreateCatalogueEntry }, 'Create catalogue entry'),
  ]);
}

export function buildRegisterDetail({
  item,
  onEdit,
  onCancel,
  onDelete,
  onCreateCatalogueEntry,
  catalogueEntryExists,
  onViewCatalogueEntry,
}) {
  const actions = [el('button', { class: 'primary', onclick: onEdit }, 'Edit'), el('button', { onclick: onCancel }, 'Back')];
  if (onDelete && !catalogueEntryExists) {
    actions.push(el('button', { type: 'button', class: 'danger', onclick: onDelete }, 'Delete'));
  }

  return el('div', { class: 'item-form' }, [
    el('div', { class: 'form-toolbar' }, actions),
    el('div', { class: 'form-fields' }, [
      el('h2', {}, 'Register entry'),
      field('@id', item['@id']),
      field('Name', item.name),
      field('Format', item['dc:format']),
      el('div', { class: 'form-row' }, [
        field('Row', item['custom:row']),
        field('Bay', item['custom:bay']),
        field('Shelf', item['custom:shelf']),
        field('Box', item['custom:box']),
      ]),
      buildPromoteSection({ onCreateCatalogueEntry, catalogueEntryExists, onViewCatalogueEntry }),
    ]),
  ]);
}

export function buildRegisterForm({
  initial,
  isNew,
  onSave,
  onDelete,
  onCancel,
  onCreateCatalogueEntry,
  catalogueEntryExists,
  onViewCatalogueEntry,
}) {
  const idInput = isNew
    ? el('input', { value: initial['@id'] ?? '', required: true })
    : el('div', { class: 'field-value' }, initial['@id']);
  const nameInput = el('input', { value: initial.name ?? '', required: true, autofocus: true });
  const formatInput = el('input', { value: initial['dc:format'] ?? '', placeholder: 'e.g. Photograph' });
  const rowInput = buildNumberSelect(initial['custom:row'] ?? null);
  const bayInput = buildNumberSelect(initial['custom:bay'] ?? null);
  const shelfInput = buildNumberSelect(initial['custom:shelf'] ?? null);
  const boxInput = buildNumberSelect(initial['custom:box'] ?? null);

  function setNumberField(item, key, input) {
    const value = input.value.trim();
    if (value) item[key] = Number(value);
    else delete item[key];
  }

  function handleSubmit(e) {
    e.preventDefault();
    const item = {
      '@id': isNew ? toEntityId(idInput.value) : initial['@id'],
      '@type': initial['@type'] ?? 'RegisterEntry',
      name: nameInput.value.trim(),
    };
    const format = formatInput.value.trim();
    if (format) item['dc:format'] = format;
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
  if (onDelete && !catalogueEntryExists) {
    actions.push(el('button', { type: 'button', class: 'danger', onclick: onDelete }, 'Delete'));
  }

  const promoteSection = isNew
    ? null
    : buildPromoteSection({ onCreateCatalogueEntry, catalogueEntryExists, onViewCatalogueEntry });

  return el('form', { class: 'item-form', onsubmit: handleSubmit }, [
    el('div', { class: 'form-toolbar' }, actions),
    el('div', { class: 'form-fields' }, [
      el('h2', {}, isNew ? 'New register entry' : 'Register entry'),
      isNew && initial['@id'] && el('p', { class: 'hint' }, 'No catalogue match was found for this scanned code.'),
      el('label', {}, ['@id', idInput]),
      isNew && el('p', { class: 'hint' }, 'A leading # is added automatically if omitted.'),
      el('label', {}, ['Name', nameInput]),
      el('label', {}, ['Format', formatInput]),
      el('div', { class: 'form-row' }, [
        el('label', {}, ['Row', rowInput]),
        el('label', {}, ['Bay', bayInput]),
        el('label', {}, ['Shelf', shelfInput]),
        el('label', {}, ['Box', boxInput]),
      ]),
      promoteSection,
    ]),
  ]);
}
