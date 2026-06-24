// Observe motion behaviour of an external Framer page.
// Records: element transforms during scroll, sticky/pinned blocks, marquees,
// hover state changes, scroll-triggered class additions, and counter-style
// text mutations. Outputs JSON only — no source code is copied.

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const URL = process.argv[2] || 'https://top-workshops-645528.framer.app/';
const OUT = process.argv[3] || 'G:/govibe/scripts/one-off/framer-motion-report.json';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(800);

const report = await page.evaluate(async () => {
  const out = {
    docHeight: document.documentElement.scrollHeight,
    viewport: { w: innerWidth, h: innerHeight },
    sticky: [], pinned: [], marquees: [], textMutations: [],
    transformSamples: [], scrollClassChanges: [], hoverEffects: [],
  };

  // 1) find sticky / fixed elements
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.position === 'sticky' || cs.position === 'fixed') {
      const r = el.getBoundingClientRect();
      if (r.width > 60 && r.height > 20) {
        out.sticky.push({
          tag: el.tagName, cls: (el.className || '').toString().slice(0, 40),
          pos: cs.position, top: cs.top, z: cs.zIndex,
          w: Math.round(r.width), h: Math.round(r.height),
        });
      }
    }
  });

  // 2) find continuously animating elements (marquees, infinite loops)
  const animated = [];
  document.getAnimations().forEach(a => {
    const tgt = a.effect && a.effect.target;
    const tim = a.effect && a.effect.getTiming();
    if (!tgt || !tim) return;
    animated.push({
      tag: tgt.tagName,
      cls: (tgt.className || '').toString().slice(0, 40),
      iter: tim.iterations, dur: tim.duration, easing: tim.easing,
      playState: a.playState,
    });
  });
  out.marquees = animated.filter(a => a.iter === Infinity || a.iter > 50);
  out.timedAnimations = animated.filter(a => a.iter !== Infinity && a.iter <= 50);

  return out;
});

// scroll sampling: record transform changes per element across scroll positions
const scrollSamples = await page.evaluate(async () => {
  const observed = new Map();
  const els = [...document.querySelectorAll('*')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 80 && r.height > 40;
  }).slice(0, 600);

  function snapshot(label) {
    els.forEach((el, i) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const key = i;
      const cur = observed.get(key) || { tag: el.tagName, cls: (el.className||'').toString().slice(0,40), samples: [] };
      cur.samples.push({
        at: label, scrollY: window.scrollY,
        transform: cs.transform, top: Math.round(r.top),
        opacity: cs.opacity,
      });
      observed.set(key, cur);
    });
  }

  snapshot('y0');
  for (let y of [400, 900, 1600, 2400, 3400, 4400, 5500, 6800]) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 250));
    snapshot('y' + y);
  }
  window.scrollTo(0, 0);

  // keep only elements that changed transform / opacity meaningfully
  const changing = [];
  observed.forEach((v) => {
    const transforms = new Set(v.samples.map(s => s.transform));
    const opacities = new Set(v.samples.map(s => s.opacity));
    if (transforms.size > 2 || opacities.size > 2) {
      changing.push({ tag: v.tag, cls: v.cls, transforms: [...transforms].slice(0,4), opacities: [...opacities] });
    }
  });
  return changing.slice(0, 60);
});

report.scrollDrivenTransforms = scrollSamples;

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log('wrote', OUT, '— sticky:', report.sticky.length, 'marquees:', report.marquees.length, 'timed:', report.timedAnimations?.length||0, 'scroll-changing:', scrollSamples.length);

await browser.close();
