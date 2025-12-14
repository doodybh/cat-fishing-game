const fishingLineElement = document.getElementById('fishing-line');
const topOfLine = window.innerHeight * 0.31;

document.addEventListener('mousemove', (mouseEvent) => {
    console.log(mouseEvent.clientY);
    let lineHeight = mouseEvent.clientY - topOfLine;
    if (lineHeight < 0) lineHeight = 0;
    if (lineHeight > window.innerHeight) lineHeight = window.innerHeight; 
fishingLineElement.style.height = lineHeight + 'px';
})