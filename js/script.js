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
const KEY_MUSIC_ONLY_MUTED = 'fw_music_only_muted';

let musicMutedOnly = (localStorage.getItem(KEY_MUSIC_ONLY_MUTED) || '0') === '1';

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
    if (audioState.muted) btn.textContent = 'Mute: All';
    else if (musicMutedOnly) btn.textContent = 'Mute: Music';
    else btn.textContent = 'Mute: Off';
    btn.classList.toggle('is-muted', audioState.muted || musicMutedOnly);
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
  const key = e.key.toLowerCase();

  if (key === 'm') {
    e.preventDefault();
    document.getElementById('btn-mute')?.click();
    return;
  }

  if (!isOptionsOpen()) return;

  const active = document.activeElement;
  const hovered = document.querySelector('#options-modal input[type="range"].is-hot');

  const target =
    (active && active.tagName === 'INPUT' && active.type === 'range') ? active :
      hovered ? hovered :
        document.getElementById('musicVol');

  if (!target) return;

  const big = e.shiftKey ? 5 : 1;

  if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeRange(target.id, -big); }
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
  if (!musicMutedOnly && !audioState.muted) {
    musicMutedOnly = true;
    audioState.muted = false;
  } else if (musicMutedOnly && !audioState.muted) {
    audioState.muted = true;
    musicMutedOnly = false;
  } else {
    audioState.muted = false;
    musicMutedOnly = false;
  }

  localStorage.setItem(KEY_MUTED, audioState.muted ? '1' : '0');
  localStorage.setItem(KEY_MUSIC_ONLY_MUTED, musicMutedOnly ? '1' : '0');

  renderAudioUIFromState();
  applyAudio(audioState);
});

const menuMusic = new Audio('../audio/menu-music.mp3');
menuMusic.loop = true;
menuMusic.volume = 0;

function applyAudio(state) {
  const wantMusic = !state.muted && !musicMutedOnly;
  const vol = wantMusic ? clamp01(state.musicVol) : 0;

  menuMusic.volume = vol;

  if (wantMusic) {
    if (menuMusic.paused) menuMusic.play().catch(() => { });
  } else {
    if (!menuMusic.paused) {
      menuMusic.pause();
    }
  }
}


function unlockMenuAudioOnce() {
  applyAudio(getAudioSettings());
  document.removeEventListener('pointerdown', unlockMenuAudioOnce);
  document.removeEventListener('keydown', unlockMenuAudioOnce);
}

document.addEventListener('pointerdown', unlockMenuAudioOnce, { once: true });
document.addEventListener('keydown', unlockMenuAudioOnce, { once: true });

document.addEventListener('click', () => {
  const state = getAudioSettings();
  applyAudio(state);
}, { once: true });

let paceSelect = null;
let paceBtn = null;
let paceText = null;
let paceOptions = [];
let paceMenu = null;

function syncPaceDropdownFromStorage() {
  if (!paceSelect || !paceText || !paceOptions.length) return;
  const pace = getPace();
  const match = paceOptions.find(o => o.dataset.value === pace) || paceOptions[1] || paceOptions[0];
  if (!match) return;
  paceText.textContent = match.textContent;
  paceOptions.forEach(o => o.classList.remove("selected"));
  match.classList.add("selected");
}

function initPaceDropdown() {
  paceSelect = document.getElementById("paceSelect");
  if (!paceSelect) return;

  paceBtn = paceSelect.querySelector(".select-btn");
  paceText = paceSelect.querySelector(".select-text");
  paceMenu = paceSelect.querySelector(".select-menu");
  paceOptions = Array.from(paceSelect.querySelectorAll(".select-option"));

  if (!paceBtn || !paceText || !paceMenu || !paceOptions.length) return;

  syncPaceDropdownFromStorage();

  paceBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = paceSelect.classList.toggle("open");
    paceMenu.style.display = isOpen ? "block" : "none";
  });

  paceOptions.forEach(opt => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      paceText.textContent = opt.textContent;
      paceOptions.forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      localStorage.setItem(KEY_PACE, opt.dataset.value);
      paceSelect.classList.remove("open");
      paceMenu.style.display = "none";
    });
  });

  document.addEventListener("click", () => {
    if (!paceSelect) return;
    paceSelect.classList.remove("open");
    paceMenu.style.display = "none";
  });
}

renderHighScore();
renderPaceUI();
audioState = getAudioSettings();
renderAudioUIFromState();
initPaceDropdown();

window.addEventListener('focus', () => {
  renderHighScore();
  renderPaceUI();
  syncPaceDropdownFromStorage();
  audioState = getAudioSettings();
  musicMutedOnly = (localStorage.getItem(KEY_MUSIC_ONLY_MUTED) || '0') === '1';
  renderAudioUIFromState();
});
