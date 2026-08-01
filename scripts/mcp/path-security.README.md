# Path security helper

```js
import { resolvePathWithinRoot } from "./path-security.mjs";

const safeSource = await resolvePathWithinRoot(requestedSource, roadmapDir);
```

Always pass an explicit absolute root. The helper resolves symlinks before checking containment.
