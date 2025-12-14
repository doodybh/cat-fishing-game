const fishingLineElement = document.querySelector('.fishing-line');
const topOfLine = window.innerHeight * 0.31;
document.addEventListener('mousemove', (mouseEvent) => {
    console.log(mouseEvent.clientY);
    let lineHeight = mouseEvent.clientY - topOfLine;
fishingLineElement.style.height = lineHeight
})