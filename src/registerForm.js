import { el } from './dom.js';
import { toEntityId } from './rocrate.js';

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
  const idInput = el('input', {
    value: initial['@id'] ?? '',
    readonly: !isNew,
    required: true,
  });
  const nameInput = el('input', { value: initial.name ?? '', required: true, autofocus: true });
  const descriptionInput = el('textarea', { value: initial.description ?? '', rows: 3 });

  function handleSubmit(e) {
    e.preventDefault();
    const item = {
      '@id': isNew ? toEntityId(idInput.value) : initial['@id'],
      '@type': initial['@type'] ?? 'RegisterEntry',
      name: nameInput.value.trim(),
    };
    const description = descriptionInput.value.trim();
    if (description) item.description = description;
    onSave(item);
  }

  const actions = [
    el('button', { type: 'submit', class: 'primary' }, 'Save'),
    el('button', { type: 'button', onclick: onCancel }, 'Cancel'),
  ];
  if (onDelete && !catalogueEntryExists) {
    actions.push(el('button', { type: 'button', class: 'danger', onclick: onDelete }, 'Delete'));
  }

  const promoteSection =
    !isNew && onCreateCatalogueEntry
      ? el('div', { class: 'form-actions' }, [
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
        ])
      : null;

  return el('form', { class: 'item-form', onsubmit: handleSubmit }, [
    el('div', { class: 'form-toolbar' }, actions),
    el('div', { class: 'form-fields' }, [
      el('h2', {}, isNew ? 'New register entry' : 'Register entry'),
      isNew && initial['@id'] && el('p', { class: 'hint' }, 'No catalogue match was found for this scanned code.'),
      el('label', {}, ['@id', idInput]),
      isNew && el('p', { class: 'hint' }, 'A leading # is added automatically if omitted.'),
      el('label', {}, ['Name', nameInput]),
      el('label', {}, ['Description', descriptionInput]),
      promoteSection,
    ]),
  ]);
}
