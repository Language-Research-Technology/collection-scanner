import { el, clear } from './dom.js';
import {
  emptyCrate,
  findByRegisterId,
  findItem,
  generateEntityId,
  getItems,
  removeItem,
  toEntityId,
  upsertItem,
} from './rocrate.js';
import { loadCatalogue, loadRegister, saveCatalogue, saveRegister } from './storage.js';
import { downloadJson, pickJsonFile } from './fileIO.js';
import { mountScanner } from './scanner.js';
import { buildListView } from './listView.js';
import { buildCatalogueForm } from './catalogueForm.js';
import { buildRegisterForm } from './registerForm.js';

const state = {
  loading: true,
  catalogue: null,
  register: null,
  view: 'setup', // 'setup' | 'scan' | 'browse'
  browseTab: 'catalogue', // 'catalogue' | 'register'
  detail: null,
  toast: null,
};

let headerEl, mainEl, toastEl;
let scannerHandle = null;
let scanLocked = false;
let toastTimer = null;

export function initApp(root) {
  headerEl = el('header', { class: 'app-header' });
  mainEl = el('main', { class: 'app-main' });
  toastEl = el('div', { class: 'toast', hidden: true });

  root.appendChild(el('div', { class: 'app' }, [headerEl, mainEl, toastEl]));

  render();

  Promise.all([loadCatalogue(), loadRegister()]).then(([catalogue, register]) => {
    setState({ catalogue, register, loading: false });
  });
}

function setState(patch) {
  Object.assign(state, patch);
  if ('detail' in patch && patch.detail === null) scanLocked = false;
  if ('toast' in patch) {
    clearTimeout(toastTimer);
    if (patch.toast) {
      toastTimer = setTimeout(() => setState({ toast: null }), 2500);
    }
  }
  render();
}

// ---- scan handling ----

function handleScan(code) {
  if (scanLocked) return;
  scanLocked = true;

  const id = toEntityId(code);
  const registerMatch = findItem(state.register, id);
  if (registerMatch) {
    const linkedCatalogueItem = findByRegisterId(state.catalogue, registerMatch['@id']);
    if (linkedCatalogueItem) {
      setState({ detail: { kind: 'catalogue-edit', item: linkedCatalogueItem } });
    } else {
      setState({ detail: { kind: 'register-edit', item: registerMatch } });
    }
    return;
  }
  setState({ detail: { kind: 'register-new', presetId: id } });
}

// ---- catalogue/register mutations ----

async function handleSaveCatalogueItem(item) {
  const next = upsertItem(state.catalogue, item);
  await saveCatalogue(next);
  setState({ catalogue: next, detail: null, toast: `Saved "${item.name}" to the catalogue` });
}

async function handleDeleteCatalogueItem(id) {
  if (!confirm('Delete this catalogue entry? This cannot be undone.')) return;
  const next = removeItem(state.catalogue, id);
  await saveCatalogue(next);
  setState({ catalogue: next, detail: null, toast: 'Catalogue entry deleted' });
}

async function handleSaveRegisterItem(item) {
  const next = upsertItem(state.register, item);
  await saveRegister(next);
  setState({ register: next, detail: null, toast: `Saved "${item.name}" to the register` });
}

async function handleDeleteRegisterItem(id) {
  if (findByRegisterId(state.catalogue, id)) {
    alert(
      'This object has already been catalogued, so its register entry can’t be deleted. ' +
        'Every catalogue object must trace back to a register entry. Delete the catalogue entry first if you need to remove both.',
    );
    return;
  }
  if (!confirm('Delete this register entry? This cannot be undone.')) return;
  const next = removeItem(state.register, id);
  await saveRegister(next);
  setState({ register: next, detail: null, toast: 'Register entry deleted' });
}

function handleCreateCatalogueFromRegister(regItem) {
  setState({
    detail: {
      kind: 'catalogue-new',
      presetId: generateEntityId(),
      presetRegisterId: regItem['@id'],
      presetName: regItem.name,
      presetDescription: regItem.description,
    },
  });
}

async function handleExport(kind) {
  const crate = kind === 'catalogue' ? state.catalogue : state.register;
  await downloadJson(`${kind}-ro-crate-metadata.json`, crate);
}

async function handleImport(kind) {
  const data = await pickJsonFile();
  if (!data || typeof data !== 'object' || !('@graph' in data)) {
    if (data !== null) alert('That file does not look like a valid ro-crate-metadata.json.');
    return;
  }
  await applyImportedData(kind, data, `Imported ${kind}`);
}

async function handleLoadSampleData() {
  const [catalogueRes, registerRes] = await Promise.all([
    fetch('data/catalogue/ro-crate-metadata.json'),
    fetch('data/register/ro-crate-metadata.json'),
  ]);
  if (!catalogueRes.ok || !registerRes.ok) {
    alert('Could not load sample data.');
    return;
  }
  const [catalogue, register] = await Promise.all([catalogueRes.json(), registerRes.json()]);
  await Promise.all([saveCatalogue(catalogue), saveRegister(register)]);
  setState({ catalogue, register, toast: 'Loaded sample data' });
}

async function handleReset() {
  if (!confirm('Clear all catalogue and register data? This cannot be undone.')) return;
  const catalogue = emptyCrate('Catalogue', 'Collection catalogue of accessioned objects');
  const register = emptyCrate('Register', 'Register of scanned objects awaiting cataloguing');
  await Promise.all([saveCatalogue(catalogue), saveRegister(register)]);
  setState({ catalogue, register, toast: 'Cleared all data' });
}

async function applyImportedData(kind, data, toast) {
  if (kind === 'catalogue') {
    await saveCatalogue(data);
    setState({ catalogue: data, toast });
  } else {
    await saveRegister(data);
    setState({ register: data, toast });
  }
}

// ---- rendering ----

function render() {
  renderHeader();
  renderMain();
  renderToast();
}

function renderHeader() {
  clear(headerEl);
  headerEl.appendChild(
    el('h1', {}, 'Scanner'),
  );
  headerEl.appendChild(
    el('nav', { class: 'tabs' }, [
      el(
        'button',
        {
          class: state.view === 'setup' ? 'active' : '',
          onclick: () => setState({ view: 'setup', detail: null }),
        },
        'Setup',
      ),
      el(
        'button',
        {
          class: state.view === 'scan' ? 'active' : '',
          onclick: () => setState({ view: 'scan', detail: null }),
        },
        'Scan',
      ),
      el(
        'button',
        {
          class: state.view === 'browse' ? 'active' : '',
          onclick: () => setState({ view: 'browse', detail: null }),
        },
        'Browse',
      ),
    ]),
  );
}

function renderMain() {
  const shouldScan = !state.loading && state.view === 'scan' && state.detail === null;

  if (shouldScan) {
    if (!scannerHandle) {
      clear(mainEl);
      scannerHandle = mountScanner(mainEl, handleScan);
    }
    return;
  }

  if (scannerHandle) {
    scannerHandle.destroy();
    scannerHandle = null;
  }

  clear(mainEl);

  if (state.loading) {
    mainEl.appendChild(el('div', { class: 'app-loading' }, 'Loading collection…'));
    return;
  }

  if (state.view === 'setup' && state.detail === null) {
    mainEl.appendChild(buildSetupScreen());
    return;
  }

  if (state.view === 'browse' && state.detail === null) {
    mainEl.appendChild(buildBrowseScreen());
    return;
  }

  if (state.detail) {
    mainEl.appendChild(buildDetailScreen(state.detail));
  }
}

function renderToast() {
  toastEl.hidden = !state.toast;
  toastEl.textContent = state.toast ?? '';
}

// ---- screens ----

function buildSetupScreen() {
  const catalogueItems = getItems(state.catalogue);
  const registerItems = getItems(state.register);

  return el('div', { class: 'setup' }, [
    el(
      'p',
      { class: 'hint' },
      'Scan RO-Crate QR codes to catalogue and register items in your collection.',
    ),
    el('div', { class: 'setup-io' }, [
      el('h2', {}, `Catalogue (${catalogueItems.length})`),
      el('div', { class: 'browse-io' }, [
        el('button', { onclick: () => handleImport('catalogue') }, 'Import catalogue'),
        el('button', { onclick: () => handleExport('catalogue') }, 'Export catalogue'),
      ]),
      el('h2', {}, `Register (${registerItems.length})`),
      el('div', { class: 'browse-io' }, [
        el('button', { onclick: () => handleImport('register') }, 'Import register'),
        el('button', { onclick: () => handleExport('register') }, 'Export register'),
      ]),
    ]),
    el('hr', { class: 'setup-divider' }),
    el('div', { class: 'setup-io' }, [
      el('h2', {}, 'Sample data'),
      el('div', { class: 'browse-io' }, [
        el('button', { onclick: handleLoadSampleData }, 'Load sample data'),
        el('button', { class: 'danger', onclick: handleReset }, 'Reset'),
      ]),
    ]),
  ]);
}

function buildBrowseScreen() {
  const catalogueItems = getItems(state.catalogue);
  const registerItems = getItems(state.register);

  const tabs = el('div', { class: 'browse-tabs' }, [
    el(
      'button',
      {
        class: state.browseTab === 'catalogue' ? 'active' : '',
        onclick: () => setState({ browseTab: 'catalogue' }),
      },
      `Catalogue (${catalogueItems.length})`,
    ),
    el(
      'button',
      {
        class: state.browseTab === 'register' ? 'active' : '',
        onclick: () => setState({ browseTab: 'register' }),
      },
      `Register (${registerItems.length})`,
    ),
  ]);

  const body =
    state.browseTab === 'catalogue'
      ? el('div', {}, [
          el(
            'p',
            { class: 'hint' },
            'Catalogue entries are created by promoting a register object — switch to Register to add a new scan.',
          ),
          buildListView({
            rows: catalogueItems.map((i) => ({
              id: i['@id'],
              primary: i.name || i['@id'],
              secondary: i['@id'],
            })),
            onSelect: (id) => setState({ detail: { kind: 'catalogue-edit', item: findItem(state.catalogue, id) } }),
            emptyMessage: 'No catalogue entries yet.',
          }),
        ])
      : buildListView({
          rows: registerItems.map((i) => ({
            id: i['@id'],
            primary: i.name || i['@id'],
            secondary: i['@id'],
          })),
          onSelect: (id) => setState({ detail: { kind: 'register-edit', item: findItem(state.register, id) } }),
          onNew: () => setState({ detail: { kind: 'register-new', presetId: '' } }),
          newLabel: '+ New register entry',
          emptyMessage: 'No register entries yet.',
        });

  return el('div', { class: 'browse' }, [tabs, body]);
}

function buildDetailScreen(detail) {
  switch (detail.kind) {
    case 'catalogue-edit':
      return buildCatalogueForm({
        initial: detail.item,
        onSave: handleSaveCatalogueItem,
        onDelete: () => handleDeleteCatalogueItem(detail.item['@id']),
        onCancel: () => setState({ detail: null }),
      });

    case 'catalogue-new':
      return buildCatalogueForm({
        initial: {
          '@id': detail.presetId,
          ...(detail.presetName ? { name: detail.presetName } : {}),
          ...(detail.presetDescription ? { description: detail.presetDescription } : {}),
          'custom:registerId': detail.presetRegisterId,
        },
        onSave: handleSaveCatalogueItem,
        onCancel: () => setState({ detail: null }),
      });

    case 'register-edit': {
      const linkedCatalogueItem = findByRegisterId(state.catalogue, detail.item['@id']);
      return buildRegisterForm({
        initial: detail.item,
        isNew: false,
        onSave: handleSaveRegisterItem,
        onDelete: () => handleDeleteRegisterItem(detail.item['@id']),
        onCancel: () => setState({ detail: null }),
        onCreateCatalogueEntry: () => handleCreateCatalogueFromRegister(detail.item),
        catalogueEntryExists: Boolean(linkedCatalogueItem),
        onViewCatalogueEntry: linkedCatalogueItem
          ? () => setState({ detail: { kind: 'catalogue-edit', item: linkedCatalogueItem } })
          : undefined,
      });
    }

    case 'register-new':
      return buildRegisterForm({
        initial: { '@id': detail.presetId },
        isNew: true,
        onSave: handleSaveRegisterItem,
        onCancel: () => setState({ detail: null }),
        catalogueEntryExists: false,
      });

    default:
      return el('div');
  }
}
