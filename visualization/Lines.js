/**
 * Compute Besselian central line.
 * 
 * @param {*} limits 
 *      Limits object.
 * @param {*} timeStep
 *      Time step.
 * @returns Array of points in EFI frame (km).
 */
function computeCentralLine(limits, timeStep)
{
    const centralLine = [];

    for (let JT = limits.JTmin - limits.temporalRes; JT < limits.JTmax + limits.temporalRes; JT += timeStep)
    {
        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
        const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
    
        if (!isNaN(centralLineJT.zeta))
        {                       
            const osvFund = {
                r : [bessel.x, bessel.y, centralLineJT.zeta],
                v : [0, 0, 0],
                JT : JT
            };
            const osvToD = orbitsjs.coordFundTod(osvFund, bessel.a, bessel.d);
            const de = 6378137;
    
            osvToD.r = orbitsjs.vecMul(osvToD.r, de);
            const osvPef = orbitsjs.coordTodPef(osvToD);
            const osvEfi = orbitsjs.coordPefEfi(osvPef, 0, 0);
            const wgs84 = orbitsjs.coordEfiWgs84(osvEfi.r);
    
            centralLine.push(orbitsjs.vecMul(osvEfi.r, 0.001));
        }
    }

    return centralLine;
}

/**
 * Compute rise and set curves.
 * 
 * @param {*} limits 
 *      The limits object.
 * @param {*} timeStep 
 *      The timestep.
 * @returns Array of points in EFI frame (km).
 */
function computeRiseSet(limits, timeStep)
{
    const riseSetPoints = [];

    for (let JT = limits.JTmin - limits.temporalRes; JT < limits.JTmax + limits.temporalRes; JT += timeStep)
    {
        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
        const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
        const points = orbitsjs.besselianRiseSet(bessel);
    
        if (points.length > 0)
        {
            const de = 6378137;
            const osvFund2 = {r: [points[0][0], points[0][1], 0], v : [0, 0, 0], JT : JT};
            const osvToD2 = orbitsjs.coordFundTod(osvFund2, bessel.a, bessel.d);
            osvToD2.r = orbitsjs.vecMul(osvToD2.r, de);
            const osvPef2 = orbitsjs.coordTodPef(osvToD2);
            const osvEfi2 = orbitsjs.coordPefEfi(osvPef2, 0, 0);
            const wgs842 = orbitsjs.coordEfiWgs84(osvEfi2.r);
    
            const osvFund3 = {r: [points[1][0], points[1][1], 0], v : [0, 0, 0], JT : JT};
            const osvToD3 = orbitsjs.coordFundTod(osvFund3, bessel.a, bessel.d);
            osvToD3.r = orbitsjs.vecMul(osvToD3.r, de);
            const osvPef3 = orbitsjs.coordTodPef(osvToD3);
            const osvEfi3 = orbitsjs.coordPefEfi(osvPef3, 0, 0);
            const wgs843 = orbitsjs.coordEfiWgs84(osvEfi3.r);
    
            riseSetPoints.push(orbitsjs.vecMul(osvEfi2.r, 0.001));
            riseSetPoints.push(orbitsjs.vecMul(osvEfi3.r, 0.001));
        }
    }

    return riseSetPoints;
}

/**
 * Draw distant circle corresponding to the equator of the Earth.
 * 
 * @param {*} matrix 
 *      The view matrix.
 */
function drawEquator(matrix)
{
    lineShaders.colorOrbit = [127, 127, 127];
    const pEquator = [];
    // Distance to the object in the visualization space.
    const D = 0.5 * zFar;

    for (let lon = 0; lon <= 360; lon++)
    {
        const p = [D * orbitsjs.cosd(lon),
                   D * orbitsjs.sind(lon), 
                   0];

        pEquator.push(p);
        if (lon != 0 && lon != 360)
        {
            pEquator.push(p);
        }
    }
    lineShaders.setGeometry(pEquator);
    lineShaders.draw(matrix);
}

/**
 * Draw distant circle corresponding to the Ecliptic Plane.
 * 
 * @param {*} matrix 
 *      The view matrix.
 * @param {*} nutPar 
 *      The nutation parameters.
 * @param {*} JT 
 *      Julian time.
 */
function drawEcliptic(matrix, nutPar, JT)
{
    lineShaders.colorOrbit = [127, 127, 127];
    const pSun = [];
    // Distance to the object in the visualization space.
    const D = 0.5 * zFar;

    for (let lon = 0; lon <= 360; lon++)
    {
        const p = [D * orbitsjs.cosd(lon),
                   D * orbitsjs.sind(lon), 
                   0];

        const osvJ2000 = orbitsjs.coordEclEq({r : p, v : [0, 0, 0], JT : JT});
        const osvMoD = orbitsjs.coordJ2000Mod(osvJ2000);
        const osvToD = orbitsjs.coordModTod(osvMoD, nutPar);
        const osvPef = orbitsjs.coordTodPef(osvToD);
        const osvEfi = osvPef;

        pSun.push(osvPef.r);
        if (lon != 0 && lon != 360)
        {
            pSun.push(osvPef.r);
        }
    }

    lineShaders.setGeometry(pSun);
    lineShaders.draw(matrix);
}

/**
 * Draw central line.
 * 
 * @param {*} matrix 
 *     View matrix.
 * @param {*} lat 
 *     Current latitude on the central line.
 * @param {*} lon 
 *     Current longitude on the central line.
 * @param {*} rECEFMoon 
 *     Position of the moon in the ECEF frame.
 * @param {*} centralLine 
 *     The central line.
 */
function drawCentralLine(matrix, lat, lon, rECEFMoon, centralLine)
{
    const D = 0.5 * zFar;
    const p = [];

    p.push(orbitsjs.vecMul(rECEFMoon, D/orbitsjs.norm(rECEFMoon)));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon, 0), 0.001));
    //p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat-1, lon, 0), 0.001));
    //p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat+1, lon, 0), 0.001));
    //p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon-1, 0), 0.001));
    //p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon+1, 0), 0.001));

    lineShaders.colorOrbit = [255, 255, 255];
    lineShaders.setGeometry(p);
    lineShaders.draw(matrix);

    lineShaders.colorOrbit = [255, 255, 255];
    lineShaders.setGeometry(centralLine);
    lineShaders.draw(matrix);
}

/**
 * Draw rise and set points.
 * 
 * @param {*} matrix 
 *      The view matrix.
 * @param {*} riseSetPoints 
 *      The rise and set points.
 */
function drawRiseSet(matrix, riseSetPoints)
{
    lineShaders.colorOrbit = [255, 127, 127];
    lineShaders.setGeometry(riseSetPoints);
    lineShaders.draw(matrix);
}