// Turns one business (already checked and filled in by build.js) into a full HTML page.

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

let uid = 0;

function stars(rating, cls) {
  const id = `st${++uid}`;
  const width = (Math.max(0, Math.min(5, rating)) * 24).toFixed(1);
  const five = [0, 1, 2, 3, 4]
    .map(
      (i) =>
        `<path transform="translate(${i * 24} 0)" d="M12 1.6l3.1 6.5 7.1.9-5.2 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.8 9l7.1-.9z"/>`
    )
    .join('');
  return (
    `<svg class="stars ${cls || ''}" viewBox="0 0 120 22" width="120" height="22" aria-hidden="true">` +
    `<defs><clipPath id="${id}"><rect width="${width}" height="22"/></clipPath></defs>` +
    `<g class="stars-off">${five}</g><g class="stars-on" clip-path="url(#${id})">${five}</g></svg>`
  );
}

function beforeAfter(item, opts) {
  const hero = opts && opts.hero;
  const load = hero ? 'eager' : 'lazy';
  const caption = esc(item.caption);
  return `
<figure class="ba${hero ? ' ba-hero' : ''}">
  <div class="ba-stage" style="--pos:50%">
    <img class="ba-img" src="${esc(item.after)}" alt="After: ${caption}" width="800" height="600" loading="${load}" decoding="async"${hero ? ' fetchpriority="high"' : ''}>
    <div class="ba-clip"><img class="ba-img" src="${esc(item.before)}" alt="Before: ${caption}" width="800" height="600" loading="${load}" decoding="async"></div>
    <span class="ba-tag ba-tag-before">Before</span>
    <span class="ba-tag ba-tag-after">After</span>
    <span class="ba-handle" aria-hidden="true"><span class="ba-knob"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 6l-5 6 5 6M15 6l5 6-5 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span>
    <input class="ba-range" type="range" min="0" max="100" value="50" aria-label="Compare before and after: ${caption}">
  </div>
  <figcaption class="ba-caption">${caption}${item.sample ? ' <span class="sample-tag">Sample photo</span>' : ''}</figcaption>
</figure>`;
}

function ribbon(c) {
  const contact = c.previewContact ? ` ${esc(c.previewContact)}` : '';
  if (c.status === 'demo') {
    return `<p class="ribbon">Demo site. ${esc(c.name)} is a made-up business, and the photos and reviews are samples.${contact}</p>`;
  }
  if (c.status === 'preview') {
    return `<p class="ribbon">Preview for ${esc(c.name)}. This page is not published yet, and the photos are samples.${contact}</p>`;
  }
  return '';
}

function hero(c) {
  const quoteCta = c.freeQuotes ? 'Get a free quote' : 'Get a quote';
  let phone = '';
  if (c.phone) {
    phone =
      `<a class="hero-phone" href="tel:${c.phone.tel}"><span class="vh">Call </span>${esc(c.phone.display)}</a>` +
      `<p class="hero-note">${c.freeQuotes ? 'Call or text for a free quote.' : 'Call or text for a quote.'}</p>`;
  } else if (c.status !== 'live') {
    phone =
      `<p class="hero-phone hero-phone-blank">Your number here</p>` +
      `<p class="hero-note">The call buttons dial your phone once the number is added.</p>`;
  }

  let rating = '';
  if (c.reviews && c.reviews.count) {
    const r = c.reviews;
    const text = r.rating
      ? `${r.rating.toFixed(1)} from ${r.count} ${esc(r.source)} review${r.count === 1 ? '' : 's'}`
      : `${r.count} ${esc(r.source)} review${r.count === 1 ? '' : 's'}`;
    rating = `<a class="hero-rating" href="#reviews">${r.rating ? stars(r.rating, 'stars-hero') : ''}<span>${text}</span></a>`;
  }

  const facts = [];
  if (c.since) facts.push(`Serving ${esc(c.town)} since ${esc(c.since)}`);
  c.badges.forEach((b) => facts.push(esc(b)));
  const factList = facts.length
    ? `<ul class="hero-facts">${facts.map((f) => `<li>${f}</li>`).join('')}</ul>`
    : '';

  const first = c.gallery[0];
  return `
<header class="hero${first ? '' : ' hero-plain'}">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <h1 class="hero-name">${esc(c.name)}</h1>
      <p class="hero-what">${esc(c.trade.label)} in ${esc(c.town)}</p>
      <p class="hero-lede">${esc(c.lede)}</p>
      ${phone}
      <p class="hero-actions"><a class="btn btn-accent" href="#quote">${quoteCta}</a></p>
      ${rating}
      ${factList}
    </div>
    ${first ? beforeAfter(first, { hero: true }) : ''}
  </div>
</header>`;
}

function services(c) {
  if (!c.services.length) return '';
  const rows = c.services
    .map(
      (s) =>
        `<li class="svc"><h3 class="svc-name">${esc(s.name)}</h3>${s.note ? `<p class="svc-note">${esc(s.note)}</p>` : ''}</li>`
    )
    .join('\n      ');
  return `
<section class="band" id="services">
  <div class="wrap">
    <h2>${esc(c.trade.servicesHeading)}</h2>
    <ul class="svc-list">
      ${rows}
    </ul>
  </div>
</section>`;
}

function gallery(c) {
  const rest = c.gallery.slice(1);
  if (!rest.length) return '';
  const sample = rest.some((g) => g.sample);
  return `
<section class="band band-wash" id="work">
  <div class="wrap">
    <h2>Before and after</h2>
    <p class="band-intro">Drag the handle to compare.${sample ? ' These are sample photos. Photos of your own jobs go here.' : ''}</p>
    <div class="ba-grid">${rest.map((g) => beforeAfter(g)).join('')}
    </div>
  </div>
</section>`;
}

function reviews(c) {
  const r = c.reviews;
  if (!r || (!r.count && !r.quotes.length)) return '';
  let summary = '';
  if (r.count) {
    summary = `
    <div class="rating">
      ${r.rating ? `<p class="rating-score"><span class="rating-num">${r.rating.toFixed(1)}</span> out of 5</p>${stars(r.rating, 'stars-big')}` : ''}
      <p class="rating-count">${r.rating ? 'From' : ''} ${r.count} review${r.count === 1 ? '' : 's'} on ${esc(r.source)}.</p>
      ${r.url ? `<p><a class="btn btn-line" href="${esc(r.url)}" rel="noopener">Read them on ${esc(r.source)}</a></p>` : ''}
    </div>`;
  }
  const quotes = r.quotes.length
    ? `
    <div class="quotes">${r.quotes
      .map(
        (q) => `
      <figure class="quote">
        <blockquote><p>${esc(q.text)}</p></blockquote>
        <figcaption>${esc(q.name)}${r.sample ? ' <span class="sample-tag">Sample review</span>' : ''}</figcaption>
      </figure>`
      )
      .join('')}
    </div>`
    : '';
  return `
<section class="band" id="reviews">
  <div class="wrap">
    <h2>Reviews</h2>
    <div class="reviews-grid${summary && quotes ? '' : ' reviews-grid-solo'}">${summary}${quotes}
    </div>
  </div>
</section>`;
}

function area(c) {
  const towns = c.serviceArea.map((t) => `<li>${esc(t)}</li>`).join('');
  const ask = c.phone
    ? `Not on the list? Call <a href="tel:${c.phone.tel}">${esc(c.phone.display)}</a> and ask.`
    : 'Not on the list? Send a quote request and ask.';
  return `
<section class="band band-wash" id="area">
  <div class="wrap area-grid${c.mapSvg ? '' : ' area-nomap'}">
    <div class="area-copy">
      <h2>Where we work</h2>
      <p class="band-intro">Based in ${esc(c.town)}${c.serviceArea.length > 1 ? ' and working in the towns around it' : ''}.</p>
      <ul class="towns">${towns}</ul>
      <p class="area-ask">${ask}</p>
    </div>
    ${c.mapSvg ? `<div class="map">${c.mapSvg}</div>` : ''}
  </div>
</section>`;
}

function quoteForm(c) {
  const title = c.freeQuotes ? 'Get a free quote' : 'Get a quote';
  const options = c.services
    .map((s) => `<option>${esc(s.name)}</option>`)
    .concat('<option>Something else</option>')
    .join('');
  const submit = c.form.mode === 'sms' ? 'Text this request' : 'Send request';
  const call = c.phone
    ? `<p class="quote-call">Rather talk it through? <a href="tel:${c.phone.tel}">Call ${esc(c.phone.display)}</a></p>`
    : '';
  return `
<section class="band band-brand" id="quote">
  <div class="wrap quote-grid">
    <div class="quote-copy">
      <h2>${title}</h2>
      <p class="band-intro">Tell us what you need and ${esc(c.name)} will call or text you back with a price.</p>
      ${call}
    </div>
    <form class="sheet" data-mode="${c.form.mode}" data-business="${esc(c.name)}"${c.form.endpoint ? ` data-endpoint="${esc(c.form.endpoint)}"` : ''}${c.phone ? ` data-sms="${c.phone.tel}" data-phone="${esc(c.phone.display)}"` : ''} novalidate>
      <p class="field">
        <label for="q-name">Your name</label>
        <input id="q-name" name="name" type="text" autocomplete="name" required>
      </p>
      <p class="field">
        <label for="q-phone">Phone number</label>
        <input id="q-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required>
      </p>
      <p class="field">
        <label for="q-address">Address or neighborhood <span class="optional">optional</span></label>
        <input id="q-address" name="address" type="text" autocomplete="street-address">
      </p>
      <p class="field field-select">
        <label for="q-service">${esc(c.trade.formPrompt)}</label>
        <select id="q-service" name="service">${options}</select>
      </p>
      <p class="field">
        <label for="q-details">Anything we should know? <span class="optional">optional</span></label>
        <textarea id="q-details" name="details" rows="3"></textarea>
      </p>
      <p class="trap" aria-hidden="true"><label for="q-company">Company</label><input id="q-company" name="company" type="text" tabindex="-1" autocomplete="off"></p>
      <button class="btn btn-accent btn-wide" type="submit">${submit}</button>
      <p class="form-status" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>`;
}

function footer(c) {
  const lines = [`${esc(c.trade.label)} in ${esc(c.town)}, ${esc(c.state)}`];
  if (c.phone) lines.push(`<a href="tel:${c.phone.tel}">${esc(c.phone.display)}</a>`);
  if (c.email) lines.push(`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`);
  if (c.hours) lines.push(esc(c.hours));
  c.badges.forEach((b) => lines.push(esc(b)));
  return `
<footer class="foot">
  <div class="wrap">
    <p class="foot-name">${esc(c.name)}</p>
    <ul class="foot-lines">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    <p class="foot-legal">&copy; ${c.year} ${esc(c.name)}</p>
  </div>
</footer>`;
}

function callbar(c) {
  const quote = c.freeQuotes ? 'Free quote' : 'Get a quote';
  const call = c.phone ? `<a class="btn btn-brand" href="tel:${c.phone.tel}">Call</a>` : '';
  return `
<nav class="callbar${c.phone ? '' : ' callbar-one'}" aria-label="Contact" hidden>
  ${call}<a class="btn btn-accent" href="#quote">${quote}</a>
</nav>`;
}

function head(c) {
  const title = `${c.name} | ${c.trade.label} in ${c.town}, ${c.state}`;
  const desc = c.tagline || `${c.trade.label} in ${c.town}, ${c.state}. ${c.lede}`;
  const initials = c.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const icon =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='${c.colors.brand}'/>` +
    `<text x='32' y='43' font-family='Arial,sans-serif' font-weight='700' font-size='28' text-anchor='middle' fill='${c.colors.brandInk}'>${esc(initials)}</text></svg>`;
  const k = c.colors;
  const vars = [
    ['brand', k.brand], ['brand-ink', k.brandInk], ['brand-deep', k.brandDeep],
    ['accent', k.accent], ['accent-ink', k.accentInk], ['phone', k.phone],
    ['ink', k.ink], ['muted', k.muted], ['wash', k.wash], ['rule', k.rule], ['link', k.link],
  ]
    .map(([n, v]) => `--${n}:${v}`)
    .join(';');
  const ld =
    c.status === 'live'
      ? `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: c.name,
          telephone: c.phone ? c.phone.tel : undefined,
          url: c.url || undefined,
          address: { '@type': 'PostalAddress', addressLocality: c.town, addressRegion: c.state },
          areaServed: c.serviceArea,
        }).replace(/</g, '\\u003c')}</script>`
      : '';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${c.status === 'live' ? '' : '<meta name="robots" content="noindex, nofollow">\n'}<meta name="theme-color" content="${k.brand}">
<meta name="format-detection" content="telephone=no">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${c.url ? `<meta property="og:url" content="${esc(c.url)}">\n` : ''}<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}">
<link rel="preload" href="/assets/fonts/barlow-condensed-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${c.assets.css}">
<style>:root{${vars}}</style>
${ld}`;
}

function renderPage(c) {
  uid = 0;
  return `<!doctype html>
<html lang="en">
<head>
${head(c)}
</head>
<body>
${ribbon(c)}
${hero(c)}
<main>
${services(c)}
${gallery(c)}
${reviews(c)}
${area(c)}
${quoteForm(c)}
</main>
${footer(c)}
${callbar(c)}
<script src="${c.assets.js}" defer></script>
</body>
</html>
`;
}

function renderPlain(title, message) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:1.0625rem/1.5 system-ui,sans-serif;color:#1d2a30;background:#f4f7f8;padding:1.5rem}main{max-width:28rem}h1{font-size:1.5rem;margin:0 0 .5rem}p{margin:0}</style>
</head>
<body>
<main>
<h1>${esc(title)}</h1>
<p>${esc(message)}</p>
</main>
</body>
</html>
`;
}

module.exports = { renderPage, renderPlain };
