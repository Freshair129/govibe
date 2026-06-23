import { describe, it, expect } from "vitest";

import { atomizeCode } from "./translator/code-atomizer.mjs";
import { atomize } from "./translator/atomizer.mjs";
import { render } from "./translator/renderer.mjs";
import { roundTrip } from "./translator/fidelity.mjs";

const CODE = `export function add(a, b) {
  return a + b;
}

export class Calc {
  total() {
    return 0;
  }
}

const PI = 3.14;
type Money = number;
`;

describe("code-atomizer (TS/JS AST)", () => {
  it("extracts functions, classes+methods, consts, and type aliases with symbol provenance", () => {
    const { atoms } = atomizeCode(CODE, { file: "calc.ts", lang: "ts" });
    const byName = Object.fromEntries(atoms.map((a) => [a.heading, a]));
    expect(byName.add.type).toBe("function");
    expect(byName.Calc.type).toBe("class");
    expect(byName.total.type).toBe("method");
    expect(byName.total.parentId).toBe(byName.Calc.id);
    expect(byName.PI.type).toBe("const");
    expect(byName.Money.type).toBe("type");
    // real source provenance
    expect(byName.add.sourceRefs[0]).toMatchObject({ file: "calc.ts", symbol: "add" });
    expect(byName.add.sourceRefs[0].lines).toMatch(/^\d+-\d+$/);
  });

  it("round-trips: render code atoms -> re-atomize markdown -> every atom preserved", () => {
    const { atoms } = atomizeCode(CODE, { file: "calc.ts", lang: "ts" });
    const out = render(atoms, { naming: { case: "sentence", numbered: false }, sections: [] });
    expect(roundTrip(atoms, out).ok).toBe(true);
  });

  it("handles plain JS too", () => {
    const { atoms } = atomizeCode("function hi(){return 1}\nconst x = () => 2;", { file: "a.js", lang: "js" });
    const types = atoms.map((a) => `${a.heading}:${a.type}`);
    expect(types).toContain("hi:function");
    expect(types).toContain("x:function"); // arrow const detected as function
  });
});

describe("markdown atomizer ignores headings inside code fences", () => {
  it("does not split on a '# ...' line inside a fenced block", () => {
    const md = "# Real Heading\nbody\n\n```\n# not a heading\nmore code\n```\n";
    const { atoms } = atomize(md);
    expect(atoms.map((a) => a.heading)).toEqual(["Real Heading"]);
    expect(atoms[0].content).toContain("# not a heading"); // kept as body, not a new atom
  });
});
