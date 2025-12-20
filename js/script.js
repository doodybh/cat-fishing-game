const mainCatPictureElement = document.getElementById('main-cat-picture');
const infoButtonElement = document.getElementById('info-button');
const infoModalElement = document.getElementById('info-modal');
const closeButtonElement = document.getElementById('close-button');
const overlayElement = document.getElementById('overlay');

const optionsButtonElement = document.getElementById('options-button');
const optionsModalElement = document.getElementById('options-modal');
const optionsCloseElement = document.getElementById('options-close');

const KEY_HIGHSCORE = 'fw_highscore';
const KEY_PACE = 'fw_pace';
const KEY_MUSIC_VOL = 'fw_music_vol';
const KEY_SFX_VOL = 'fw_sfx_vol';
const KEY_MUTED = 'fw_muted';

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function getHighScoreRaw() {
  const v = parseInt(localStorage.getItem(KEY_HIGHSCORE) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}

function renderHighScore() {
  const el = document.getElementById('highscore-text');
  if (!el) return;
  el.textContent = String(getHighScoreRaw());
}

function getPace() {
  const v = localStorage.getItem(KEY_PACE);
  return (v === 'easy' || v === 'medium' || v === 'hard') ? v : 'medium';
}

function setPace(pace) {
  localStorage.setItem(KEY_PACE, pace);
}

function renderPaceUI() {
  const sel = document.getElementById('opt-pace');
  if (!sel) return;
  sel.value = getPace();
}

function getAudioSettings() {
  return {
    musicVol: clamp01(parseFloat(localStorage.getItem(KEY_MUSIC_VOL) || '0.7')),
    sfxVol: clamp01(parseFloat(localStorage.getItem(KEY_SFX_VOL) || '0.8')),
    muted: (localStorage.getItem(KEY_MUTED) || '0') === '1'
  };
}

let audioState = getAudioSettings();

function updateSliderFill(slider) {
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 100);
  const val = Number(slider.value || 0);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--fill', `${pct}%`);
}

function renderAudioUIFromState() {
  const music = document.getElementById('musicVol');
  const musicVal = document.getElementById('musicVolVal');
  if (music) {
    music.value = String(Math.round(audioState.musicVol * 100));
    updateSliderFill(music);
  }
  if (musicVal) musicVal.textContent = `${Math.round(audioState.musicVol * 100)}%`;

  const sfx = document.getElementById('sfxVol');
  const sfxVal = document.getElementById('sfxVolVal');
  if (sfx) {
    sfx.value = String(Math.round(audioState.sfxVol * 100));
    updateSliderFill(sfx);
  }
  if (sfxVal) sfxVal.textContent = `${Math.round(audioState.sfxVol * 100)}%`;

  const btn = document.getElementById('btn-mute');
  if (btn) {
    btn.textContent = `Mute: ${audioState.muted ? 'On' : 'Off'}`;
    btn.classList.toggle('is-muted', audioState.muted);
  }
}

let _applyRAF = null;
function applyAudioThrottled() {
  if (_applyRAF) return;
  _applyRAF = requestAnimationFrame(() => {
    _applyRAF = null;
    applyAudio?.(audioState);
  });
}

function isOptionsOpen() {
  return optionsModalElement && optionsModalElement.style.display === 'block';
}

function nudgeRange(id, amount) {
  const el = document.getElementById(id);
  if (!el) return;

  const min = Number(el.min || 0);
  const max = Number(el.max || 100);
  const step = Number(el.step || 1);

  const next = Math.max(min, Math.min(max, Number(el.value) + amount * step));
  el.value = String(next);

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function markHot(el, on) {
  if (!el) return;
  el.classList.toggle('is-hot', on);
}

['musicVol', 'sfxVol'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener('mouseenter', () => markHot(el, true));
  el.addEventListener('mouseleave', () => markHot(el, false));
  el.addEventListener('focus', () => markHot(el, true));
  el.addEventListener('blur', () => markHot(el, false));

  el.addEventListener('wheel', (e) => {
    if (!isOptionsOpen()) return;
    e.preventDefault();

    const step = e.shiftKey ? 5 : 1;
    const dir = (e.deltaY > 0) ? -step : step;
    nudgeRange(id, dir);
  }, { passive: false });
});

document.addEventListener('keydown', (e) => {
  if (!isOptionsOpen()) return;

  const key = e.key.toLowerCase();

  if (key === 'm') {
    e.preventDefault();
    document.getElementById('btn-mute')?.click();
    return;
  }

  const active = document.activeElement;
  const hovered = document.querySelector('#options-modal input[type="range"].is-hot');

  const target =
    (active && active.tagName === 'INPUT' && active.type === 'range') ? active :
    hovered ? hovered :
    document.getElementById('musicVol');

  if (!target) return;

  const big = e.shiftKey ? 5 : 1;

  if (e.key === 'ArrowLeft')  { e.preventDefault(); nudgeRange(target.id, -big); }
  if (e.key === 'ArrowRight') { e.preventDefault(); nudgeRange(target.id, +big); }
});

mainCatPictureElement?.addEventListener('mouseover', () => mainCatPictureElement.src = "./images/catmeow.png");
mainCatPictureElement?.addEventListener('mouseout', () => mainCatPictureElement.src = "./images/catwalking.png");

infoButtonElement?.addEventListener('click', () => {
  if (!infoModalElement) return;
  infoModalElement.style.display = 'block';
  overlayElement?.classList.add('active');
});

closeButtonElement?.addEventListener('click', () => {
  if (!infoModalElement) return;
  infoModalElement.style.display = 'none';
  overlayElement?.classList.remove('active');
});

function openOptions() {
  audioState = getAudioSettings();
  renderHighScore();
  renderPaceUI();
  renderAudioUIFromState();

  optionsModalElement.style.display = 'block';
  overlayElement?.classList.add('active');

  setTimeout(() => {
    document.getElementById('musicVol')?.focus();
  }, 0);
}

function closeOptions() {
  optionsModalElement.style.display = 'none';
  overlayElement?.classList.remove('active');
}

optionsButtonElement?.addEventListener('click', openOptions);
optionsCloseElement?.addEventListener('click', closeOptions);

document.getElementById('opt-pace')?.addEventListener('change', (e) => {
  setPace(e.target.value);
});

document.getElementById('musicVol')?.addEventListener('input', (e) => {
  audioState.musicVol = clamp01(Number(e.target.value) / 100);
  updateSliderFill(e.target);
  const v = document.getElementById('musicVolVal');
  if (v) v.textContent = `${Math.round(audioState.musicVol * 100)}%`;
  applyAudioThrottled();
});

document.getElementById('musicVol')?.addEventListener('change', (e) => {
  localStorage.setItem(KEY_MUSIC_VOL, String(clamp01(Number(e.target.value) / 100)));
});

document.getElementById('sfxVol')?.addEventListener('input', (e) => {
  audioState.sfxVol = clamp01(Number(e.target.value) / 100);
  updateSliderFill(e.target);
  const v = document.getElementById('sfxVolVal');
  if (v) v.textContent = `${Math.round(audioState.sfxVol * 100)}%`;
  applyAudioThrottled();
});

document.getElementById('sfxVol')?.addEventListener('change', (e) => {
  localStorage.setItem(KEY_SFX_VOL, String(clamp01(Number(e.target.value) / 100)));
});

document.getElementById('btn-mute')?.addEventListener('click', () => {
  audioState.muted = !audioState.muted;
  localStorage.setItem(KEY_MUTED, audioState.muted ? '1' : '0');
  renderAudioUIFromState();
  applyAudioThrottled();
});

renderHighScore();
renderPaceUI();
audioState = getAudioSettings();
renderAudioUIFromState();

window.addEventListener('focus', () => {
  renderHighScore();
  renderPaceUI();
  audioState = getAudioSettings();
  renderAudioUIFromState();
});
