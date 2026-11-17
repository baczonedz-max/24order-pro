// Editor: pick data, template and options; preview the 1920×1080 board live.
import { renderBoard, TEMPLATES, STAGE_W, STAGE_H } from './render.js';
import { DEFAULT_CONFIG, encodeConfig, decodeConfig, loadMenu } from './config.js';
import { LANGS, t, detectLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const viewport = $('viewport');

let lang = detectLang();
let cfg = decodeConfig(location.hash.slice(1)) || structuredClone(DEFAULT_CONFIG);
let menu = null;

/* ---------- language ---------- */
function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = t(el.dataset.t, lang)));
  document.querySelectorAll('[data-t-ph]').forEach((el) => (el.placeholder = t(el.dataset.tPh, lang)));
  renderTemplates();
  renderCats();
  renderSaved();
}
$('lang').innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('lang').value = lang;
$('lang').addEventListener('change', (e) => {
  lang = e.target.value;
  try { localStorage.setItem('mtv.lang', lang); } catch {}
  applyLang();
});

/* ---------- controls ---------- */
function renderTemplates() {
  $('templates').innerHTML = Object.entries(TEMPLATES)
    .map(([k, v]) => `<label class="tpl${cfg.template === k ? ' on' : ''}"><input type="radio" name="tpl" value="${k}" ${cfg.template === k ? 'checked' : ''}><span class="tpl-thumb tpl-thumb--${k}"></span><span>${v.name[lang] || v.name.en}</span></label>`)
    .join('');
  $('templates').querySelectorAll('input').forEach((i) =>
    i.addEventListener('change', () => {
      cfg.template = i.value;
      if (i.value === 'panels' && cfg.categories.length < 2 && menu) {
        cfg.categories = menu.categories.slice(3, 7).map((c) => c.id);
      }
      renderTemplates();
      renderCats();
      update();
    }));
  $('colsField').hidden = cfg.template !== 'fire-cards';
}

function renderCats() {
  if (!menu) return ($('cats').innerHTML = `<p class="hint">${t('loading', lang)}</p>`);
  $('cats').innerHTML = menu.categories
    .map((c) => {
      const idx = cfg.categories.map(String).indexOf(String(c.id));
      return `<label class="cat${idx >= 0 ? ' on' : ''}"><input type="checkbox" value="${c.id}" ${idx >= 0 ? 'checked' : ''}>
        ${idx >= 0 ? `<b class="order">${idx + 1}</b>` : ''}<span>${c.name}</span><small>${c.foods.length} ${t('products', lang)}</small></label>`;
    })
    .join('');
  $('cats').querySelectorAll('input').forEach((i) =>
    i.addEventListener('change', () => {
      const id = Number(i.value);
      cfg.categories = i.checked ? [...cfg.categories.filter((x) => x !== id), id] : cfg.categories.filter((x) => x !== id);
      renderCats();
      update();
    }));
}

function bindInputs() {
  document.querySelectorAll('input[name=source]').forEach((r) => {
    r.checked = r.value === cfg.source;
    r.addEventListener('change', () => {
      cfg.source = r.value;
      $('liveBox').hidden = cfg.source !== 'live';
      if (cfg.source === 'demo') reload();
    });
  });
  $('liveBox').hidden = cfg.source !== 'live';
  $('server').value = cfg.server;
  $('branch').value = cfg.branch;
  $('loadLive').addEventListener('click', () => {
    cfg.server = $('server').value.trim();
    cfg.branch = $('branch').value.trim();
    reload();
  });
  $('title').value = cfg.title;
  $('title').addEventListener('input', (e) => { cfg.title = e.target.value; update(); });
  $('columns').value = cfg.columns;
  $('columns').addEventListener('input', (e) => { cfg.columns = Math.max(2, Math.min(6, Number(e.target.value) || 4)); update(); });
  for (const k of ['showNumbers', 'showDesc', 'showFooter', 'embers']) {
    $(k).checked = cfg[k] !== false;
    $(k).addEventListener('change', (e) => { cfg[k] = e.target.checked; update(); });
  }
  for (const k of ['accent', 'priceColor']) {
    $(k).value = cfg[k];
    $(k).addEventListener('input', (e) => { cfg[k] = e.target.value; update(); });
  }
}

/* ---------- preview ---------- */
function fitPreview() {
  const w = viewport.clientWidth;
  const s = w / STAGE_W;
  stage.style.transform = `scale(${s})`;
  viewport.style.height = `${STAGE_H * s}px`;
}
new ResizeObserver(fitPreview).observe(viewport);

let raf = 0;
function update() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    if (menu) renderBoard(stage, menu, cfg);
    const link = tvLink();
    $('openTv').href = link;
    history.replaceState(null, '', `#${encodeConfig(cfg)}`);
  });
}

const tvLink = () => `${location.origin}/tv.html#${encodeConfig(cfg)}`;

async function reload() {
  $('status').textContent = t('loading', lang);
  try {
    menu = await loadMenu(cfg);
    const ids = menu.categories.map((c) => c.id);
    cfg.categories = cfg.categories.filter((id) => ids.includes(id));
    if (!cfg.categories.length && ids.length) cfg.categories = [ids[0]];
    const count = menu.categories.reduce((a, c) => a + c.foods.length, 0);
    $('status').textContent = `${menu.restaurant?.name || ''} · ${count} ${t('products', lang)}`;
  } catch (e) {
    menu = null;
    $('status').textContent = `${t('error', lang)}: ${e.message}`;
  }
  renderCats();
  update();
}

/* ---------- saved screens (this browser) ---------- */
const readSaved = () => { try { return JSON.parse(localStorage.getItem('mtv.screens') || '[]'); } catch { return []; } };
const writeSaved = (list) => { try { localStorage.setItem('mtv.screens', JSON.stringify(list)); } catch {} };

function renderSaved() {
  const list = readSaved();
  $('savedList').innerHTML = list.length
    ? list.map((s, i) => `<li><a href="#${s.code}" data-i="${i}" class="load">${s.name}</a><a class="btn tiny" target="_blank" rel="noopener" href="/tv.html#${s.code}">TV</a><button class="btn tiny ghost del" data-i="${i}">${t('delete', lang)}</button></li>`).join('')
    : `<li class="hint">${t('none', lang)}</li>`;
  $('savedList').querySelectorAll('.load').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    cfg = decodeConfig(readSaved()[a.dataset.i].code) || cfg;
    bindValues();
    reload();
  }));
  $('savedList').querySelectorAll('.del').forEach((b) => b.addEventListener('click', () => {
    const l = readSaved(); l.splice(b.dataset.i, 1); writeSaved(l); renderSaved();
  }));
}

function bindValues() {
  document.querySelectorAll('input[name=source]').forEach((r) => (r.checked = r.value === cfg.source));
  $('liveBox').hidden = cfg.source !== 'live';
  $('server').value = cfg.server; $('branch').value = cfg.branch; $('title').value = cfg.title; $('columns').value = cfg.columns;
  for (const k of ['showNumbers', 'showDesc', 'showFooter', 'embers']) $(k).checked = cfg[k] !== false;
  for (const k of ['accent', 'priceColor']) $(k).value = cfg[k];
  renderTemplates();
}

$('saveScreen').addEventListener('click', () => {
  const cat = menu?.categories.find((c) => String(c.id) === String(cfg.categories[0]));
  const name = prompt(t('screenName', lang), cfg.title || cat?.name || 'Screen');
  if (!name) return;
  const l = readSaved();
  l.unshift({ name, code: encodeConfig(cfg) });
  writeSaved(l.slice(0, 50));
  renderSaved();
});

$('copyLink').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(tvLink());
    $('status').textContent = t('copied', lang);
  } catch {
    prompt('TV', tvLink());
  }
});

bindInputs();
applyLang();
fitPreview();
reload();
