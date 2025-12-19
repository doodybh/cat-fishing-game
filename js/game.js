const fishingLineElement = document.getElementById('fishing-line');
const gameWrapperElement = document.querySelector('.game-wrapper');
const lineMaskElement = document.getElementById('line-mask');

const LINE_TOP_OFFSET = 155;
const HOOK_HEIGHT = 40;

document.addEventListener('mousemove', (mouseEvent) => {
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

const fishImages = [
    { src: '../images/fish1.gif', minScale: 0.55, maxScale: 0.85, points: 10, weight: 40, mouthX: 0.88, mouthY: 0.56, mouthR: 14, hookOffX: -5 },
    { src: '../images/fish2.gif', minScale: 0.70, maxScale: 1.05, points: 20, weight: 30, mouthX: 0.88, mouthY: 0.56, mouthR: 14, hookOffX: -5 },
    { src: '../images/fish3.gif', minScale: 0.85, maxScale: 1.25, points: 35, weight: 18, mouthX: 0.87, mouthY: 0.56, mouthR: 12, hookOffX: -5 },
    { src: '../images/fish4.gif', minScale: 1.00, maxScale: 1.45, points: 90, weight: 8, mouthX: 0.86, mouthY: 0.56, mouthR: 10 },
    { src: '../images/fish5.gif', minScale: 1.10, maxScale: 1.60, points: 80, weight: 4, mouthX: 0.85, mouthY: 0.56, mouthR: 9, hookOffX: -18, hookOffY: -30 }

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
        if (scoreEl) scoreEl.textContent = score;

        caughtFish.remove();
        caughtFish = null;
    }
}

function spawnFish() {
    const fishData = pickFishByRarity();


    const fish = document.createElement('img');
    fish.classList.add('fish');
    fish.src = fishData.src;

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

    fish.onload = () => {
        const wrapW = waterAreaElement.clientWidth;
        const wrapH = waterAreaElement.clientHeight;

        const fishW = fish.naturalWidth * scale;
        const fishH = fish.naturalHeight * scale;

        fish.style.width = fishW + 'px';
        fish.style.height = fishH + 'px';

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

        function moveFish() {
            if (!fish.isConnected) return;
            if (fish === caughtFish) return;

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

            fish._rafId = requestAnimationFrame(moveFish);
        }

        moveFish();
    };
}

document.addEventListener('mousemove', () => {
    updateCaughtFishPosition();
});

spawnFish();
setInterval(spawnFish, 4000);
