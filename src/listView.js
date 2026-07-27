import { el } from './dom.js';

export function buildListView({ rows, onSelect, onNew, newLabel, emptyMessage }) {
  const children = [];

  if (onNew) {
    children.push(
      el('div', { class: 'list-toolbar' }, [
        el('button', { class: 'accent', onclick: onNew }, newLabel),
      ]),
    );
  }

  if (rows.length === 0) {
    children.push(el('p', { class: 'hint' }, emptyMessage));
  } else {
    children.push(
      el(
        'ul',
        { class: 'item-list' },
        rows.map((row) =>
          el('li', {}, [
            el('button', { class: 'item-row', onclick: () => onSelect(row.id) }, [
              el('span', { class: 'item-row-primary' }, row.primary),
              el('span', { class: 'item-row-secondary' }, row.secondary ?? ''),
            ]),
          ]),
        ),
      ),
    );
  }

  return el('div', { class: 'list-view' }, children);
}
