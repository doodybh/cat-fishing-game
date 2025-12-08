const mainCatPictureElement = document.getElementById('main-cat-picture');

mainCatPictureElement.addEventListener('mouseover', () => mainCatPictureElement.src = "./images/catmeow.png");

mainCatPictureElement.addEventListener('mouseout', () => mainCatPictureElement.src = "./images/catwalking.png");
