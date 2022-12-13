function createMagCaptions(derContours)
{
    const magCaptionList = [];
    const maxCaptionList = [];

    let indLongest = 0;
    let numLongest = 0;
    const levels = [0.2, 0.4, 0.6, 0.8];

    for (let indValues = 0; indValues < Object.keys(derContours).length; indValues++)
    {
        const value = Object.keys(derContours)[indValues];
        const lines = derContours[value];
    
        if (lines.length > numLongest)
        {
            numLongest = lines.length;
            indLongest = indValues;
        }

        if (lines.length > 1)
        {
            let upDir = [
                lines[0][1][1] - lines[0][0][1], 
                lines[0][1][0] - lines[0][0][0], 
                0
            ];

            const timeGreg = orbitsjs.timeGregorian(Number(value));
            //console.log(timeGreg);
            maxCaptionList.push({
                lat : lines[0][0][0]-3,
                lon : lines[0][0][1]-2,
                text : timeGreg.hour + ":" + toFixed(timeGreg.minute),
            });
        }
    }

    const lines = derContours[Object.keys(derContours)[indLongest]];
    const JT = Object.keys(derContours)[indLongest];

    magCaptionList.push({
        lat : lines[0][0][0]+0.5,
        lon : lines[0][0][1]+1,
        text : "0.0"
    });
    magCaptionList.push({
        lat : lines[lines.length - 1][1][0]+0.5,
        lon : lines[lines.length - 1][1][1]+1,
        text : "0.0"
    });


    for (let indLine = 0; indLine < lines.length; indLine++)
    {
        const pointStart = lines[indLine][0];
        const pointEnd   = lines[indLine][1];

        const osvSunEfi = orbitsjs.computeOsvSunEfi(JT);
        const osvMoonEfi = orbitsjs.computeOsvMoonEfi(JT);
        const rEnuSunStart = orbitsjs.coordEfiEnu(osvSunEfi, pointStart[0], pointStart[1], 0).r;
        const rEnuSunEnd = orbitsjs.coordEfiEnu(osvSunEfi, pointEnd[0], pointEnd[1], 0).r;
        const rEnuMoonStart = orbitsjs.coordEfiEnu(osvMoonEfi, pointStart[0], pointStart[1], 0).r;
        const rEnuMoonEnd = orbitsjs.coordEfiEnu(osvMoonEfi, pointEnd[0], pointEnd[1], 0).r;

        const valueStart = orbitsjs.eclipseMagnitude(rEnuSunStart, rEnuMoonStart).mag;
        const valueEnd   = orbitsjs.eclipseMagnitude(rEnuSunEnd, rEnuMoonEnd).mag;

        for (let indLevel = 0; indLevel < levels.length; indLevel++)
        {
            const level = levels[indLevel];

            if (Math.sign(valueStart - level) != Math.sign(valueEnd - level))
            {
                let upDir = [
                    lines[indLine][1][1] - lines[indLine][0][1], 
                    lines[indLine][1][0] - lines[indLine][0][0], 
                    0
                ];
    
                console.log(pointStart + " " + level);

                magCaptionList.push({
                    lat : pointStart[0]+0.5,
                    lon : pointStart[1]+1,
                    text : level.toString(),
                });
            }
        }
    }
    return {maxCaptions : maxCaptionList, magCaptions : magCaptionList};
}

function drawCaptions(matrix, captions)
{
    for (let indCaption = 0; indCaption < captions.length; indCaption++)
    {
        const caption = captions[indCaption];
        drawText(matrix, caption.lat, caption.lon, caption.text, caption.upDir);
    }    
}