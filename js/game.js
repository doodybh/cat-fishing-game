const fishingLineElement = document.getElementById('fishing-line');
const gameWrapperElement = document.querySelector('.game-wrapper');
const lineMaskElement = document.getElementById('line-mask');

const LINE_TOP_OFFSET = 155;
const HOOK_HEIGHT = 40;

const KEY_PACE = 'fw_pace';
const KEY_MUSIC_VOL = 'fw_music_vol';
const KEY_SFX_VOL = 'fw_sfx_vol';
const KEY_MUTED = 'fw_muted';
const KEY_HIGHSCORE = 'fw_highscore';

let paused = false;
let gameStarted = false;

document.addEventListener('mousemove', (mouseEvent) => {
    if (paused) return;

    const wrapperRect = gameWrapperElement.getBoundingClientRect();
    let lineHeight = mouseEvent.clientY - wrapperRect.top - LINE_TOP_OFFSET;
    if (lineHeight < 0) lineHeight = 0;

    const maxHeight = gameWrapperElement.clientHeight - LINE_TOP_OFFSET - HOOK_HEIGHT;
    if (lineHeight > maxHeight) lineHeight = maxHeight;

    fishingLineElement.style.height = lineHeight + 'px';
});

const waterAreaElement = document.querySelector('.water-area');
const hookElement = document.getElementById('hook');

let caughtFish = null;
let score = 0;
let fishScored = false;

const HOLE_Y = 230;
let lives = 3;

let invulnerableUntil = 0;
const INVULN_MS = 900;

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function getHighScoreRaw() {
    const v = parseInt(localStorage.getItem(KEY_HIGHSCORE) || '0', 10);
    return Number.isFinite(v) ? v : 0;
}

function setHighScoreRaw(v) {
    localStorage.setItem(KEY_HIGHSCORE, String(Math.max(0, Math.floor(v))));
}

function showGameOverOverlay(finalScoreRaw, bestScoreRaw, isNewBest) {
    const o = document.getElementById('gameover-overlay');
    if (!o) return;

    const sEl = document.getElementById('go-score');
    const bEl = document.getElementById('go-best');
    const badge = document.getElementById('go-badge');

    if (sEl) sEl.textContent = String(finalScoreRaw);
    if (bEl) bEl.textContent = String(bestScoreRaw);
    if (badge) badge.style.display = isNewBest ? 'block' : 'none';

    o.classList.add('show');
    o.setAttribute('aria-hidden', 'false');
}

function hideGameOverOverlay() {
    const o = document.getElementById('gameover-overlay');
    if (!o) return;
    o.classList.remove('show');
    o.setAttribute('aria-hidden', 'true');
}

function gameOver() {
    stopSpawns();
    paused = true;
    gameStarted = false;
    inCountdown = false;

    if (caughtFish) {
        caughtFish.remove();
        caughtFish = null;
    }

    const prevBest = getHighScoreRaw();
    const isNewBest = score > prevBest;
    const best = isNewBest ? score : prevBest;
    if (isNewBest) setHighScoreRaw(best);

    showGameOverOverlay(score, best, isNewBest);
}

let fishSpawnTimer = null;
let hazardSpawnTimer = null;

const _sheetSizeCache = new Map();

function loadSheetSize(url) {
    if (_sheetSizeCache.has(url)) return _sheetSizeCache.get(url);

    const p = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = url;
    });

    _sheetSizeCache.set(url, p);
    return p;
}

function getSpawnRates() {
    const pace = localStorage.getItem(KEY_PACE) || 'medium';

    let fishMs = 4000;
    let hazardMs = 5500;

    if (pace === 'easy') { fishMs = 4600; hazardMs = 7200; }
    if (pace === 'medium') { fishMs = 3400; hazardMs = 5200; }
    if (pace === 'hard') { fishMs = 2800; hazardMs = 4200; }

    return { fishMs, hazardMs };
}

function formatScore(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
}

function resetLineAndHook() {
    fishingLineElement.style.height = '0px';
    hookElement.style.bottom = '-24px';
}

let inCountdown = true;

function showStartOverlay() {
    const o = document.getElementById('start-overlay');
    if (!o) return;
    o.classList.add('show');
    o.setAttribute('aria-hidden', 'false');
}

function hideStartOverlay() {
    const o = document.getElementById('start-overlay');
    if (!o) return;
    o.classList.remove('show');
    o.setAttribute('aria-hidden', 'true');
}

function setStartText(txt) {
    const el = document.getElementById('start-count');
    if (!el) return;
    el.textContent = txt;
}

function startCountdown() {
    stopSpawns();

    gameStarted = false;
    paused = true;
    inCountdown = true;
    gameWrapperElement.classList.add('paused');

    showStartOverlay();

    const seq = ["3", "2", "1", "Fish!!"];
    let i = 0;

    setStartText(seq[i]);

    const tick = () => {
        i++;
        if (i >= seq.length) {
            hideStartOverlay();
            inCountdown = false;

            paused = false;
            gameWrapperElement.classList.remove('paused');
            gameStarted = true;

            startSpawns();
            return;
        }

        setStartText(seq[i]);
        setTimeout(tick, (seq[i] === "Fish!!") ? 650 : 800);
    };

    setTimeout(tick, 800);
}

function stopSpawns() {
    clearTimeout(fishSpawnTimer);
    clearTimeout(hazardSpawnTimer);
    fishSpawnTimer = null;
    hazardSpawnTimer = null;
}

function scheduleFishSpawn() {
    if (paused) return;
    const { fishMs } = getSpawnRates();
    fishSpawnTimer = setTimeout(() => {
        if (!paused) spawnFish();
        scheduleFishSpawn();
    }, fishMs);
}

function scheduleHazardSpawn() {
    if (paused) return;
    const { hazardMs } = getSpawnRates();
    hazardSpawnTimer = setTimeout(() => {
        if (!paused) spawnHazard();
        scheduleHazardSpawn();
    }, hazardMs);
}

function startSpawns() {
    stopSpawns();
    scheduleFishSpawn();
    scheduleHazardSpawn();
}

function showPauseOverlay() {
    document.getElementById('pause-overlay')?.classList.add('show');
}

function hidePauseOverlay() {
    document.getElementById('pause-overlay')?.classList.remove('show');
}

function playDamageFX() {
    gameWrapperElement.classList.add('damage');
    clearTimeout(gameWrapperElement._damageTO);
    gameWrapperElement._damageTO = setTimeout(() => {
        gameWrapperElement.classList.remove('damage');
    }, 160);

    gameWrapperElement.classList.remove('shake');
    void gameWrapperElement.offsetWidth;
    gameWrapperElement.classList.add('shake');
    clearTimeout(gameWrapperElement._shakeTO);
    gameWrapperElement._shakeTO = setTimeout(() => {
        gameWrapperElement.classList.remove('shake');
    }, 300);
}

function pauseGame() {
    if (paused) return;
    paused = true;
    gameWrapperElement.classList.add('paused');
    stopSpawns();
    showPauseOverlay();
    showPausePanel();
}

function resumeGame() {
    if (!paused) return;
    if (isAudioOpen()) return;
    paused = false;
    gameWrapperElement.classList.remove('paused');
    hidePauseOverlay();
    if (gameStarted) startSpawns();
}

function showPausePanel() {
    const p = document.getElementById('pause-panel');
    const a = document.getElementById('audio-panel');
    if (p) p.style.display = 'block';
    if (a) a.style.display = 'none';
}

function showAudioPanel() {
    const p = document.getElementById('pause-panel');
    const a = document.getElementById('audio-panel');
    if (p) p.style.display = 'none';
    if (a) a.style.display = 'block';

    audioState = getAudioSettings();
    renderAudioUIFromState();
    setTimeout(() => document.getElementById('musicVol')?.focus(), 0);
}

function isAudioOpen() {
    const a = document.getElementById('audio-panel');
    return a && a.style.display !== 'none';
}

function closeAudioPanel() {
    showPausePanel();
}

function getAudioSettings() {
    return {
        musicVol: clamp01(parseFloat(localStorage.getItem(KEY_MUSIC_VOL) || '0.7')),
        sfxVol: clamp01(parseFloat(localStorage.getItem(KEY_SFX_VOL) || '0.8')),
        muted: (localStorage.getItem(KEY_MUTED) || '0') === '1'
    };
}

let audioState = getAudioSettings();
const btnUiMute = document.getElementById("btn-ui-mute");

function updateMuteUI(isMuted) {
    if (btnUiMute) btnUiMute.textContent = isMuted ? "🔇" : "🔊";

    const menuMuteBtn = document.getElementById("btn-mute");
    if (menuMuteBtn) {
        menuMuteBtn.textContent = `Mute: ${isMuted ? 'On' : 'Off'}`;
        menuMuteBtn.classList.toggle('is-muted', isMuted);
    }
}


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
        updateMuteUI(audioState.muted);
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

function bindWheelToRange(id) {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('wheel', (e) => {
        if (!paused || !isAudioOpen()) return;
        e.preventDefault();

        const step = e.shiftKey ? 5 : 1;
        const dir = (e.deltaY > 0) ? -step : step;
        nudgeRange(id, dir);
    }, { passive: false });
}

bindWheelToRange('musicVol');
bindWheelToRange('sfxVol');

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

document.getElementById('btn-sound')?.addEventListener('click', () => {
    showAudioPanel();
});

document.getElementById('btn-audio-back')?.addEventListener('click', () => {
    closeAudioPanel();
});

function initSpriteDiv(el, sheetUrl, sheetW, sheetH, cols, rows, fps, scale) {
    const frameW = sheetW / cols;
    const frameH = sheetH / rows;

    el.style.width = (frameW * scale) + 'px';
    el.style.height = (frameH * scale) + 'px';

    el.style.backgroundImage = `url("${sheetUrl}")`;
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundSize = (sheetW * scale) + 'px ' + (sheetH * scale) + 'px';
    el.style.backgroundPosition = '0px 0px';

    el._sprite = {
        sheetW,
        sheetH,
        cols,
        rows,
        fps,
        scale,
        frameW,
        frameH,
        frame: 0,
        accMs: 0
    };
}

function stepSprite(el, dtMs, totalFrames, frameMap) {
    if (!el._sprite) return;

    const s = el._sprite;
    s.accMs += dtMs;

    const frameMs = 1000 / (s.fps || 10);
    while (s.accMs >= frameMs) {
        s.accMs -= frameMs;
        s.frame = (s.frame + 1) % totalFrames;
    }

    let col = s.frame % s.cols;
    let row = Math.floor(s.frame / s.cols);

    if (Array.isArray(frameMap) && frameMap[s.frame]) {
        col = frameMap[s.frame].c;
        row = frameMap[s.frame].r;
    }

    const x = -(col * s.frameW * s.scale);
    const y = -(row * s.frameH * s.scale);

    el.style.backgroundPosition = `${x}px ${y}px`;
}

const hazards = [
    { type: 'img', src: '../images/boot.png', minScale: 0.55, maxScale: 0.95, weight: 60, hitR: 14 },
    {
        type: 'sprite',
        sheet: '../images/trash-sheet.png',
        frames: 8,
        cols: 5,
        rows: 2,
        fps: 10,
        minScale: 0.60,
        maxScale: 1.05,
        weight: 40,
        hitR: 16,
        frameMap: [
            { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 },
            { c: 0, r: 1 }, { c: 1, r: 1 }, { c: 2, r: 1 }
        ]
    }
];

function pickHazardByRarity() {
    const totalWeight = hazards.reduce((sum, h) => sum + h.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const h of hazards) {
        rand -= h.weight;
        if (rand <= 0) return h;
    }
    return hazards[0];
}

const fishImages = [
    { sheet: '../images/fish1-sheet.png', frames: 10, cols: 5, rows: 2, fps: 12, minScale: 0.55, maxScale: 0.85, points: 10, weight: 40, mouthX: 0.88, mouthY: 0.56, mouthR: 14, hookOffX: -5 },
    { sheet: '../images/fish2-sheet.png', frames: 10, cols: 5, rows: 2, fps: 12, minScale: 0.70, maxScale: 1.05, points: 20, weight: 30, mouthX: 0.88, mouthY: 0.56, mouthR: 14, hookOffX: -5 },
    { sheet: '../images/fish3-sheet.png', frames: 10, cols: 5, rows: 2, fps: 12, minScale: 0.85, maxScale: 1.25, points: 35, weight: 18, mouthX: 0.87, mouthY: 0.56, mouthR: 12, hookOffX: -5 },
    { sheet: '../images/fish4-sheet.png', frames: 10, cols: 5, rows: 2, fps: 12, minScale: 1.00, maxScale: 1.45, points: 90, weight: 8, mouthX: 0.86, mouthY: 0.56, mouthR: 10 },
    { sheet: '../images/fish5-sheet.png', frames: 10, cols: 5, rows: 2, fps: 12, minScale: 1.10, maxScale: 1.60, points: 80, weight: 4, mouthX: 0.85, mouthY: 0.56, mouthR: 9, hookOffX: -18, hookOffY: -30 }
];

function pickFishByRarity() {
    const totalWeight = fishImages.reduce((sum, f) => sum + f.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const fish of fishImages) {
        rand -= fish.weight;
        if (rand <= 0) return fish;
    }
    return fishImages[0];
}

function getCenter(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getHookCircle() {
    const hookRect = hookElement.getBoundingClientRect();
    const c = getCenter(hookRect);
    return { x: c.x, y: c.y, r: 8 };
}

function getFishMouthCircle(fish) {
    const rect = fish.getBoundingClientRect();
    const fromLeft = fish.dataset.fromLeft === '1';

    const mx = parseFloat(fish.dataset.mouthX || "0.90");
    const my = parseFloat(fish.dataset.mouthY || "0.56");
    const mr = parseFloat(fish.dataset.mouthR || "16");

    const mouthX = fromLeft ? (rect.left + rect.width * mx) : (rect.left + rect.width * (1 - mx));
    const mouthY = rect.top + rect.height * my;

    return { x: mouthX, y: mouthY, r: mr };
}

function circlesHit(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return (dx * dx + dy * dy) <= (a.r + b.r) * (a.r + b.r);
}

function attachToHook(fish) {
    if (caughtFish) return;
    caughtFish = fish;
    fishScored = false;

    if (fish._rafId) cancelAnimationFrame(fish._rafId);

    fish.classList.add('caught');
    gameWrapperElement.insertBefore(fish, lineMaskElement);

    fish.style.left = '0px';
    fish.style.top = '0px';

    updateCaughtFishPosition();
}

function updateCaughtFishPosition() {
    if (!caughtFish) return;

    const wrapperRect = gameWrapperElement.getBoundingClientRect();
    const hookRect = hookElement.getBoundingClientRect();
    const hookCenter = getCenter(hookRect);

    const fishW = parseFloat(caughtFish.style.width) || caughtFish.getBoundingClientRect().width;
    const fishH = parseFloat(caughtFish.style.height) || caughtFish.getBoundingClientRect().height;

    const offX = parseFloat(caughtFish.dataset.hookOffX || "0");
    const offY = parseFloat(caughtFish.dataset.hookOffY || "0");

    const x = hookCenter.x - wrapperRect.left - fishW / 2 + offX;
    const y = hookCenter.y - wrapperRect.top - fishH * 0.1 + offY;

    const maxX = gameWrapperElement.clientWidth - fishW;

    caughtFish.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    caughtFish.style.top = y + 'px';

    const hookYInWrapper = hookCenter.y - wrapperRect.top;

    if (!fishScored && hookYInWrapper <= HOLE_Y) {
        fishScored = true;

        const pts = parseInt(caughtFish.dataset.points || "0", 10);
        score += pts;

        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = formatScore(score);

        const wrapperRect = gameWrapperElement.getBoundingClientRect();
        const hookRect = hookElement.getBoundingClientRect();

        showScorePopup(
            pts,
            hookRect.left - wrapperRect.left - 75,
            hookRect.top - wrapperRect.top - 55
        );

        caughtFish.remove();
        caughtFish = null;
    }
}

function showScorePopup(points, x, y) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;

    popup.style.left = x + 'px';
    popup.style.top = y + 'px';

    gameWrapperElement.appendChild(popup);
    setTimeout(() => popup.remove(), 900);
}

function damagePlayer() {
    const now = Date.now();
    if (now < invulnerableUntil) return;

    invulnerableUntil = now + INVULN_MS;
    lives = Math.max(0, lives - 1);

    if (!paused) playDamageFX();

    renderHearts();

    if (lives === 0) {
        gameOver();
    }
}

function spawnHazard() {
    const hazardData = pickHazardByRarity();

    const fromLeft = Math.random() < 0.5;
    const scale = hazardData.minScale + Math.random() * (hazardData.maxScale - hazardData.minScale);

    const wrapW = waterAreaElement.clientWidth;
    const wrapH = waterAreaElement.clientHeight;

    const item = (hazardData.type === 'img') ? document.createElement('img') : document.createElement('div');
    item.classList.add('fish');

    item.dataset.isHazard = '1';
    item.dataset.hitR = hazardData.hitR;
    item.dataset.scale = scale;
    item.dataset.fromLeft = fromLeft ? '1' : '0';

    function continueHazardSetup(itemW, itemH) {
        const padding = 10;
        let y = 0;
        let ok = false;
        let tries = 30;

        while (!ok && tries-- > 0) {
            y = padding + Math.random() * (wrapH - itemH - padding * 2);
            ok = true;

            const existing = waterAreaElement.querySelectorAll('.fish');
            for (const other of existing) {
                if (other === item) continue;
                const otherTop = parseFloat(other.style.top) || 0;
                const otherH = other.getBoundingClientRect().height;
                if (Math.abs(y - otherTop) < Math.max(itemH, otherH) * 0.7) {
                    ok = false;
                    break;
                }
            }
        }

        item.style.top = y + 'px';
        item.style.left = fromLeft ? (-itemW - 20) + 'px' : (wrapW + 20) + 'px';
        item.style.transform = fromLeft ? 'scaleX(1)' : 'scaleX(-1)';

        waterAreaElement.appendChild(item);

        const baseSpeed = 1 + Math.random() * 2.2;
        const speed = baseSpeed / (0.7 + scale);

        let lastT = performance.now();

        function moveItem(t) {
            if (!item.isConnected) return;

            const dt = t - lastT;
            lastT = t;

            if (!paused) {
                if (hazardData.type === 'sprite') {
                    stepSprite(item, dt, hazardData.frames, hazardData.frameMap);
                }

                const x = parseFloat(item.style.left) || 0;
                const nextX = fromLeft ? x + speed : x - speed;
                item.style.left = nextX + 'px';

                const hookCircle = getHookCircle();

                const rect = item.getBoundingClientRect();
                const c = getCenter(rect);
                const hazardCircle = { x: c.x, y: c.y, r: Math.max(10, Math.min(rect.width, rect.height) * 0.28) };

                if (circlesHit(hookCircle, hazardCircle)) {
                    damagePlayer();
                    item.remove();
                    return;
                }

                if (nextX > wrapW + itemW + 100 || nextX < -itemW - 100) {
                    item.remove();
                    return;
                }
            }

            item._rafId = requestAnimationFrame(moveItem);
        }

        item._rafId = requestAnimationFrame(moveItem);
    }

    if (hazardData.type === 'img') {
        item.src = hazardData.src;
        item.onload = () => {
            const itemW = item.naturalWidth * scale;
            const itemH = item.naturalHeight * scale;
            item.style.width = itemW + 'px';
            item.style.height = itemH + 'px';
            continueHazardSetup(itemW, itemH);
        };
        return;
    }

    item.classList.add('sprite');

    loadSheetSize(hazardData.sheet).then(({ w, h }) => {
        initSpriteDiv(item, hazardData.sheet, w, h, hazardData.cols, hazardData.rows, hazardData.fps, scale);

        const itemW = parseFloat(item.style.width);
        const itemH = parseFloat(item.style.height);

        continueHazardSetup(itemW, itemH);
    }).catch(() => { });
}

function spawnFish() {
    const fishData = pickFishByRarity();

    const fish = document.createElement('div');
    fish.classList.add('fish', 'sprite');

    const fromLeft = Math.random() < 0.5;
    const scale = fishData.minScale + Math.random() * (fishData.maxScale - fishData.minScale);

    fish.dataset.points = fishData.points;
    fish.dataset.scale = scale;
    fish.dataset.fromLeft = fromLeft ? '1' : '0';
    fish.dataset.mouthX = fishData.mouthX;
    fish.dataset.mouthY = fishData.mouthY;
    fish.dataset.mouthR = fishData.mouthR;
    fish.dataset.hookOffX = fishData.hookOffX || 0;
    fish.dataset.hookOffY = fishData.hookOffY || 0;

    loadSheetSize(fishData.sheet).then(({ w, h }) => {
        initSpriteDiv(fish, fishData.sheet, w, h, fishData.cols, fishData.rows, fishData.fps, scale);

        const wrapW = waterAreaElement.clientWidth;
        const wrapH = waterAreaElement.clientHeight;

        const fishW = parseFloat(fish.style.width);
        const fishH = parseFloat(fish.style.height);

        const padding = 10;
        let y = 0;
        let ok = false;
        let tries = 30;

        while (!ok && tries-- > 0) {
            y = padding + Math.random() * (wrapH - fishH - padding * 2);
            ok = true;

            const existing = waterAreaElement.querySelectorAll('.fish');
            for (const other of existing) {
                if (other === fish) continue;
                const otherTop = parseFloat(other.style.top) || 0;
                const otherH = other.getBoundingClientRect().height;
                if (Math.abs(y - otherTop) < Math.max(fishH, otherH) * 0.7) {
                    ok = false;
                    break;
                }
            }
        }

        fish.style.top = y + 'px';
        fish.style.left = fromLeft ? (-fishW - 20) + 'px' : (wrapW + 20) + 'px';
        fish.style.transform = fromLeft ? 'scaleX(1)' : 'scaleX(-1)';

        waterAreaElement.appendChild(fish);

        const baseSpeed = 1 + Math.random() * 2;
        const speed = baseSpeed / (0.7 + scale);

        let lastT = performance.now();

        function moveFish(t) {
            if (!fish.isConnected) return;
            if (fish === caughtFish) return;

            const dt = t - lastT;
            lastT = t;

            if (!paused) {
                stepSprite(fish, dt, fishData.frames);

                const x = parseFloat(fish.style.left) || 0;
                const nextX = fromLeft ? x + speed : x - speed;
                fish.style.left = nextX + 'px';

                if (!caughtFish) {
                    const hookCircle = getHookCircle();
                    const mouthCircle = getFishMouthCircle(fish);
                    if (circlesHit(hookCircle, mouthCircle)) {
                        attachToHook(fish);
                        return;
                    }
                }

                if (nextX > wrapW + fishW + 100 || nextX < -fishW - 100) {
                    fish.remove();
                    return;
                }
            }

            fish._rafId = requestAnimationFrame(moveFish);
        }

        fish._rafId = requestAnimationFrame(moveFish);
    }).catch(() => { });
}

document.addEventListener('mousemove', () => {
    if (paused) return;
    updateCaughtFishPosition();
});

const HEART_FULL_SRC = '../images/heart-full.png';
const HEART_EMPTY_SRC = '../images/heart-empty.png';

function renderHearts() {
    const heartsEl = document.getElementById('hearts');
    if (!heartsEl) return;

    heartsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const img = document.createElement('img');
        img.className = 'heart';
        img.src = (i < lives) ? HEART_FULL_SRC : HEART_EMPTY_SRC;
        img.alt = (i < lives) ? 'Full heart' : 'Empty heart';
        heartsEl.appendChild(img);
    }
}

renderHearts();


document.getElementById('btn-ui-pause')?.addEventListener('click', () => {
    if (paused) resumeGame();
    else pauseGame();
});

document.getElementById('btn-ui-mute')?.addEventListener('click', () => {
    document.getElementById('btn-mute')?.click();
    updateMuteUI(audioState.muted);
});

window.addEventListener('blur', () => { if (!inCountdown) pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !inCountdown) pauseGame(); });

document.addEventListener('keydown', (e) => {
    if (inCountdown) return;

    if (e.key === 'Escape') {
        if (paused) {
            if (isAudioOpen()) closeAudioPanel();
            else resumeGame();
        } else {
            pauseGame();
        }
    }

    if (paused && isAudioOpen()) {
        const key = e.key.toLowerCase();

        if (key === 'm') {
            e.preventDefault();
            document.getElementById('btn-mute')?.click();
            return;
        }

        const active = document.activeElement;
        const hovered = document.querySelector('#audio-panel input[type="range"].is-hot');
        const target = (active && active.tagName === 'INPUT' && active.type === 'range')
            ? active
            : hovered
                ? hovered
                : document.getElementById('musicVol');

        if (!target) return;

        const big = e.shiftKey ? 5 : 1;

        if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeRange(target.id, -big); }
        if (e.key === 'ArrowRight') { e.preventDefault(); nudgeRange(target.id, +big); }
    }

});

document.getElementById('btn-resume')?.addEventListener('click', () => resumeGame());

document.getElementById('btn-restart')?.addEventListener('click', () => {
    hideGameOverOverlay();
    waterAreaElement.querySelectorAll('.fish').forEach(e => e.remove());
    caughtFish?.remove();
    caughtFish = null;

    score = 0;
    lives = 3;
    fishScored = false;

    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = formatScore(score);

    renderHearts();

    gameStarted = false;
    paused = false;

    hidePauseOverlay();
    showPausePanel();

    resetLineAndHook();
    startCountdown();
});

document.getElementById('btn-go-menu')?.addEventListener('click', () => {
    window.location.href = 'index.html';
});

document.getElementById('btn-go-restart')?.addEventListener('click', () => {
    hideGameOverOverlay();
    document.getElementById('btn-restart')?.click();
});

startCountdown();
renderAudioUIFromState();
updateMuteUI(audioState.muted);

function positionUIToScreenEdges() {
    const pad = 18;

    const mute = document.getElementById('btn-ui-mute');
    const pause = document.getElementById('btn-ui-pause');
    const hint = document.getElementById('hint-box');
    const mascot = document.querySelector('.mascot');

    if (mute) {
        mute.style.left = pad + "px";
        mute.style.top = pad + "px";
    }

    if (pause) {
        const w = pause.offsetWidth || 44;
        pause.style.left = (window.innerWidth - w - pad) + "px";
        pause.style.top = pad + "px";
    }

    if (hint) {
        const h = hint.offsetHeight || 70;
        hint.style.left = pad + "px";
        hint.style.top = (window.innerHeight - h - pad) + "px";
    }

    if (mascot) {
        const w = mascot.offsetWidth || 120;
        const h = mascot.offsetHeight || 120;
        mascot.style.left = (window.innerWidth - w - pad) + "px";
        mascot.style.top = (window.innerHeight - h - pad) + "px";
    }
}

window.addEventListener("load", positionUIToScreenEdges);
window.addEventListener("resize", positionUIToScreenEdges);
setTimeout(positionUIToScreenEdges, 0);