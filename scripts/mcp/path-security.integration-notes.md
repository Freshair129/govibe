# Path containment integration points

Apply `resolvePathWithinRoot` at the following call boundaries before parsing or writing:

1. Explicit roadmap source selection in `inferRoadmapSourcePath`.
2. Master-plan preview source resolution.
3. Roadmap export `outputPath` resolution.
4. Any future `file.save` persistence path.

Recommended roots:

- roadmap reads: `docs/roadmap`
- roadmap exports: `docs/roadmap` or another explicitly configured writable export root

Do not convert a containment failure into a generic internal error. Preserve an internal error code while returning a bounded public message.
