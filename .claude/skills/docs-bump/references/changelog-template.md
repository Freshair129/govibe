# Changelog section shape (required by bump-doc.mjs)

Every governed GoVibe doc must end with a `## Changelog` section in this exact shape. The
`bump-doc.mjs` tool inserts a new row above the most recent entry; if the section is missing or
malformed it throws `no Changelog section found.`

```markdown
## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-01 | LYRA | Initial draft. |
```

Notes:

- The heading must be exactly `## Changelog` (level 2, no decoration, no trailing punctuation).
- The table must have 4 columns: Version, Date, Owner, Summary.
- The most recent entry sits at the **top** of the table (just under the header row).
- Versions follow `MAJOR.MINOR.PATCH[+pre]` where the optional `+pre` is `+draft` until ratified.
- Date is ISO `YYYY-MM-DD`.
- `bump-doc.mjs` preserves the `+pre` suffix when bumping — e.g. `0.1.0+draft` → `0.1.1+draft`.
