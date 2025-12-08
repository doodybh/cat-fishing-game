const mainCatPictureElement = document.getElementById('main-cat-picture');

mainCatPictureElement.addEventListener('mouseover', () => mainCatPictureElement.src = "./images/catstanding.png");

mainCatPictureElement.addEventListener('mouseout', () => mainCatPictureElement.src = "./images/catwalking.png");
