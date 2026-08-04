export const ROOT_DATASET_ID = './';
export const METADATA_DESCRIPTOR_ID = 'ro-crate-metadata.json';

/**
 * Contextual entities (catalogue objects, register entries) don't correspond to
 * real files, so per RO-Crate convention their @id is a hash fragment rather
 * than a file-path-style string. Scanned codes and user-typed ids are plain
 * strings, so normalize them to "#..." form before they're used as an @id.
 */
export function toEntityId(raw) {
  const trimmed = raw.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

// Catalogue and register ids are generated independently, since the two are
// expected to evolve on their own schedules. Both are a "prefix-hash" shape:
// the full SHA-256 hash of the generation time, kept untruncated to avoid any
// collision risk, with a counter mixed in alongside the timestamp so a tight
// loop generating many ids in the same millisecond (e.g. a bulk print batch)
// can't collide.
let catalogueIdCounter = 0;
let registerIdCounter = 0;

async function hashGenerationTime(counter) {
  const input = `${Date.now()}-${counter}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Catalogue entries get their own freshly-minted @id (they don't reuse the
 * register entry's id) — the link back to the register is carried instead by
 * the custom:registerId field.
 */
export async function generateCatalogueId() {
  return toEntityId(`cat-${await hashGenerationTime(catalogueIdCounter++)}`);
}

export async function generateRegisterId() {
  return toEntityId(`reg-${await hashGenerationTime(registerIdCounter++)}`);
}

export function emptyCrate(name, description) {
  return {
    '@context': 'https://w3id.org/ro/crate/1.1/context',
    '@graph': [
      {
        '@id': METADATA_DESCRIPTOR_ID,
        '@type': 'CreativeWork',
        conformsTo: { '@id': 'https://w3id.org/ro/crate/1.1' },
        about: { '@id': ROOT_DATASET_ID },
      },
      {
        '@id': ROOT_DATASET_ID,
        '@type': 'Dataset',
        name,
        description,
        hasPart: [],
      },
    ],
  };
}

export function getItems(crate) {
  return crate['@graph'].filter(
    (n) => n['@id'] !== ROOT_DATASET_ID && n['@id'] !== METADATA_DESCRIPTOR_ID,
  );
}

export function findItem(crate, id) {
  return getItems(crate).find((n) => n['@id'] === id);
}

export function findByRegisterId(catalogue, registerId) {
  return getItems(catalogue).find((n) => n['custom:registerId'] === registerId);
}

export function upsertItem(crate, item) {
  const graph = crate['@graph'];
  const existingIndex = graph.findIndex((n) => n['@id'] === item['@id']);
  const nextGraph = [...graph];
  if (existingIndex >= 0) {
    nextGraph[existingIndex] = item;
  } else {
    nextGraph.push(item);
    const rootIndex = nextGraph.findIndex((n) => n['@id'] === ROOT_DATASET_ID);
    const root = { ...nextGraph[rootIndex] };
    const hasPart = Array.isArray(root.hasPart) ? [...root.hasPart] : [];
    hasPart.push({ '@id': item['@id'] });
    root.hasPart = hasPart;
    nextGraph[rootIndex] = root;
  }
  return { ...crate, '@graph': nextGraph };
}

export function removeItem(crate, id) {
  const nextGraph = crate['@graph']
    .filter((n) => n['@id'] !== id)
    .map((n) => {
      if (n['@id'] !== ROOT_DATASET_ID) return n;
      const hasPart = Array.isArray(n.hasPart)
        ? n.hasPart.filter((p) => p['@id'] !== id)
        : [];
      return { ...n, hasPart };
    });
  return { ...crate, '@graph': nextGraph };
}
