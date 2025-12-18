const fishingLineElement = document.getElementById('fishing-line');
const gameWrapperElement = document.querySelector('.game-wrapper');

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

const fishImages = [
    { src: '../images/fish1.gif', minScale: 0.55, maxScale: 0.85, points: 10, weight: 40 },
    { src: '../images/fish2.gif', minScale: 0.70, maxScale: 1.05, points: 20, weight: 30 },
    { src: '../images/fish3.gif', minScale: 0.85, maxScale: 1.25, points: 35, weight: 18 },
    { src: '../images/fish4.gif', minScale: 1.00, maxScale: 1.45, points: 55, weight: 8 },
    { src: '../images/fish5.gif', minScale: 1.10, maxScale: 1.60, points: 80, weight: 4 }
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

function spawnFish() {
    const fishData = pickFishByRarity();

    const fish = document.createElement('img');
    fish.classList.add('fish');
    fish.src = fishData.src;

    const fromLeft = Math.random() < 0.5;
    const scale = fishData.minScale + Math.random() * (fishData.maxScale - fishData.minScale);

    fish.dataset.points = fishData.points;
    fish.dataset.scale = scale;

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
            const x = parseFloat(fish.style.left) || 0;
            const nextX = fromLeft ? x + speed : x - speed;
            fish.style.left = nextX + 'px';

            if (nextX > wrapW + fishW + 100 || nextX < -fishW - 100) {
                fish.remove();
                return;
            }

            requestAnimationFrame(moveFish);
        }

        moveFish();
    };
}

spawnFish();
setInterval(spawnFish, 4000);