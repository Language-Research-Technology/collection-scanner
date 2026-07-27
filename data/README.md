# Sample data

Two sample RO-Crates you can load into the app via **Browse → Import catalogue / Import register**:

- `register/ro-crate-metadata.json` — 6 scanned objects: every object that has ever entered the collection, catalogued or not.
- `catalogue/ro-crate-metadata.json` — 4 of those objects, now fully catalogued.

Every catalogue object starts life as a register entry. Cataloguing an object ("Create catalogue entry") gives it a **new, independent `@id`** (`#cat-001`, etc.) and records the link back via `custom:registerId`, which holds the originating register entry's `@id`. A rescan of the register entry's code looks it up in the register, follows that link, and opens the linked catalogue entry directly. Because catalogue entries can only be created this way, and a register entry can't be deleted once linked, **every catalogue `@id` has a corresponding register entry referencing it via `custom:registerId`.**

`#reg-2023-058` and `#reg-2023-061` are the two register entries not yet promoted — open one in the app to try "Create catalogue entry". The other four (`#reg-2023-014`, `#reg-2023-021`, `#reg-2023-033`, `#reg-2023-047`) already have linked catalogue entries (`#cat-001`–`#cat-004`), so opening them shows the "catalogue entry already exists" state with a link to view it instead.

Item `@id`s use a leading `#` (e.g. `#reg-2023-014`), the standard RO-Crate convention for contextual entities that don't correspond to a real file — as opposed to the root dataset (`./`) or the metadata descriptor (`ro-crate-metadata.json`), which do. The app adds this prefix automatically for scanned codes and manually-typed ids if you don't type it yourself.

These files aren't read by the app automatically — it stores data in the browser's IndexedDB. Use the Import buttons to load them in, or Export to write your own data back out in this same format.
