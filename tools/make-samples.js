#!/usr/bin/env node
// Draws the illustrated sample before/after pairs in photos/trades/.
// They are stand-ins until real photos are dropped in with the same file names.
// Not part of the site build. Needs Chrome plus the playwright and sharp packages:
//   node tools/make-samples.js            all trades
//   node tools/make-samples.js lawn-care  one trade

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const W = 800;
const H = 600;
const OUT = path.join(__dirname, '..', 'photos', 'trades');

// ---------- helpers ----------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
const between = (r, lo, hi) => lo + r() * (hi - lo);

let ids = 0;
// A cloudy overlay: noise turned into patches of one color.
function cloud(o) {
  const id = `f${++ids}`;
  const [r, g, b] = (o.color || [40, 48, 30]).map((v) => (v / 255).toFixed(3));
  const def =
    `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="${o.type || 'fractalNoise'}" baseFrequency="${o.freq || 0.012}" numOctaves="${o.octaves || 3}" seed="${o.seed || 1}"/>` +
    `<feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${o.gain == null ? 3 : o.gain} 0 0 0 ${o.cut == null ? -1.2 : o.cut}"/>` +
    (o.blur ? `<feGaussianBlur stdDeviation="${o.blur}"/>` : '') +
    `<feComposite in2="SourceAlpha" operator="in"/>` +
    `</filter>`;
  const shape = o.shape || `<rect x="${o.x || 0}" y="${o.y || 0}" width="${o.w || W}" height="${o.h || H}"/>`;
  const use = `<g filter="url(#${id})" opacity="${o.opacity == null ? 1 : o.opacity}" style="mix-blend-mode:${o.blend || 'multiply'}">${shape}</g>`;
  return { def, use };
}
const grain = (seed, opacity = 0.5, freq = 0.9) =>
  cloud({ freq, octaves: 2, seed, color: [0, 0, 0], gain: 1.4, cut: -0.55, opacity, blend: 'multiply' });

// Soft daylight from the top left, so flat shapes get a little depth.
const LIGHT =
  `<linearGradient id="light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>`;
const lightRect = `<rect width="${W}" height="${H}" fill="url(#light)"/>`;

function svg(defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${LIGHT}${defs.join('')}</defs>${body.join('')}</svg>`;
}

// ---------- pressure washing ----------

function driveway(dirty) {
  const r = rng(11);
  const clean = ['#d9b896', '#cfaa86', '#e3c6a6', '#c9a07d', '#dcbd9b', '#d2b08c'];
  const bricks = [];
  for (let row = -4; row < 16; row++) {
    for (let col = -3; col < 10; col++) {
      const x = col * 126 + (row % 2 ? 63 : 0);
      const y = row * 64;
      bricks.push(`<rect x="${x}" y="${y}" width="120" height="58" rx="3" fill="${pick(r, clean)}"/>`);
    }
  }
  const defs = [];
  const body = [
    `<rect width="${W}" height="${H}" fill="${dirty ? '#4a4538' : '#bfa78c'}"/>`,
    `<g transform="rotate(-17 400 300)">${bricks.join('')}</g>`,
  ];
  if (dirty) {
    const film = cloud({ freq: 0.006, octaves: 2, seed: 4, color: [70, 72, 52], gain: 1.6, cut: 0.05, opacity: 0.9 });
    const algae = cloud({ freq: 0.013, octaves: 4, seed: 9, color: [30, 40, 26], gain: 2.7, cut: -1.12, blur: 1.5 });
    const spots = cloud({ freq: 0.05, octaves: 2, seed: 2, color: [20, 22, 18], gain: 4, cut: -2.3, opacity: 0.8 });
    defs.push(film.def, algae.def, spots.def);
    body.push(film.use, algae.use, spots.use);
    body.push(`<path d="M-20 470 C200 400 420 420 840 330" fill="none" stroke="#1d1c18" stroke-width="46" opacity=".28" style="mix-blend-mode:multiply"/>`);
  } else {
    const g = grain(3, 0.22);
    defs.push(g.def);
    body.push(g.use);
  }
  body.push(lightRect);
  return svg(defs, body);
}

function roof(dirty) {
  const defs = [
    `<linearGradient id="tile" x1="0" x2="1"><stop offset="0" stop-color="#9c4a2c"/><stop offset=".45" stop-color="#dd7c52"/><stop offset=".8" stop-color="#c2633e"/><stop offset="1" stop-color="#8f4226"/></linearGradient>`,
    `<linearGradient id="lap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`,
  ];
  const body = [`<rect width="${W}" height="${H}" fill="#b45a37"/>`];
  const rowH = 118;
  for (let row = 5; row >= 0; row--) {
    const y = row * rowH - 40;
    body.push(`<rect x="0" y="${y + rowH + 8}" width="${W}" height="46" fill="url(#lap)"/>`);
    for (let col = 0; col < 12; col++) {
      const x = col * 80 - (row % 2 ? 40 : 0);
      body.push(`<rect x="${x}" y="${y}" width="80" height="${rowH}" fill="url(#tile)"/>`);
      body.push(`<path d="M${x} ${y + rowH} a40 15 0 0 0 80 0Z" fill="url(#tile)"/>`);
      body.push(`<path d="M${x + 5} ${y + rowH} a35 11 0 0 0 70 0" fill="none" stroke="#f0a27c" stroke-width="4" opacity=".8"/>`);
    }
  }
  if (dirty) {
    const dull = cloud({ freq: 0.004, octaves: 1, seed: 3, color: [78, 70, 60], gain: 1.2, cut: 0.2, opacity: 0.85 });
    const streaks = cloud({ freq: '0.02 0.0022', octaves: 3, seed: 12, color: [26, 26, 22], gain: 2.8, cut: -1.25, blur: 1.5, opacity: 0.9 });
    const moss = cloud({ freq: 0.03, octaves: 3, seed: 5, color: [52, 74, 34], gain: 4, cut: -2.2, opacity: 0.9 });
    defs.push(dull.def, streaks.def, moss.def);
    body.push(dull.use, streaks.use, moss.use);
  } else {
    const g = grain(8, 0.18);
    defs.push(g.def);
    body.push(g.use);
  }
  body.push(lightRect);
  return svg(defs, body);
}

function poolDeck(dirty) {
  const r = rng(21);
  const stone = ['#ece3d3', '#e6dac6', '#efe7d9', '#e2d5bf', '#e9dfcd'];
  const defs = [
    `<linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dirty ? '#7fa58f' : '#7fe2f0'}"/><stop offset="1" stop-color="${dirty ? '#4f7f72' : '#2aaed3'}"/></linearGradient>`,
  ];
  const tiles = [];
  for (let row = -1; row < 5; row++) {
    for (let col = -1; col < 6; col++) {
      tiles.push(`<rect x="${col * 206 - 40}" y="${row * 206 - 60}" width="200" height="200" fill="${pick(r, stone)}"/>`);
    }
  }
  const veins = cloud({ freq: '0.004 0.03', octaves: 3, seed: 6, color: [150, 120, 84], gain: 2.4, cut: -1.15, opacity: 0.16 });
  defs.push(veins.def);
  const body = [
    `<rect width="${W}" height="${H}" fill="${dirty ? '#5d594c' : '#cfc3ae'}"/>`,
    `<g transform="rotate(8 400 300)">${tiles.join('')}</g>`,
    veins.use,
  ];
  if (dirty) {
    const film = cloud({ freq: 0.005, octaves: 2, seed: 2, color: [96, 98, 78], gain: 1.5, cut: 0.05, opacity: 0.85 });
    const mildew = cloud({ freq: 0.014, octaves: 4, seed: 15, color: [34, 44, 30], gain: 2.6, cut: -1.08, blur: 2 });
    defs.push(film.def, mildew.def);
    body.push(film.use, mildew.use);
  }
  // Pool corner, top right.
  body.push(
    `<g transform="rotate(8 400 300)"><rect x="470" y="-120" width="460" height="330" rx="26" fill="#f4eee2"/>` +
      `<rect x="500" y="-120" width="430" height="300" rx="14" fill="url(#water)"/>` +
      `<rect x="500" y="166" width="430" height="14" fill="#0b4f6c" opacity=".25"/></g>`
  );
  if (dirty) {
    const ring = cloud({ freq: 0.02, octaves: 2, seed: 7, color: [40, 52, 36], gain: 3, cut: -1.1, x: 430, y: 0, w: 370, h: 260, opacity: 0.7 });
    defs.push(ring.def);
    body.push(ring.use);
  }
  body.push(lightRect);
  return svg(defs, body);
}

// ---------- pool care ----------

const caustics = (seed, opacity = 0.55) =>
  cloud({ type: 'turbulence', freq: 0.011, octaves: 2, seed, color: [255, 255, 255], gain: -9, cut: 1.25, blend: 'screen', opacity, blur: 1.2 });

function poolShell(dirty, inner) {
  const deck = dirty ? '#bdb5a2' : '#e9e1d0';
  return (
    `<rect width="${W}" height="${H}" fill="${deck}"/>` +
    `<rect x="70" y="70" width="${W}" height="${H}" rx="46" fill="${dirty ? '#d2cab6' : '#f7f2e8'}"/>` +
    `<svg x="104" y="104" width="${W - 104}" height="${H - 104}" viewBox="0 0 ${W - 104} ${H - 104}"><rect width="${W}" height="${H}" rx="24" fill="url(#water)"/>${inner}</svg>`
  );
}

function greenPool(dirty) {
  const r = rng(31);
  const defs = [
    `<radialGradient id="water" cx=".7" cy=".75" r="1"><stop offset="0" stop-color="${dirty ? '#3f5f2c' : '#1f9fcc'}"/><stop offset="1" stop-color="${dirty ? '#7d9a44' : '#8fe6f2'}"/></radialGradient>`,
  ];
  let inner = '';
  const body = [];
  if (dirty) {
    const algae = cloud({ freq: 0.009, octaves: 4, seed: 4, color: [34, 52, 22], gain: 3.2, cut: -1.3 });
    const scum = cloud({ freq: 0.03, octaves: 2, seed: 8, color: [178, 190, 96], gain: 4, cut: -2.3, blend: 'screen', opacity: 0.6 });
    defs.push(algae.def, scum.def);
    inner += algae.use + scum.use;
    for (let i = 0; i < 16; i++) {
      const x = between(r, 20, 660);
      const y = between(r, 20, 460);
      inner += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${between(r, 9, 17).toFixed(0)}" ry="${between(r, 4, 7).toFixed(0)}" fill="${pick(r, ['#6b4a22', '#8a6a2c', '#4f3a1c'])}" transform="rotate(${between(r, 0, 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
    }
  } else {
    const c = caustics(5);
    defs.push(c.def);
    inner +=
      `<rect x="-10" y="-10" width="${W}" height="34" fill="#0b6e96" opacity=".35"/><rect x="-10" y="-10" width="34" height="${H}" fill="#0b6e96" opacity=".35"/>` +
      `<circle cx="470" cy="330" r="16" fill="none" stroke="#0b6e96" stroke-width="5" opacity=".45"/>` +
      c.use;
  }
  body.push(poolShell(dirty, inner));
  if (dirty) {
    const grime = cloud({ freq: 0.02, octaves: 3, seed: 3, color: [70, 78, 52], gain: 3, cut: -1.4, opacity: 0.7, shape: `<path d="M0 0H${W}V104H104V${H}H0Z"/>` });
    defs.push(grime.def);
    body.push(grime.use);
  }
  body.push(lightRect);
  return svg(defs, body);
}

function waterline(dirty) {
  const r = rng(41);
  const blues = ['#1f5fa8', '#2a73c0', '#174f93', '#2f80cf', '#225fae'];
  const defs = [
    `<linearGradient id="coping" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1eadb"/><stop offset=".8" stop-color="#e2d8c4"/><stop offset="1" stop-color="#b9ad96"/></linearGradient>`,
    `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dirty ? '#86b7a8' : '#7fe0ee'}"/><stop offset="1" stop-color="${dirty ? '#5b9486' : '#27a9d0'}"/></linearGradient>`,
    `<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
  ];
  const body = [`<rect width="${W}" height="${H}" fill="#e8dcc6"/>`];
  let tiles = '';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 12; col++) {
      const x = col * 68 - 6;
      const y = 132 + row * 68;
      tiles += `<rect x="${x}" y="${y}" width="62" height="62" rx="2" fill="${pick(r, blues)}"/>`;
      if (!dirty) tiles += `<rect x="${x}" y="${y}" width="62" height="62" rx="2" fill="url(#gloss)"/>`;
    }
  }
  body.push(`<rect x="0" y="126" width="${W}" height="216" fill="#dfe6e8"/>`, tiles);
  body.push(`<rect x="0" y="336" width="${W}" height="${H - 336}" fill="url(#water)"/>`);
  if (dirty) {
    const dull = `<rect x="0" y="126" width="${W}" height="216" fill="#9aa39c" opacity=".38"/>`;
    const scale = cloud({ freq: '0.012 0.05', octaves: 3, seed: 6, color: [236, 232, 220], gain: 4, cut: -1.35, blend: 'normal', y: 236, h: 112 });
    const scale2 = cloud({ freq: '0.02 0.08', octaves: 2, seed: 9, color: [244, 240, 230], gain: 5, cut: -1.9, blend: 'normal', y: 286, h: 66 });
    const scum = cloud({ freq: '0.006 0.05', octaves: 2, seed: 2, color: [120, 132, 80], gain: 3, cut: -1.2, y: 330, h: 60, opacity: 0.8 });
    defs.push(scale.def, scale2.def, scum.def);
    body.push(dull, scale.use, scale2.use, scum.use);
  } else {
    const c = caustics(7, 0.5);
    defs.push(c.def);
    body.push(`<g transform="translate(0 336)">${c.use}</g>`.replace(`height="${H}"`, `height="${H - 336}"`));
    body.push(`<rect x="0" y="336" width="${W}" height="10" fill="#fff" opacity=".35"/>`);
  }
  body.push(`<rect x="0" y="0" width="${W}" height="126" fill="url(#coping)"/>`, `<rect x="0" y="126" width="${W}" height="10" fill="#000" opacity=".22"/>`);
  if (dirty) {
    const stain = cloud({ freq: 0.02, octaves: 3, seed: 4, color: [92, 96, 70], gain: 3, cut: -1.5, h: 126, opacity: 0.6 });
    defs.push(stain.def);
    body.push(stain.use);
  }
  body.push(lightRect);
  return svg(defs, body);
}

function steps(dirty) {
  const defs = [
    `<linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dirty ? '#9fbfae' : '#a5edf5'}"/><stop offset="1" stop-color="${dirty ? '#5f8f86' : '#2fb4d8'}"/></linearGradient>`,
  ];
  const tone = dirty ? ['#b9cdb4', '#a3bea2', '#8cae92'] : ['#d2f6fa', '#aeebf4', '#84dcec'];
  let inner = '';
  [0, 1, 2].forEach((i) => {
    const size = 600 - i * 150;
    inner += `<rect x="-80" y="-80" width="${size}" height="${size - 110}" rx="80" fill="${tone[i]}"/>`;
    inner += `<rect x="-80" y="-80" width="${size}" height="${size - 110}" rx="80" fill="none" stroke="#0b6e96" stroke-opacity="${dirty ? 0.18 : 0.16}" stroke-width="6"/>`;
  });
  if (dirty) {
    const algae = cloud({ freq: 0.02, octaves: 4, seed: 11, color: [58, 84, 34], gain: 2.6, cut: -1.2, blur: 2 });
    const silt = cloud({ freq: '0.012 0.03', octaves: 3, seed: 3, color: [112, 92, 56], gain: 2.6, cut: -1.2, blur: 2, opacity: 0.85 });
    defs.push(algae.def, silt.def);
    inner += algae.use + silt.use;
  } else {
    const c = caustics(9, 0.6);
    defs.push(c.def);
    inner += c.use;
  }
  return svg(defs, [poolShell(dirty, inner), lightRect]);
}

// ---------- lawn care ----------

function grassField(dirty, seed, stripes = true) {
  const defs = [];
  let out = `<rect width="${W}" height="${H}" fill="${dirty ? '#8f9a4c' : '#58a743'}"/>`;
  if (!dirty && stripes) {
    let bands = '';
    for (let i = -6; i < 14; i += 2) bands += `<rect x="${i * 86}" y="-300" width="86" height="1300" fill="#47923a"/>`;
    out += `<g transform="rotate(28 400 300)">${bands}</g>`;
  }
  if (dirty) {
    const dry = cloud({ freq: 0.008, octaves: 4, seed, color: [176, 142, 80], gain: 3.4, cut: -1.45, blend: 'normal' });
    const bare = cloud({ freq: 0.018, octaves: 3, seed: seed + 5, color: [120, 96, 62], gain: 4, cut: -2.3, blend: 'normal', opacity: 0.9 });
    defs.push(dry.def, bare.def);
    out += dry.use + bare.use;
  }
  const blades = cloud({ freq: '0.9 0.12', octaves: 2, seed: seed + 1, color: [10, 40, 10], gain: 1.6, cut: -0.62, opacity: dirty ? 0.5 : 0.42 });
  defs.push(blades.def);
  out += blades.use;
  return { defs, out };
}

function weeds(r, count, box) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = between(r, box[0], box[2]);
    const y = between(r, box[1], box[3]);
    const s = between(r, 10, 22);
    let leaves = '';
    for (let k = 0; k < 6; k++) {
      leaves += `<ellipse cx="${s * 0.7}" cy="0" rx="${s * 0.75}" ry="${s * 0.22}" transform="rotate(${k * 60 + between(r, -12, 12)})"/>`;
    }
    out += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})" fill="${pick(r, ['#3f7a2a', '#4d8a2e', '#356b25'])}">${leaves}`;
    if (r() > 0.45) out += `<circle r="${(s * 0.3).toFixed(1)}" fill="#f1cf2b"/>`;
    out += `</g>`;
  }
  return out;
}

function lawn(dirty) {
  const r = rng(51);
  const g = grassField(dirty, 5);
  const body = [g.out];
  if (dirty) body.push(weeds(r, 26, [20, 20, 780, 580]));
  body.push(lightRect);
  return svg(g.defs, body);
}

function edging(dirty) {
  const r = rng(61);
  const g = grassField(dirty, 14, false);
  const defs = [...g.defs];
  const concrete = cloud({ freq: 0.6, octaves: 2, seed: 4, color: [90, 86, 78], gain: 1.4, cut: -0.6, opacity: 0.35, w: 330 });
  defs.push(concrete.def);
  const body = [g.out];
  let walk = `<rect x="0" y="0" width="318" height="${H}" fill="${dirty ? '#b9b4a6' : '#d6d2c9'}"/>`;
  [150, 380].forEach((y) => (walk += `<rect x="0" y="${y}" width="318" height="5" fill="#000" opacity=".22"/>`));
  body.push(walk, concrete.use);
  if (dirty) {
    let edge = 'M318 -10';
    for (let y = -10; y <= H + 20; y += 22) edge += ` L${(318 - between(r, 8, 74)).toFixed(0)} ${y}`;
    edge += ` L340 ${H + 20} L340 -10 Z`;
    body.push(`<path d="${edge}" fill="#7f9144"/>`);
    const dirt = cloud({ freq: 0.02, octaves: 3, seed: 8, color: [104, 98, 74], gain: 2, cut: -0.85, w: 330, opacity: 0.6, blur: 3 });
    defs.push(dirt.def);
    body.push(dirt.use);
    body.push(weeds(r, 9, [150, 20, 330, 580]), weeds(r, 12, [340, 20, 780, 580]));
    [150, 380].forEach((y) => body.push(weeds(r, 3, [20, y - 6, 240, y + 6])));
  } else {
    body.push(`<rect x="318" y="0" width="12" height="${H}" fill="#3d2f22"/>`, `<rect x="330" y="0" width="5" height="${H}" fill="#2f6f2a"/>`);
  }
  body.push(lightRect);
  return svg(defs, body);
}

function shrub(r, x, y, size, wild) {
  let out = `<ellipse cx="${x + 10}" cy="${y + 14}" rx="${size}" ry="${size * 0.9}" fill="#000" opacity=".22"/>`;
  const lobes = wild ? 13 : 9;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const d = size * (wild ? between(r, 0.45, 1.05) : 0.52);
    const s = size * (wild ? between(r, 0.4, 0.7) : 0.56);
    out += `<circle cx="${(x + Math.cos(a) * d).toFixed(0)}" cy="${(y + Math.sin(a) * d).toFixed(0)}" r="${s.toFixed(0)}" fill="${pick(r, wild ? ['#4f6b2c', '#5d7a30', '#44602a'] : ['#2f7a35', '#368a3c', '#2a6e30'])}"/>`;
  }
  out += `<circle cx="${x}" cy="${y}" r="${(size * 0.62).toFixed(0)}" fill="${wild ? '#63803a' : '#43a049'}"/>`;
  return out;
}

function beds(dirty) {
  const r = rng(71);
  const g = grassField(dirty, 22, false);
  const defs = [...g.defs];
  const bedPath = `M-20 300 C160 250 250 420 420 400 C580 380 640 250 830 300 L830 -20 L-20 -20 Z`;
  const mulch = cloud({ freq: '0.25 0.5', octaves: 2, seed: 6, color: [20, 8, 4], gain: 1.8, cut: -0.7, opacity: 0.55, shape: `<path d="${bedPath}"/>` });
  defs.push(mulch.def);
  const body = [g.out, `<path d="${bedPath}" fill="${dirty ? '#8b7b68' : '#6a3a24'}"/>`, mulch.use];
  if (dirty) {
    const bare = cloud({ freq: 0.02, octaves: 3, seed: 3, color: [150, 136, 112], gain: 3.4, cut: -1.5, blend: 'normal', shape: `<path d="${bedPath}"/>` });
    defs.push(bare.def);
    body.push(bare.use);
    defs.push(`<filter id="rough" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="34" xChannelSelector="R" yChannelSelector="G"/></filter>`);
    body.push(`<path d="${bedPath}" fill="none" stroke="#869a48" stroke-width="30" filter="url(#rough)"/>`);
    body.push(weeds(r, 22, [20, 20, 780, 330]));
  } else {
    body.push(`<path d="${bedPath}" fill="none" stroke="#3a2416" stroke-width="9"/>`);
  }
  [[150, 130, 74], [400, 190, 88], [650, 120, 78]].forEach(([x, y, s]) => body.push(shrub(r, x, y, s, dirty)));
  body.push(lightRect);
  return svg(defs, body);
}

// ---------- handyman ----------

function drywall(dirty) {
  const r = rng(81);
  const defs = [
    `<linearGradient id="floor" x1="0" x2="1"><stop offset="0" stop-color="#b98f61"/><stop offset=".5" stop-color="#c79c6c"/><stop offset="1" stop-color="#ad8254"/></linearGradient>`,
  ];
  const body = [`<rect width="${W}" height="${H}" fill="${dirty ? '#d8d0bd' : '#e7ebe2'}"/>`];
  const tex = cloud({ freq: 0.7, octaves: 2, seed: 5, color: [60, 60, 50], gain: 1.2, cut: -0.52, opacity: 0.16 });
  defs.push(tex.def);
  body.push(tex.use);
  if (dirty) {
    const stain = cloud({ freq: 0.006, octaves: 3, seed: 7, color: [150, 118, 70], gain: 3, cut: -1.45, opacity: 0.75 });
    defs.push(stain.def);
    body.push(stain.use);
    // The hole, its torn paper edge and the cracks running from it.
    let hole = '';
    let rim = '';
    const cx = 330;
    const cy = 250;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const d = between(r, 62, 100);
      hole += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * d * 1.25).toFixed(0)} ${(cy + Math.sin(a) * d).toFixed(0)} `;
      rim += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * (d + between(r, 10, 24)) * 1.25).toFixed(0)} ${(cy + Math.sin(a) * (d + between(r, 10, 24))).toFixed(0)} `;
    }
    body.push(`<path d="${rim}Z" fill="#f4efe3"/>`, `<path d="${rim}Z" fill="none" stroke="#b9ae97" stroke-width="2"/>`);
    body.push(`<path d="${hole}Z" fill="#2c2620"/>`, `<path d="${hole}Z" fill="none" stroke="#8d8370" stroke-width="5"/>`);
    body.push(`<rect x="${cx - 16}" y="${cy - 130}" width="26" height="260" fill="#6f5a3c" opacity=".55" clip-path="url(#holeclip)"/>`);
    defs.push(`<clipPath id="holeclip"><path d="${hole}Z"/></clipPath>`);
    [[430, 215, 590, 150, 690, 165], [250, 300, 170, 380, 120, 470], [345, 345, 380, 430, 365, 500]].forEach(([x1, y1, x2, y2, x3, y3]) =>
      body.push(`<path d="M${x1} ${y1} L${x2} ${y2} L${x3} ${y3}" fill="none" stroke="#5c5448" stroke-width="2.5" stroke-linejoin="round"/>`)
    );
    for (let i = 0; i < 5; i++) {
      const x = between(r, 480, 760);
      const y = between(r, 300, 460);
      body.push(`<path d="M${x.toFixed(0)} ${y.toFixed(0)} q40 -8 ${between(r, 60, 120).toFixed(0)} 4" fill="none" stroke="#6b6558" stroke-width="${between(r, 3, 7).toFixed(0)}" opacity=".35" stroke-linecap="round"/>`);
    }
  }
  // Outlet, baseboard and floor.
  body.push(
    `<rect x="610" y="392" width="54" height="84" rx="6" fill="${dirty ? '#e6dfcd' : '#fafaf7'}" stroke="#000" stroke-opacity=".14"/>` +
      `<rect x="630" y="408" width="5" height="14" rx="2" fill="#555"/><rect x="641" y="408" width="5" height="14" rx="2" fill="#555"/>` +
      `<rect x="630" y="446" width="5" height="14" rx="2" fill="#555"/><rect x="641" y="446" width="5" height="14" rx="2" fill="#555"/>`
  );
  body.push(
    `<rect x="0" y="498" width="${W}" height="64" fill="${dirty ? '#e3dccb' : '#fbfbf8'}"/><rect x="0" y="498" width="${W}" height="5" fill="#000" opacity=".14"/>` +
      `<rect x="0" y="514" width="${W}" height="2" fill="#000" opacity=".08"/><rect x="0" y="562" width="${W}" height="38" fill="url(#floor)"/><rect x="0" y="562" width="${W}" height="7" fill="#000" opacity=".3"/>`
  );
  if (dirty) {
    const scuff = cloud({ freq: '0.012 0.09', octaves: 2, seed: 9, color: [96, 88, 72], gain: 2.6, cut: -1.35, y: 498, h: 64, opacity: 0.45, blur: 1.5 });
    defs.push(scuff.def);
    body.push(scuff.use);
  }
  body.push(lightRect);
  return svg(defs, body);
}

function fence(dirty) {
  const r = rng(91);
  const cedar = ['#b9783f', '#c48447', '#b06f38', '#bd7d44', '#c98a4d'];
  const gray = ['#8c8983', '#97948d', '#807d77', '#a09c94', '#8a867e'];
  const defs = [
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd3f2"/><stop offset="1" stop-color="#d9eefb"/></linearGradient>`,
  ];
  const body = [
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
    `<path d="M-20 150 C120 40 220 110 330 70 C470 20 560 120 680 60 C760 30 800 80 830 70 V${H} H-20Z" fill="#3f7d3a"/>`,
    `<path d="M-20 190 C140 110 260 170 400 130 C540 90 640 170 830 120 V${H} H-20Z" fill="#2f6630"/>`,
  ];
  let boards = '';
  for (let i = 0; i < 9; i++) {
    const x = i * 92 - 12;
    if (dirty && i === 5) continue; // missing board
    const color = pick(r, dirty ? gray : cedar);
    const top = 96 + (dirty ? between(r, -6, 10) : 0);
    let shape = `M${x} ${H} V${top + 22} L${x + 18} ${top} H${x + 68} L${x + 86} ${top + 22} V${H}Z`;
    let extra = '';
    if (dirty && i === 2) {
      shape = `M${x} ${H} V330 L${x + 22} 300 L${x + 40} 338 L${x + 62} 296 L${x + 86} 326 V${H}Z`;
    }
    if (dirty && i === 7) extra = ` transform="rotate(5 ${x + 43} ${H})"`;
    boards += `<path d="${shape}" fill="${color}"${extra}/>`;
    if (!(dirty && i === 2)) {
      boards += `<g${extra}><circle cx="${x + 43}" cy="190" r="4" fill="#3a3530" opacity=".6"/><circle cx="${x + 43}" cy="500" r="4" fill="#3a3530" opacity=".6"/></g>`;
    }
  }
  body.push(`<rect x="0" y="118" width="${W}" height="${H}" fill="#1f2a1f" opacity="${dirty ? 0.55 : 0}"/>`, boards);
  const grainLines = cloud({ freq: '0.9 0.012', octaves: 2, seed: 4, color: [40, 22, 8], gain: 1.6, cut: -0.6, opacity: dirty ? 0.5 : 0.35, y: 90, h: H - 90 });
  defs.push(grainLines.def);
  body.push(grainLines.use);
  if (dirty) {
    const mildew = cloud({ freq: '0.02 0.008', octaves: 3, seed: 7, color: [60, 88, 48], gain: 2.6, cut: -1.0, y: 360, h: 240, opacity: 0.8, blur: 2 });
    const weather = cloud({ freq: 0.01, octaves: 3, seed: 2, color: [58, 56, 50], gain: 2.2, cut: -1.0, y: 90, h: 510, opacity: 0.6, blur: 3 });
    defs.push(mildew.def, weather.def);
    body.push(mildew.use, weather.use);
  }
  body.push(`<rect x="0" y="${H - 34}" width="${W}" height="34" fill="${dirty ? '#7f8f48' : '#4d9a3c'}"/>`);
  body.push(lightRect);
  return svg(defs, body);
}

function screen(dirty) {
  const r = rng(101);
  const defs = [
    `<linearGradient id="yardsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0f5"/><stop offset=".55" stop-color="#dff2fb"/><stop offset=".56" stop-color="#5fae4c"/><stop offset="1" stop-color="#3f8a3a"/></linearGradient>`,
    `<filter id="soft"><feGaussianBlur stdDeviation="9"/></filter>`,
    `<pattern id="mesh" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 .5H7M.5 0V7" stroke="#1c1c1c" stroke-width="1.1" opacity="${dirty ? 0.6 : 0.4}"/></pattern>`,
  ];
  const yard =
    `<g filter="url(#soft)"><rect x="-20" y="-20" width="${W + 40}" height="${H + 40}" fill="url(#yardsky)"/>` +
    `<rect x="250" y="120" width="26" height="240" fill="#7a5a3a"/><circle cx="262" cy="110" r="90" fill="#3d8f3f"/>` +
    `<rect x="610" y="170" width="20" height="190" fill="#7a5a3a"/><circle cx="620" cy="150" r="70" fill="#4a9a46"/>` +
    `<rect x="-20" y="300" width="${W + 40}" height="60" fill="#2f7a35"/><rect x="380" y="380" width="300" height="160" rx="60" fill="#49c3df"/></g>`;
  const body = [yard];
  if (dirty) {
    // A long rip in the lower left panel, with the loose flap hanging down.
    let tear = 'M96 318';
    [[230, 300], [330, 340], [400, 430], [380, 520], [300, 556], [170, 548], [104, 470]].forEach(([x, y]) => (tear += ` L${(x + between(r, -8, 8)).toFixed(0)} ${(y + between(r, -8, 8)).toFixed(0)}`));
    tear += 'Z';
    defs.push(`<mask id="torn"><rect width="${W}" height="${H}" fill="#fff"/><path d="${tear}" fill="#000"/></mask>`);
    const dust = cloud({ freq: 0.01, octaves: 3, seed: 5, color: [120, 118, 100], gain: 1.6, cut: -0.35, opacity: 0.75, blur: 4 });
    defs.push(dust.def);
    body.push(`<g mask="url(#torn)"><rect width="${W}" height="${H}" fill="#8b8f83" opacity=".34"/>${dust.use}<rect width="${W}" height="${H}" fill="url(#mesh)"/></g>`);
    body.push(`<path d="${tear}" fill="none" stroke="#0e0e0e" stroke-width="9" opacity=".3"/>`);
    body.push(`<path d="${tear}" fill="none" stroke="#1a1a1a" stroke-width="3" stroke-dasharray="7 3 2 3"/>`);
    const flap = 'M170 548 L300 556 L380 520 L352 590 L214 594 Z';
    body.push(`<path d="${flap}" fill="#5d6258"/><path d="${flap}" fill="url(#mesh)"/><path d="${flap}" fill="url(#mesh)" transform="translate(3 3)"/>`);
  } else {
    body.push(`<rect width="${W}" height="${H}" fill="url(#mesh)"/>`);
  }
  // Aluminum frame.
  const frameShape =
    `<path fill-rule="evenodd" d="M0 0H${W}V${H}H0Z M38 38V${H - 38}H${W - 38}V38Z"/>` +
    `<rect x="452" y="38" width="24" height="${H - 76}"/><rect x="38" y="262" width="${W - 76}" height="22"/>`;
  body.push(`<g fill="${dirty ? '#5b5348' : '#3b3026'}">${frameShape}</g>`);
  body.push(`<path fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="3" d="M36 36H${W - 36}V${H - 36}H36Z"/>`);
  if (dirty) {
    const chalk = cloud({ freq: 0.03, octaves: 2, seed: 8, color: [206, 200, 186], gain: 2.4, cut: -1.05, blend: 'normal', opacity: 0.55, blur: 2, shape: frameShape });
    defs.push(chalk.def);
    body.push(chalk.use);
  }
  body.push(lightRect);
  return svg(defs, body);
}

// ---------- mobile detailing ----------

function exterior(dirty) {
  const paint = dirty ? '#3a5677' : '#1d4f91';
  const defs = [
    `<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1e7d6"/><stop offset="1" stop-color="#e2d5bf"/></linearGradient>`,
    `<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${dirty ? 0.05 : 0.5}"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>`,
    `<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dirty ? '#8b979c' : '#cfeaf7'}"/><stop offset="1" stop-color="${dirty ? '#5d696e' : '#4b7f9c'}"/></linearGradient>`,
    `<radialGradient id="rim"><stop offset="0" stop-color="${dirty ? '#8a8072' : '#f4f6f7'}"/><stop offset="1" stop-color="${dirty ? '#5f574c' : '#a9b2b8'}"/></radialGradient>`,
  ];
  const car = `M92 446 V386 Q96 346 132 336 L214 322 Q272 252 348 244 H470 Q544 250 594 316 L694 336 Q734 346 738 388 V446 Z`;
  const body = [
    `<rect width="${W}" height="${H}" fill="url(#wall)"/>`,
    `<rect x="60" y="60" width="300" height="300" fill="#fbf7ee" stroke="#cbbfa8" stroke-width="6"/>` +
      [110, 160, 210, 260, 310].map((y) => `<rect x="66" y="${y}" width="288" height="3" fill="#cbbfa8"/>`).join(''),
    `<path d="M430 360 C470 250 560 240 600 300 C650 230 760 260 780 360Z" fill="#3f8a3f"/>`,
    `<rect x="0" y="360" width="${W}" height="${H - 360}" fill="${dirty ? '#bdb7ab' : '#d3cfc6'}"/><rect x="0" y="360" width="${W}" height="8" fill="#000" opacity=".12"/>`,
    `<ellipse cx="415" cy="474" rx="350" ry="26" fill="#000" opacity=".3"/>`,
    `<path d="${car}" fill="${paint}"/>`,
    `<path d="${car}" fill="url(#body)"/>`,
    `<path d="M256 318 Q296 266 352 260 H464 Q520 264 566 318 Z" fill="url(#glass)"/>`,
    `<rect x="404" y="258" width="10" height="62" fill="${paint}"/>`,
    `<path d="M414 320 V430 M250 322 V430 M590 320 V430" stroke="#000" stroke-opacity=".3" stroke-width="2.5" fill="none"/>`,
    `<rect x="440" y="344" width="46" height="9" rx="4" fill="#000" opacity=".35"/><rect x="286" y="344" width="46" height="9" rx="4" fill="#000" opacity=".35"/>`,
    `<path d="M700 346 q30 6 34 34 h-30z" fill="${dirty ? '#c9c2a8' : '#fdf6d8'}"/><path d="M96 352 q4 -10 26 -12 v34 h-26z" fill="${dirty ? '#7d3b34' : '#d9352b'}"/>`,
  ];
  if (!dirty) {
    body.push(`<path d="M140 350 L690 350" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>`);
    body.push(`<path d="M300 268 L352 262 L330 316 L282 316Z" fill="#fff" opacity=".35"/>`);
  }
  [214, 612].forEach((x) => {
    body.push(
      `<circle cx="${x}" cy="446" r="66" fill="#15171a"/><circle cx="${x}" cy="446" r="57" fill="${dirty ? '#3b3832' : '#1b1d20'}"/>` +
        `<circle cx="${x}" cy="446" r="38" fill="url(#rim)"/>` +
        [0, 72, 144, 216, 288].map((a) => `<rect x="${x - 5}" y="${446 - 36}" width="10" height="34" rx="4" fill="${dirty ? '#544c41' : '#7f8a91'}" transform="rotate(${a} ${x} 446)"/>`).join('') +
        `<circle cx="${x}" cy="446" r="9" fill="${dirty ? '#4a443a' : '#d9dee1'}"/>`
    );
  });
  if (dirty) {
    defs.push(`<clipPath id="carclip"><path d="${car}"/></clipPath>`);
    defs.push(`<linearGradient id="mud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a6444" stop-opacity="0"/><stop offset=".55" stop-color="#7a6444" stop-opacity=".25"/><stop offset="1" stop-color="#6b5637" stop-opacity=".9"/></linearGradient>`);
    const dust = cloud({ freq: 0.009, octaves: 3, seed: 6, color: [176, 162, 132], gain: 1.5, cut: -0.3, blend: 'normal', opacity: 0.7, blur: 5 });
    const spatter = cloud({ freq: '0.035 0.06', octaves: 3, seed: 3, color: [98, 80, 52], gain: 3.2, cut: -1.55, blend: 'normal', y: 372, h: 84, blur: 1 });
    defs.push(dust.def, spatter.def);
    body.push(`<g clip-path="url(#carclip)"><rect x="80" y="240" width="680" height="210" fill="url(#mud)"/>${dust.use}${spatter.use}</g>`);
  }
  body.push(lightRect);
  return svg(defs, body);
}

function wheel(dirty) {
  const defs = [
    `<radialGradient id="alloy" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${dirty ? '#9a8f7d' : '#ffffff'}"/><stop offset="1" stop-color="${dirty ? '#5c5346' : '#9aa5ad'}"/></radialGradient>`,
    `<radialGradient id="tire" cx=".5" cy=".5" r=".5"><stop offset=".62" stop-color="${dirty ? '#3a352e' : '#101214'}"/><stop offset=".9" stop-color="${dirty ? '#4a443a' : '#23272b'}"/><stop offset="1" stop-color="${dirty ? '#39342c' : '#0c0d0f'}"/></radialGradient>`,
  ];
  const cx = 400;
  const cy = 320;
  let spokes = '';
  for (let k = 0; k < 5; k++) {
    spokes += `<path d="M-30 -40 L-20 -208 H20 L30 -40Z" fill="url(#alloy)" stroke="#000" stroke-opacity=".25" stroke-width="2" transform="translate(${cx} ${cy}) rotate(${k * 72})"/>`;
  }
  let lugs = '';
  for (let k = 0; k < 5; k++) lugs += `<circle cx="0" cy="-30" r="7" fill="${dirty ? '#3f3a32' : '#6c757c'}" transform="translate(${cx} ${cy}) rotate(${k * 72 + 36})"/>`;
  const body = [
    `<rect width="${W}" height="${H}" fill="${dirty ? '#3f5878' : '#1d4f91'}"/>`,
    `<path d="M-20 ${H} V420 C60 80 740 80 820 420 V${H}Z" fill="#0b0c0d"/>`,
    `<circle cx="${cx}" cy="${cy}" r="330" fill="url(#tire)"/>`,
    `<circle cx="${cx}" cy="${cy}" r="300" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="5"/>`,
    `<circle cx="${cx}" cy="${cy}" r="262" fill="none" stroke="${dirty ? '#5a5346' : '#2f3438'}" stroke-width="3"/>`,
    `<circle cx="${cx}" cy="${cy}" r="226" fill="${dirty ? '#4c453a' : '#3b4146'}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="170" fill="${dirty ? '#5b5142' : '#8c949a'}"/><circle cx="${cx}" cy="${cy}" r="150" fill="${dirty ? '#4a4236' : '#6d757b'}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="218" fill="none" stroke="url(#alloy)" stroke-width="20"/>`,
    spokes,
    `<circle cx="${cx}" cy="${cy}" r="58" fill="url(#alloy)" stroke="#000" stroke-opacity=".25" stroke-width="2"/>`,
    lugs,
    `<circle cx="${cx}" cy="${cy}" r="20" fill="${dirty ? '#4a443a' : '#2b3035'}"/>`,
  ];
  if (dirty) {
    const brake = cloud({ freq: 0.012, octaves: 3, seed: 5, color: [74, 56, 34], gain: 1.6, cut: -0.25, opacity: 0.8, blur: 4, shape: `<circle cx="${cx}" cy="${cy}" r="232"/>` });
    const mud = cloud({ freq: 0.02, octaves: 3, seed: 9, color: [150, 130, 96], gain: 2.6, cut: -1.25, blend: 'normal', opacity: 0.7, blur: 2, shape: `<path fill-rule="evenodd" d="M${cx - 330} ${cy} a330 330 0 1 0 660 0 a330 330 0 1 0 -660 0Z M${cx - 226} ${cy} a226 226 0 1 0 452 0 a226 226 0 1 0 -452 0Z"/>` });
    defs.push(brake.def, mud.def);
    body.push(brake.use, mud.use);
  } else {
    body.push(`<path d="M150 190 A300 300 0 0 1 560 60" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="26" stroke-linecap="round"/>`);
  }
  body.push(lightRect);
  return svg(defs, body);
}

function headlight(dirty) {
  const defs = [
    `<linearGradient id="hood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dirty ? '#4a6584' : '#2c66ad'}"/><stop offset="1" stop-color="${dirty ? '#33485f' : '#143c72'}"/></linearGradient>`,
    `<radialGradient id="proj" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#cfe6f5"/><stop offset="1" stop-color="#5f7f96"/></radialGradient>`,
    `<linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eef1"/><stop offset=".5" stop-color="#8d989f"/><stop offset="1" stop-color="#d5dce0"/></linearGradient>`,
  ];
  const lens = `M120 250 C200 150 520 120 700 190 C720 300 620 430 430 440 C260 448 140 380 120 250Z`;
  defs.push(`<clipPath id="lensclip"><path d="${lens}"/></clipPath>`);
  const body = [
    `<rect width="${W}" height="${H}" fill="url(#hood)"/>`,
    `<path d="M-20 120 C200 40 560 30 830 110" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="5"/>`,
    `<path d="M-20 500 C240 560 560 560 830 480 V${H} H-20Z" fill="#0f1114"/>`,
    `<path d="${lens}" fill="#1c2227"/>`,
    `<g clip-path="url(#lensclip)"><path d="M120 250 C260 190 520 170 700 190 L700 230 C520 215 280 235 130 300Z" fill="url(#chrome)"/>` +
      `<circle cx="300" cy="320" r="78" fill="#0d1013"/><circle cx="300" cy="320" r="64" fill="url(#proj)"/>` +
      `<circle cx="500" cy="310" r="62" fill="#0d1013"/><circle cx="500" cy="310" r="50" fill="url(#proj)"/>` +
      `<path d="M610 250 L690 220 L672 330 L600 370Z" fill="#f4a11a"/></g>`,
  ];
  if (dirty) {
    const haze = cloud({ freq: 0.01, octaves: 3, seed: 4, color: [224, 206, 140], gain: 1.4, cut: 0.05, blend: 'normal', opacity: 0.8, blur: 4, shape: `<path d="${lens}"/>` });
    const pits = cloud({ freq: 0.5, octaves: 2, seed: 8, color: [250, 244, 214], gain: 3, cut: -1.6, blend: 'normal', opacity: 0.45, shape: `<path d="${lens}"/>` });
    const film = cloud({ freq: 0.008, octaves: 3, seed: 2, color: [176, 164, 136], gain: 1.5, cut: -0.4, blend: 'normal', opacity: 0.45, blur: 6 });
    defs.push(haze.def, pits.def, film.def);
    body.push(`<path d="${lens}" fill="#d9c98a" opacity=".5"/>`, haze.use, pits.use, film.use);
  } else {
    body.push(`<path d="M190 215 C300 165 470 150 610 172 L600 200 C470 182 320 196 215 240Z" fill="#fff" opacity=".5"/>`);
    body.push(`<path d="M-20 150 C220 70 560 60 830 140" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="10"/>`);
  }
  body.push(`<path d="${lens}" fill="none" stroke="#0c0e10" stroke-width="7"/>`);
  body.push(lightRect);
  return svg(defs, body);
}

// ---------- run ----------

const SETS = {
  'pressure-washing': { driveway, roof, 'pool-deck': poolDeck },
  'pool-care': { 'green-pool': greenPool, waterline, steps },
  'lawn-care': { lawn, edging, beds },
  handyman: { drywall, fence, screen },
  'mobile-detailing': { exterior, wheel, headlight },
};

(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const [trade, scenes] of Object.entries(SETS)) {
    if (only && only !== trade) continue;
    fs.mkdirSync(path.join(OUT, trade), { recursive: true });
    for (const [name, draw] of Object.entries(scenes)) {
      for (const state of ['before', 'after']) {
        ids = 0;
        const markup = draw(state === 'before');
        await page.setContent(`<!doctype html><body style="margin:0;background:#fff">${markup}</body>`);
        const png = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
        const file = path.join(OUT, trade, `${name}-${state}.webp`);
        await sharp(png).webp({ quality: 72 }).toFile(file);
        console.log(`${trade}/${name}-${state}.webp  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
      }
    }
  }
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
