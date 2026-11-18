// Draws the small Southwest Florida service-area map as inline SVG.
// Returns '' when none of the service towns are on the map.

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderMap(areas, serviceTowns, homeTown) {
  const known = serviceTowns.filter((t) => areas.towns[t]);
  if (!known.length) return '';

  const { north, south, west, east } = areas.bounds;
  const scale = 350;
  const squash = Math.cos((((north + south) / 2) * Math.PI) / 180);
  const W = Math.round((east - west) * squash * scale);
  const H = Math.round((north - south) * scale);
  const x = (lng) => ((lng - west) * squash * scale).toFixed(1);
  const y = (lat) => ((north - lat) * scale).toFixed(1);
  const pts = (list) => list.map(([lat, lng]) => `${x(lng)},${y(lat)}`).join(' ');

  const land = `${pts(areas.mainland)} ${W},${H} ${W},0`;
  const islands = areas.islands
    .map((i) => `<polyline class="map-island" points="${pts(i.points)}" stroke-width="${i.width}"/>`)
    .join('');

  const pins = known
    .map((name) => {
      const t = areas.towns[name];
      const cx = Number(x(t.lng));
      const cy = Number(y(t.lat));
      const home = name === homeTown;
      const r = home ? 7 : 5;
      let tx = cx + r + 5;
      let ty = cy + 4.5;
      let anchor = 'start';
      if (t.side === 'l') {
        tx = cx - r - 5;
        anchor = 'end';
      } else if (t.side === 'bl') {
        // Below the pin, running left, for towns boxed in on both sides.
        tx = cx + 6;
        ty = cy + r + 16;
        anchor = 'end';
      }
      return (
        `<circle class="map-pin${home ? ' map-pin-home' : ''}" cx="${cx}" cy="${cy}" r="${r}"/>` +
        `<text class="map-label${home ? ' map-label-home' : ''}" x="${tx}" y="${ty}" text-anchor="${anchor}">${esc(name)}</text>`
      );
    })
    .join('');

  return (
    `<svg class="map-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of Southwest Florida showing ${esc(known.join(', '))}">` +
    `<rect class="map-water" width="${W}" height="${H}"/>` +
    `<polygon class="map-land" points="${land}"/>` +
    islands +
    `<polyline class="map-river" points="${pts(areas.river)}"/>` +
    pins +
    `</svg>`
  );
}

// Towns within reach of the home town, nearest first (used when a business lists no service area).
function nearbyTowns(areas, homeTown, maxKm = 32, limit = 6) {
  const home = areas.towns[homeTown];
  if (!home) return [homeTown];
  const km = (a, b) => {
    const dLat = (a.lat - b.lat) * 111;
    const dLng = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
    return Math.hypot(dLat, dLng);
  };
  return Object.entries(areas.towns)
    .map(([name, t]) => ({ name, d: km(home, t) }))
    .filter((t) => t.d <= maxKm)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((t) => t.name);
}

module.exports = { renderMap, nearbyTowns };
