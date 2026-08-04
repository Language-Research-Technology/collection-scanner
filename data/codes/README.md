# QR codes

One PNG per **register** entry, encoding that entry's `@id` — these are the physical codes the app's scanner actually matches against. See the top-level [README](../../README.md#generating-qr-codes) for the data format and how to generate new ones.

Catalogue entries don't get their own code: they're identified only by `custom:registerId`, not by a scannable `@id` of their own (see the top-level [README](../../README.md#data-model)). Scanning a register entry's code opens the linked catalogue entry directly once one exists, so one code per physical object is all that's needed — print the register code and use it for the object's whole lifecycle, catalogued or not.

`db02e09d1f74.png` and `84c4f5b66d5b.png` are **unassigned** codes — the ids they encode don't exist in the sample register. Scan one to try the "no match, create a new register entry" flow instead of opening an existing record. They aren't part of the register crate, so they won't be touched if you regenerate the others.
