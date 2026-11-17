// Renders a TV menu board (1920×1080 design size) from menu data + screen config.
// Three templates, styled after the restaurant boards we make today:
//   fire-grid  – logo, red banner title, numbered cards with a red price pill, extras footer
//   fire-cards – brush title, 4-column cards with yellow prices, optional second section
//   panels     – white board, black panels per category with tiles and red price pills
import { ICONS, iconFor } from './icons.js';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export const TEMPLATES = {
  'fire-grid': { name: { en: 'Fire grid (numbered cards)', ar: 'شبكة اللهب (بطاقات مرقمة)', fr: 'Grille feu (cartes numérotées)', no: 'Flammerutenett (nummererte kort)' } },
  'fire-cards': { name: { en: 'Fire cards (4 columns)', ar: 'بطاقات اللهب (4 أعمدة)', fr: 'Cartes feu (4 colonnes)', no: 'Flammekort (4 kolonner)' } },
  panels: { name: { en: 'Panels (sides & drinks)', ar: 'ألواح (إضافات ومشروبات)', fr: 'Panneaux (accompagnements)', no: 'Paneler (tilbehør og drikke)' } },
};

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function formatPrice(n, style = 'dash', currency = 'kr') {
  if (n === null || n === undefined || n === '') return '';
  const v = Number(n);
  const txt = Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
  if (style === 'currency') return `${txt} ${currency}`;
  if (style === 'plain') return txt;
  return `${txt},-`;
}

// "M: 180,- / S: 250,-" (labelled) or "209,- / 309,-" (plain)
export function priceLine(food, style, currency, labelled = true) {
  const ps = (food.prices || []).filter((p) => p.price !== null && p.price !== undefined && p.price !== '');
  if (!ps.length) return '';
  if (ps.length === 1) return formatPrice(ps[0].price, style, currency);
  return ps.map((p) => (labelled && p.size ? `${p.size}: ` : '') + formatPrice(p.price, style, currency)).join(' / ');
}

const descOf = (f) => f.description || (f.components || []).filter((c) => c.state === 'selected').map((c) => c.name).join(', ');

// Best column count for n cards in a w×h box with a target card aspect.
function bestGrid(n, w, h, aspect, gap, minCols = 1, maxCols = 8) {
  let best = { cols: 1, rows: n, size: 0 };
  for (let cols = minCols; cols <= Math.min(maxCols, n); cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = (h - gap * (rows - 1)) / rows;
    const cardW = Math.min(cw, ch * aspect);
    if (cardW > best.size) best = { cols, rows, size: cardW, cw, ch };
  }
  return best;
}

export function renderBoard(stage, menu, cfg) {
  const cats = (cfg.categories?.length ? cfg.categories : [menu.categories[0]?.id])
    .map((id) => menu.categories.find((c) => String(c.id) === String(id)))
    .filter(Boolean);
  stage.className = `tv-stage tpl-${cfg.template}`;
  stage.style.setProperty('--accent', cfg.accent || '#e11d1d');
  stage.style.setProperty('--price', cfg.priceColor || '#ffc21a');
  if (!cats.length) {
    stage.innerHTML = '<div class="tv-empty">—</div>';
    return;
  }
  const r = menu.restaurant || {};
  const ctx = { r, cfg, style: r.priceStyle || 'dash', cur: r.currency || 'kr' };
  if (cfg.template === 'fire-cards') stage.innerHTML = fireCards(cats, ctx);
  else if (cfg.template === 'panels') stage.innerHTML = panels(cats, ctx);
  else stage.innerHTML = fireGrid(cats[0], ctx);
  if (cfg.embers !== false && cfg.template !== 'panels') addEmbers(stage);
  requestAnimationFrame(() => fitAll(stage));
  // Fonts and photos change sizes: fit again once they are in.
  document.fonts?.ready.then(() => fitAll(stage));
}

/* ---------- fire-grid (Paradis style) ---------- */
function fireGrid(cat, { r, cfg, style, cur }) {
  const foods = cat.foods;
  const footer = cfg.showFooter !== false && cat.footer?.length;
  const top = 250, bottom = footer ? 140 : 40, side = 46;
  const g = bestGrid(foods.length, STAGE_W - side * 2 - 40, STAGE_H - top - bottom - 30, 1.18, 14, 3, 7);
  const title = cfg.title || cat.name;
  const cards = foods
    .map((f, i) => `
      <article class="fg-card">
        ${f.image ? `<img class="fg-photo" src="${esc(f.image)}" alt="" loading="eager">` : '<div class="fg-photo fg-photo--none"></div>'}
        <div class="fg-head">
          ${cfg.showNumbers !== false ? `<span class="fg-num">${esc(f.number ?? i + 1)}</span>` : ''}
          <h3 class="fg-name fit-h" data-min="15">${esc(f.name)}</h3>
        </div>
        ${cfg.showDesc !== false ? `<p class="fg-desc fit-h" data-min="13">${esc(descOf(f))}</p>` : ''}
        <div class="fg-price"><span class="fit" data-min="14">${esc(priceLine(f, style, cur, true))}</span></div>
      </article>`)
    .join('');
  const foot = footer
    ? `<footer class="fg-footer">${cat.footer
        .map((x, i) => `
          ${i ? '<span class="fg-sep"></span>' : ''}
          <div class="fg-extra">
            <span class="fg-extra-icon">${x.icon ? ICONS[x.icon] || iconFor(x.label) : iconFor(x.label)}</span>
            <span class="fg-extra-label">${esc(x.label)}</span>
            <span class="fg-extra-value">${esc(x.value)}</span>
          </div>
          ${x.note ? `<span class="fg-sep"></span><p class="fg-extra-note fit-h" data-min="14">${esc(x.note)}</p>` : ''}`)
        .join('')}</footer>`
    : '';
  return `
    <div class="fire-bg"></div>
    <header class="fg-header">
      <div class="fg-brand">
        <span class="fg-line"></span>
        ${r.logo ? `<img class="fg-logo" src="${esc(r.logo)}" alt="">` : `<span class="fg-brandname">${esc(r.name || '')}</span>`}
        <span class="fg-line"></span>
      </div>
      <div class="fg-banner"><span class="fg-banner-icon">${iconFor(cat.name)}</span><span class="fit" data-min="30">${esc(title)}</span></div>
    </header>
    <section class="fg-frame" style="top:${top - 18}px;bottom:${bottom}px">
      <div class="fg-grid" style="grid-template-columns:repeat(${g.cols},minmax(0,1fr));grid-template-rows:repeat(${g.rows},minmax(0,1fr))">${cards}</div>
    </section>
    ${foot}`;
}

/* ---------- fire-cards (4 columns, brush title) ---------- */
function fireCards(cats, { cfg, style, cur }) {
  const [main, second] = cats;
  const title = cfg.title || main.name;
  const secondH = second ? 250 : 0;
  const top = 210;
  const avail = STAGE_H - top - 40 - secondH;
  // Keep cards readable: at most 5 rows (4 with a second section); add columns instead.
  const maxRows = second ? 4 : 5;
  const cols = Math.min(7, Math.max(cfg.columns || 4, Math.ceil(main.foods.length / maxRows)));
  const rows = Math.ceil(main.foods.length / cols);
  const card = (f, i, wide) => `
    <article class="fc-card${wide ? ' fc-card--wide' : ''}">
      ${cfg.showNumbers !== false && !wide ? `<span class="fc-num">${esc(f.number ?? i + 1)}</span>` : ''}
      ${f.image ? `<img class="fc-photo" src="${esc(f.image)}" alt="">` : '<div class="fc-photo fc-photo--none"></div>'}
      <div class="fc-text">
        <h3 class="fc-name fit" data-min="16">${esc(f.name)}${/sterk|spicy|hot|حار/i.test(f.name + ' ' + (f.description || '')) ? `<span class="fc-chili">${ICONS.chili}</span>` : ''}</h3>
        <div class="fc-price">${esc(priceLine(f, style, cur, false))}</div>
        ${cfg.showDesc !== false ? `<p class="fc-desc fit-h" data-min="13">${esc(descOf(f))}</p>` : ''}
      </div>
    </article>`;
  return `
    <div class="fire-bg fire-bg--soft"></div>
    <header class="fc-header"><h1 class="fc-title">${esc(title)}</h1></header>
    <section class="fc-grid" style="top:${top}px;height:${avail}px;grid-template-columns:repeat(${cols},minmax(0,1fr));grid-template-rows:repeat(${rows},minmax(0,1fr))">
      ${main.foods.map((f, i) => card(f, i, false)).join('')}
    </section>
    ${second ? `
    <h2 class="fc-subtitle" style="top:${top + avail + 6}px">${esc(second.name)}</h2>
    <section class="fc-grid fc-grid--second" style="top:${top + avail + 62}px;height:${secondH - 80}px;grid-template-columns:repeat(${Math.min(second.foods.length, 3)},minmax(0,1fr))">
      ${second.foods.slice(0, 3).map((f, i) => card(f, i, true)).join('')}
    </section>` : ''}`;
}

/* ---------- panels (sides, drinks, sauces) ---------- */
function panels(cats, { r, cfg, style, cur }) {
  const n = cats.length;
  const cols = n <= 1 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const panel = (c) => {
    const many = c.foods.length > 3;
    const tiles = c.foods
      .map((f) => `
        <div class="pn-tile${many ? ' pn-tile--small' : ''}">
          ${f.tag ? `<span class="pn-tag">${esc(f.tag)}</span>` : ''}
          ${f.image ? `<img class="pn-photo" src="${esc(f.image)}" alt="">` : '<div class="pn-photo pn-photo--none"></div>'}
          <h3 class="pn-name fit-h" data-min="15">${esc(f.name)}</h3>
          ${many && c.footer?.length ? '' : `<span class="pn-price">${esc(priceLine(f, style, cur, true))}</span>`}
        </div>`)
      .join('');
    const foot = many && c.footer?.length
      ? `<div class="pn-foot">${c.footer.map((x) => `<span class="pn-foot-label">${esc(x.label)}</span><span class="pn-foot-sep"></span><span class="pn-foot-value">${esc(x.value)}</span>`).join('')}</div>`
      : '';
    return `
      <section class="pn-panel">
        <div class="pn-head"><span class="pn-icon">${iconFor(c.name)}</span><span class="fit" data-min="22">${esc(c.name)}</span></div>
        <div class="pn-tiles" style="grid-template-columns:repeat(${c.foods.length},minmax(0,1fr))">${tiles}</div>
        ${foot}
      </section>`;
  };
  return `
    <header class="pn-header">
      <span class="pn-line"></span>
      ${r.logo ? `<img class="pn-logo" src="${esc(r.logo)}" alt="">` : `<span class="pn-brandname">${esc(r.name || '')}</span>`}
      <span class="pn-line"></span>
    </header>
    <div class="pn-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr));grid-template-rows:repeat(${rows},minmax(0,1fr))">
      ${cats.map(panel).join('')}
    </div>`;
}

/* ---------- text fitting ---------- */
// .fit: one line, shrink until it fits the width. .fit-h: wraps, shrink until it fits the height.
export function fitAll(root) {
  root.querySelectorAll('.fit, .fit-h').forEach((el) => {
    el.style.fontSize = '';
    const min = Number(el.dataset.min || 10);
    let size = parseFloat(getComputedStyle(el).fontSize);
    const tooBig = el.classList.contains('fit')
      ? () => el.scrollWidth > el.clientWidth + 0.5
      // Tall typefaces (Oswald) draw a little outside their line box: allow 0.3em of that.
      : () => el.scrollHeight > el.clientHeight + size * 0.3 || el.scrollWidth > el.clientWidth + 0.5;
    let guard = 60;
    while (tooBig() && size > min && guard--) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }
  });
}

/* ---------- floating embers ---------- */
function addEmbers(stage) {
  const c = document.createElement('canvas');
  c.className = 'embers';
  c.width = STAGE_W;
  c.height = STAGE_H;
  stage.prepend(c);
  const g = c.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parts = Array.from({ length: 70 }, () => spawn(true));
  function spawn(any) {
    const side = Math.random();
    return {
      x: side < 0.4 ? Math.random() * 260 : side < 0.8 ? STAGE_W - Math.random() * 260 : Math.random() * STAGE_W,
      y: any ? Math.random() * STAGE_H : STAGE_H + 10,
      r: 0.8 + Math.random() * 2.2,
      vy: 0.4 + Math.random() * 1.2,
      vx: (Math.random() - 0.5) * 0.6,
      a: 0.4 + Math.random() * 0.6,
    };
  }
  function frame() {
    if (!c.isConnected) return;
    g.clearRect(0, 0, STAGE_W, STAGE_H);
    for (const p of parts) {
      p.y -= p.vy;
      p.x += p.vx + Math.sin(p.y / 40) * 0.3;
      p.a -= 0.0015;
      if (p.y < -10 || p.a <= 0) Object.assign(p, spawn(false));
      g.beginPath();
      g.fillStyle = `rgba(255,${120 + Math.floor(p.r * 30)},40,${p.a})`;
      g.shadowColor = 'rgba(255,90,20,0.9)';
      g.shadowBlur = 8;
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  frame();
}
