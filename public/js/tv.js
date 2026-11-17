// Full-screen TV view. The screen config travels in the URL hash.
// The menu is fetched again every minute, so price changes in 24order appear on their own.
import { renderBoard, STAGE_W, STAGE_H } from './render.js';
import { decodeConfig, loadMenu, DEFAULT_CONFIG } from './config.js';

const stage = document.getElementById('stage');
const cfg = decodeConfig(location.hash.slice(1)) || DEFAULT_CONFIG;
let lastJson = '';

function fit() {
  const s = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
  stage.style.transform = `scale(${s})`;
  stage.style.left = `${(innerWidth - STAGE_W * s) / 2}px`;
  stage.style.top = `${(innerHeight - STAGE_H * s) / 2}px`;
}

async function refresh() {
  try {
    const menu = await loadMenu(cfg);
    const j = JSON.stringify(menu);
    if (j !== lastJson) {
      lastJson = j;
      renderBoard(stage, menu, cfg);
    }
  } catch (e) {
    if (!lastJson) document.body.insertAdjacentHTML('beforeend', `<div class="tv-msg">${String(e.message || e)}</div>`);
  }
}

addEventListener('resize', fit);
fit();
refresh();
setInterval(refresh, 60_000);
