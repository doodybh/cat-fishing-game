const mainCatPictureElement = document.getElementById('main-cat-picture');
const infoButtonElement = document.getElementById('info-button')
const infoModalElement = document.getElementById('info-modal')
const closeButtonElement = document.getElementById('close-button')
const overlayElement = document.getElementById('overlay')

mainCatPictureElement.addEventListener('mouseover', () => mainCatPictureElement.src = "./images/catmeow.png");

mainCatPictureElement.addEventListener('mouseout', () => mainCatPictureElement.src = "./images/catwalking.png");


infoButtonElement.addEventListener('click', () => {
    infoModalElement.style.display = 'block';
    overlayElement.classList.add('active');
});

closeButtonElement.addEventListener('click', () => {
    infoModalElement.style.display = 'none';
    overlayElement.classList.remove('active');
});
