// MEMO: Maximum width of the path of totality is about 250 km

/**
 * Compute limits for the Penumbral path.
 * 
 * @param {*} eclipse 
 *      The eclipse object.
 * @param {*} spatialRes
 *      The spatial resolution in degrees.
 * @param {*} temporalRes 
 *      The temporal resolution in Julian days.
 * @returns Spatial and temporal limits for the eclipse.
 */
function computeLimits(eclipse, spatialRes, temporalRes)
{
    const timeGreg = orbitsjs.timeGregorian(eclipse.JTmax);
    const JTEclstart = orbitsjs.timeJulianYmdhms(timeGreg.year, timeGreg.month, timeGreg.mday, 
        timeGreg.hour, -5*60, 1);
    const JTEclend = orbitsjs.timeJulianYmdhms(timeGreg.year, timeGreg.month, timeGreg.mday, 
        timeGreg.hour, 5*60, 1);

    const gridParams = orbitsjs.eclipseMagGrid(JTEclstart.JT, JTEclend.JT, temporalRes, 
    0, 360, -90, 90, spatialRes);
    
    return {
        latMin : gridParams.latMin,
        latMax : gridParams.latMax,
        lonMin : gridParams.lonMin,
        lonMax : gridParams.lonMax,
        JTmin : gridParams.JTmin,
        JTmax : gridParams.JTmax,
        spatialRes : spatialRes,
        temporalRes : temporalRes
    };
}

/**
 * Convert array of contours to array of points. 
 * 
 * @param {*} contours 
 *      Array of contours.
 * @returns 
 */
function contourToPoints(contours)
{
    let contourPoints = [];

    for (let indValues = 0; indValues < Object.keys(contours).length; indValues++)
    {
        const value = Object.keys(contours)[indValues];
        const lines = contours[value];
    
        const points = [];
        for (let indLine = 0; indLine < lines.length; indLine++)
        {
            const line = lines[indLine];
            const pStart = orbitsjs.coordWgs84Efi(line[0][0], line[0][1], 10000.0);
            const pEnd = orbitsjs.coordWgs84Efi(line[1][0], line[1][1], 10000.0);        
            points.push(orbitsjs.vecMul(pStart, 0.001));
            points.push(orbitsjs.vecMul(pEnd, 0.001));
        }
        contourPoints.push(points);
    }

    return contourPoints;
}

/**
 * Create contours for magnitude, umbra and maximums at specific moments.
 * 
 * @param {*} limits 
 *      Limits for the brute force computation.
 * @param {*} spatialRes 
 *      The spatial resolution in degrees.
 * @param {*} temporalRes 
 *      The temperal resolution in Julian days.
 * @returns Object with contours.
 */
function createContours(limits, spatialRes, temporalRes)
{
    const gridData = orbitsjs.eclipseMagGrid(limits.JTmin - 10/1440, limits.JTmax + 10/1440,
                                             temporalRes, 
                                             limits.lonMin-5, limits.lonMax+5, 
                                             limits.latMin-5, limits.latMax+5, spatialRes);

    const contoursMag = orbitsjs.createContours(limits.lonMin-5, limits.lonMax+5, 
                    limits.latMin-5, limits.latMax+5, 
                    spatialRes, gridData.magArray, 
                    [0.001, 0.2, 0.4, 0.6, 0.8], [100.0]);

    const contoursUmbra = orbitsjs.createContours(limits.lonMin-5, limits.lonMax+5, 
                        limits.latMin-5, limits.latMax+5, 
                        spatialRes, gridData.inUmbraArray, 
                        [0.99], [100.0]);

    const timeGregMin = orbitsjs.timeGregorian(limits.JTmin);
    const timeGregMax = orbitsjs.timeGregorian(limits.JTmax);
    const derJTmin = orbitsjs.timeJulianYmdhms(timeGregMin.year, timeGregMin.month, timeGregMin.mday, 
        timeGregMin.hour + 1, 0, 0).JT;
    const derJTmax = orbitsjs.timeJulianYmdhms(timeGregMax.year, timeGregMax.month, timeGregMax.mday, 
        timeGregMax.hour - 1, 0, 0).JT;
                    
    const derContours = [];
    let ind_curve = 0;
    for (let derJT = derJTmin; derJT <= derJTmax; derJT += 1/48)
    {
        ind_curve++;
        const derGreg = orbitsjs.timeGregorian(derJT);
        //console.log(derGreg);
    
        const gridDataDer = orbitsjs.eclipseMagDerGrid(derJT, 
            limits.lonMin-5, limits.lonMax+5, 
            limits.latMin-5, limits.latMax+5, spatialRes);
        const contours = orbitsjs.createContours(limits.lonMin-5, limits.lonMax+5, 
            limits.latMin-5, limits.latMax+5, spatialRes, gridDataDer, [0.0], [100.0]);
    
        const lines = contours[0];
    
        const points = [];
        for (let indLine = 0; indLine < lines.length; indLine++)
        {
            const line = lines[indLine];
            const pStart = orbitsjs.coordWgs84Efi(line[0][0], line[0][1], 10000.0);
            const pEnd   = orbitsjs.coordWgs84Efi(line[1][0], line[1][1], 10000.0);
    
            points.push(orbitsjs.vecMul(pStart, 0.001));
            points.push(orbitsjs.vecMul(pEnd, 0.001));
        } 
        derContours.push(points);
    }
    
    return {
        contoursMag : contoursMag, 
        contoursUmbra : contoursUmbra, 
        derContours : derContours
    };
}

function drawContours(matrix)
{
    lineShaders.colorOrbit = [255, 127, 127];
    lineShaders.setGeometry(riseSetPoints);
    lineShaders.draw(matrix);

    lineShaders.colorOrbit = [255, 0, 0];
    lineShaders.setGeometry(umbraPoints);
    lineShaders.draw(matrix);

    lineShaders.colorOrbit = [127, 127, 127];
    for (let indContour = 0; indContour < contourPoints.length; indContour++)
    {
        const points = contourPoints[indContour];
        //console.log(points);
        lineShaders.setGeometry(points);
        lineShaders.draw(matrix);
    }

    for (let indContour = 0; indContour < derContours.length; indContour++)
    {
        const points = derContours[indContour];
        //console.log(points);
        lineShaders.setGeometry(points);
        lineShaders.draw(matrix);
    }
}
