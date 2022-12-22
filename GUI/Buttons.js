const prevButton = document.getElementById("buttonPrev");
const nextButton = document.getElementById("buttonNext");
nextButton.onclick = function() 
{
    pendingLoad = (indEclipse + 1) % listEclipses.length;
}
prevButton.onclick = function() 
{
    pendingLoad = indEclipse - 1;
    if (pendingLoad < 0)
    {
        pendingLoad = listEclipses.length - 1;
    }
}
