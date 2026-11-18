#!/usr/bin/env node
// Builds the site into dist/. Plain Node, no packages to install.
//
//   node build.js              every business in businesses/, each at /<file-name>/
//   SITE=<file-name> node build.js   one business at the root (for a client's own domain)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderPage, renderPlain } = require('./template/page.js');
const { renderMap, nearbyTowns } = require('./template/map.js');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const warnings = [];

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  } catch (err) {
    throw new Error(`${file} is not valid JSON: ${err.message}`);
  }
};

// ---------- colors ----------

const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(hex).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (ch) => ch + ch);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function palette(brand, accent) {
  const ink = mix(brand, '#05080a', 0.78);
  const onColor = (bg) => (contrast('#ffffff', bg) >= contrast(ink, bg) ? '#ffffff' : ink);
  const wash = mix(brand, '#ffffff', 0.93);
  // Darken the footer color and the gray text until both read clearly, whatever the brand color is.
  let deep = 0.42;
  while (deep < 0.95 && contrast('#ffffff', mix(brand, '#05080a', deep)) < 7) deep += 0.06;
  const brandDeep = mix(brand, '#05080a', deep);
  let fade = 0.32;
  while (fade > 0 && contrast(mix(ink, '#ffffff', fade), wash) < 5) fade -= 0.04;
  return {
    brand,
    brandInk: onColor(brand),
    brandDeep,
    accent,
    accentInk: onColor(accent),
    // The big phone number sits on the brand color; use the accent when it is readable there.
    phone: contrast(accent, brand) >= 3 ? accent : onColor(brand),
    ink,
    muted: mix(ink, '#ffffff', Math.max(fade, 0)),
    wash,
    rule: mix(brand, '#ffffff', 0.78),
    link: contrast(brand, '#ffffff') >= 4.5 ? brand : ink,
  };
}

// ---------- business data ----------

const TRADE_ALIASES = {
  lawn: 'lawn-care',
  landscaping: 'lawn-care',
  pool: 'pool-care',
  pools: 'pool-care',
  detailing: 'mobile-detailing',
  'power-washing': 'pressure-washing',
};

function phoneParts(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
  if (digits.length !== 10) return undefined;
  return {
    tel: `+1${digits}`,
    display: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
  };
}

function findPhoto(dir, base) {
  for (const ext of ['webp', 'jpg', 'jpeg', 'png']) {
    const rel = `${dir}/${base}.${ext}`;
    if (fs.existsSync(path.join(ROOT, rel))) return rel;
  }
  return null;
}

function prepare(slug, raw, trades, areas, settings, assets) {
  const fail = (msg) => {
    throw new Error(`businesses/${slug}.json: ${msg}`);
  };
  const warn = (msg) => warnings.push(`${slug}: ${msg}`);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail('file name must be lowercase letters, numbers and dashes');
  for (const key of ['name', 'trade', 'town']) {
    if (!raw[key] || typeof raw[key] !== 'string') fail(`"${key}" is missing`);
  }

  const status = raw.status || 'preview';
  if (!['demo', 'preview', 'live'].includes(status)) fail('"status" must be demo, preview or live');

  let tradeKey = raw.trade.trim().toLowerCase().replace(/\s+/g, '-');
  tradeKey = TRADE_ALIASES[tradeKey] || tradeKey;
  const trade = trades[tradeKey];
  if (!trade) fail(`unknown trade "${raw.trade}". Use one of: ${Object.keys(trades).join(', ')}`);

  const phone = phoneParts(raw.phone);
  if (phone === undefined) fail(`"phone" should be a 10-digit US number, got "${raw.phone}"`);
  if (!phone) warn('no phone number, so the call buttons are left off');

  // Services: plain names, or { name, note }. Notes fall back to the trade's wording.
  const notes = Object.fromEntries(Object.entries(trade.services).map(([k, v]) => [k.toLowerCase(), v]));
  const listed = Array.isArray(raw.services) && raw.services.length ? raw.services : Object.keys(trade.services).slice(0, 6);
  const services = listed.map((s) => {
    const name = typeof s === 'string' ? s : s.name;
    if (!name) fail('every service needs a name');
    const note = (typeof s === 'object' && s.note) || notes[name.toLowerCase()] || '';
    return { name, note };
  });

  // Reviews: a real count and rating, plus optional quotes. Sample quotes never go live.
  let reviews = null;
  if (raw.reviews) {
    const r = raw.reviews;
    reviews = {
      count: Number(r.count) || 0,
      rating: r.rating ? Number(r.rating) : 0,
      source: r.source || 'Google',
      url: r.url || '',
      sample: Boolean(r.sample),
      quotes: Array.isArray(r.quotes) ? r.quotes.filter((q) => q && q.text) : [],
    };
    if (reviews.rating && (reviews.rating < 1 || reviews.rating > 5)) fail('"reviews.rating" must be between 1 and 5');
    if (status === 'live' && reviews.sample) fail('sample reviews cannot be published. Remove them or replace them with real ones before going live');
    if (status === 'preview' && reviews.sample) fail('sample reviews are only for demo pages. A real business shows its real review count and real quotes');
  }

  const colors = { ...trade.colors, ...(raw.colors || {}) };
  for (const key of ['brand', 'accent']) {
    if (!hexToRgb(colors[key])) fail(`"colors.${key}" should be a hex color like #0f5c7a`);
  }

  // Photos: the business's own before/after pairs if it has them, otherwise the trade's sample set.
  let gallery = [];
  if (Array.isArray(raw.gallery) && raw.gallery.length) {
    gallery = raw.gallery.map((g) => {
      const dir = `photos/businesses/${slug}`;
      for (const key of ['before', 'after']) {
        if (!g[key] || !fs.existsSync(path.join(ROOT, dir, g[key]))) fail(`gallery photo "${g[key]}" was not found in ${dir}/`);
      }
      return { before: `/${dir}/${g.before}`, after: `/${dir}/${g.after}`, caption: g.caption || trade.label, sample: false };
    });
  } else if (status === 'live') {
    warn('live page has no photos of its own, so the before and after gallery is left off');
  } else {
    for (const item of trade.gallery) {
      const dir = `photos/trades/${tradeKey}`;
      const before = findPhoto(dir, `${item.photo}-before`);
      const after = findPhoto(dir, `${item.photo}-after`);
      if (before && after) gallery.push({ before: `/${before}`, after: `/${after}`, caption: item.caption, sample: true });
      else warn(`sample photo pair "${item.photo}" is missing from ${dir}/`);
    }
  }

  const state = raw.state || settings.state || 'FL';
  const serviceArea = Array.isArray(raw.serviceArea) && raw.serviceArea.length ? raw.serviceArea : nearbyTowns(areas, raw.town);
  if (!serviceArea.includes(raw.town)) serviceArea.unshift(raw.town);

  const endpoint = (raw.form && raw.form.endpoint) || '';
  let formMode = 'preview';
  if (status === 'live') formMode = endpoint ? 'post' : phone ? 'sms' : 'none';
  if (formMode === 'none') fail('a live page needs a phone number or a form endpoint so quote requests have somewhere to go');

  const multi = !process.env.SITE;
  const pagePath = multi ? `/${slug}/` : '/';
  const base = (settings.baseUrl || '').replace(/\/+$/, '');

  return {
    slug,
    status,
    name: raw.name.trim(),
    town: raw.town.trim(),
    state,
    tradeKey,
    trade,
    phone,
    services,
    reviews,
    badges: Array.isArray(raw.badges) ? raw.badges : [],
    since: raw.since || '',
    hours: raw.hours || '',
    email: raw.email || '',
    tagline: raw.tagline || '',
    lede: raw.lede || trade.lede,
    freeQuotes: Boolean(raw.freeQuotes),
    serviceArea,
    mapSvg: renderMap(areas, serviceArea, raw.town),
    gallery,
    colors: palette(colors.brand, colors.accent),
    form: { mode: formMode, endpoint },
    assets,
    url: base ? base + pagePath : '',
    year: new Date().getFullYear(),
    previewContact: settings.previewContact || '',
    pagePath,
  };
}

// ---------- build ----------

function copy(rel, to) {
  const dest = path.join(OUT, to || rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(ROOT, rel), dest);
}

function versioned(rel, to) {
  const hash = crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 8);
  copy(rel, to);
  return `/${to}?v=${hash}`;
}

function main() {
  const settings = readJson('settings.json');
  const areas = readJson('template/areas.json');
  const trades = {};
  for (const file of fs.readdirSync(path.join(ROOT, 'trades'))) {
    if (file.endsWith('.json')) trades[file.replace(/\.json$/, '')] = readJson(`trades/${file}`);
  }

  let slugs = fs
    .readdirSync(path.join(ROOT, 'businesses'))
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  const single = process.env.SITE;
  if (single) {
    if (!slugs.includes(single)) throw new Error(`SITE=${single}, but businesses/${single}.json does not exist`);
    slugs = [single];
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const assets = {
    css: versioned('template/site.css', 'assets/site.css'),
    js: versioned('template/site.js', 'assets/site.js'),
  };
  for (const file of fs.readdirSync(path.join(ROOT, 'template/fonts'))) copy(`template/fonts/${file}`, `assets/fonts/${file}`);

  const built = [];
  for (const slug of slugs) {
    const page = prepare(slug, readJson(`businesses/${slug}.json`), trades, areas, settings, assets);
    const file = path.join(OUT, page.pagePath, 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, renderPage(page));
    for (const g of page.gallery) {
      copy(g.before.slice(1));
      copy(g.after.slice(1));
    }
    built.push(page);
  }

  // Housekeeping pages. A 404 page also stops Cloudflare from treating the site as a single-page app.
  fs.writeFileSync(path.join(OUT, '404.html'), renderPlain('Page not found', 'Check the link and try again.'));
  if (!single) {
    fs.writeFileSync(path.join(OUT, 'index.html'), renderPlain('Website previews', 'Each preview has its own link.'));
  }

  // Previews stay out of search engines; a single live site is allowed in.
  const indexable = single && built[0].status === 'live';
  fs.writeFileSync(
    path.join(OUT, '_headers'),
    [
      '/*',
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: strict-origin-when-cross-origin',
      ...(indexable ? [] : ['  X-Robots-Tag: noindex']),
      '/assets/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '/photos/*',
      '  Cache-Control: public, max-age=86400',
      '',
    ].join('\n')
  );

  for (const page of built) console.log(`built  ${page.pagePath.padEnd(34)} ${page.status.padEnd(8)} ${page.name}`);
  for (const w of warnings) console.log(`note   ${w}`);
  console.log(`${built.length} page${built.length === 1 ? '' : 's'} in dist/`);
}

try {
  main();
} catch (err) {
  console.error(`Build stopped: ${err.message}`);
  process.exit(1);
}
