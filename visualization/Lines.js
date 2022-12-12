/**
 * Compute Besselian central line.
 * 
 * @param {*} limits 
 *      Limits object.
 * @param {*} timeStep
 *      Time step.
 * @returns Array of points in EFI frame (km).
 */
function computeCentralLine(eclipse, limits, timeStep)
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
 * Compute first and last contacts of the umbra and the penumbra.
 * 
 * @param {*} limits 
 *     Time limits.
 * @returns Object with first and last contacts of the umbra and the penumbra.
 */
function computeFirstLastContact(eclipse, limits)
{
    let JTfirst = NaN;
    let JTlast = NaN;
    let lonFirst = NaN;
    let latFirst = NaN;
    let lonLast = NaN;
    let latLast = NaN;

    let JTfirstUmbra = NaN;
    let JTlastUmbra = NaN;
    let lonFirstUmbra = NaN;
    let latFirstUmbra = NaN;
    let lonLastUmbra = NaN;
    let latLastUmbra = NaN;


    for (let JT = limits.JTmin; JT < limits.JTmax; JT += 2/1440)
    {
        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
        const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
        const points = orbitsjs.besselianRiseSet(bessel);
    
        if (points.length > 0)
        {
            JTfirst = JT;
            break;
        }
    }
    if (!isNaN(JTfirst))
    {
        for (let JT = JTfirst - 2/1440; JT <= JTfirst; JT += 1/86400)
        {
            const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
            const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
            const points = orbitsjs.besselianRiseSet(bessel);
        
            if (points.length > 0)
            {
                JTfirst = JT;

                const osvFund = {
                    r : [points[0][0], points[0][1], 0],
                    v : [0, 0, 0],
                    JT : JT
                };
                const osvToD = orbitsjs.coordFundTod(osvFund, bessel.a, bessel.d);
                const de = 6378137;
            
                osvToD.r = orbitsjs.vecMul(osvToD.r, de);
                const osvPef = orbitsjs.coordTodPef(osvToD);
                const osvEfi = orbitsjs.coordPefEfi(osvPef, 0, 0);
                const wgs84 = orbitsjs.coordEfiWgs84(osvEfi.r);
                lonFirst = wgs84.lon;
                latFirst = wgs84.lat;
            
                break;
            }
        }
    }

    for (let JT = limits.JTmax; JT > limits.JTmin; JT -= 2/1440)
    {
        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
        const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
        const points = orbitsjs.besselianRiseSet(bessel);
    
        if (points.length > 0)
        {
            JTlast = JT;
            break;
        }
    }
    if (!isNaN(JTlast))
    {
        for (let JT = JTlast + 2/1440; JT >= JTlast; JT -= 1/86400)
        {
            const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
            const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
            const points = orbitsjs.besselianRiseSet(bessel);
        
            if (points.length > 0)
            {
                JTlast= JT;

                const osvFund = {
                    r : [points[0][0], points[0][1], 0],
                    v : [0, 0, 0],
                    JT : JT
                };
                const osvToD = orbitsjs.coordFundTod(osvFund, bessel.a, bessel.d);
                const de = 6378137;
            
                osvToD.r = orbitsjs.vecMul(osvToD.r, de);
                const osvPef = orbitsjs.coordTodPef(osvToD);
                const osvEfi = orbitsjs.coordPefEfi(osvPef, 0, 0);
                const wgs84 = orbitsjs.coordEfiWgs84(osvEfi.r);
                lonLast = wgs84.lon;
                latLast = wgs84.lat;
            
                break;
            }
        }
    }




    for (let JT = limits.JTmin; JT < limits.JTmax; JT += 2/1440)
    {
        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
        const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
        const points = orbitsjs.besselianRiseSet(bessel);
    
        if (!isNaN(centralLineJT.zeta))
        {
            JTfirstUmbra = JT;
            break;
        }
    }
    if (!isNaN(JTfirstUmbra))
    {
        for (let JT = JTfirstUmbra - 2/1440; JT <= JTfirstUmbra; JT += 1/86400)
        {
            const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
            const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
            const points = orbitsjs.besselianRiseSet(bessel);

            if (!isNaN(centralLineJT.zeta))
            {
                JTfirstUmbra = JT;

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
        
                lonFirstUmbra = wgs84.lon;
                latFirstUmbra = wgs84.lat;
                break;
            }
        }
    }

    for (let JT = limits.JTmax; JT > limits.JTmin; JT -= 2/1440)
    {
        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
        const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
        const points = orbitsjs.besselianRiseSet(bessel);
    
        if (!isNaN(centralLineJT.zeta))
        {
            JTlastUmbra = JT;
            break;
        }
    }
    if (!isNaN(JTlastUmbra))
    {
        for (let JT = JTlastUmbra + 2/1440; JT >= JTlastUmbra; JT -= 1/86400)
        {
            const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
            const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
            const points = orbitsjs.besselianRiseSet(bessel);
        
            if (!isNaN(centralLineJT.zeta))
            {
                JTlastUmbra = JT;

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
        
                lonLastUmbra = wgs84.lon;
                latLastUmbra = wgs84.lat;
                break;
            }
        }
    }


    return {
        latFirstPenumbra : latFirst,
        lonFirstPenumbra : lonFirst,
        latLastPenumbra : latLast,
        lonLastPenumbra : lonLast,
        JTfirstPenumbra : JTfirst,
        JTlastPenumbra : JTlast,
        latFirstUmbra : latFirstUmbra,
        lonFirstUmbra : lonFirstUmbra,
        latLastUmbra : latLastUmbra,
        lonLastUmbra : lonLastUmbra,
        JTfirstUmbra : JTfirstUmbra,
        JTlastUmbra : JTlastUmbra
    };
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
function computeRiseSet(eclipse, limits, timeStep)
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
    lineShaders.colorOrbit = [0, 255, 0];
    lineShaders.setGeometry(riseSetPoints);
    lineShaders.draw(matrix);
}

/**
 * Draw central line.
 * 
 * @param {*} matrix 
 *     View matrix.
 * @param {*} contactPoints 
 *     The contact point object.
 */
function drawContactPoints(matrix, contactPoints)
{
    const p = [];
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latFirstPenumbra-1, contactPoints.lonFirstPenumbra, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latFirstPenumbra+1, contactPoints.lonFirstPenumbra, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latFirstPenumbra, contactPoints.lonFirstPenumbra-1, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latFirstPenumbra, contactPoints.lonFirstPenumbra+1, 10000), 0.001));

    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latLastPenumbra-1, contactPoints.lonLastPenumbra, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latLastPenumbra+1, contactPoints.lonLastPenumbra, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latLastPenumbra, contactPoints.lonLastPenumbra-1, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latLastPenumbra, contactPoints.lonLastPenumbra+1, 10000), 0.001));

    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latFirstUmbra-1, contactPoints.lonFirstUmbra, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latFirstUmbra+1, contactPoints.lonFirstUmbra, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latFirstUmbra, contactPoints.lonFirstUmbra-1, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latFirstUmbra, contactPoints.lonFirstUmbra+1, 10000), 0.001));

    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latLastUmbra-1, contactPoints.lonLastUmbra, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latLastUmbra+1, contactPoints.lonLastUmbra, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latLastUmbra, contactPoints.lonLastUmbra-1, 10000), 0.001));
    p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(contactPoints.latLastUmbra, contactPoints.lonLastUmbra+1, 10000), 0.001));

    lineShaders.colorOrbit = [255, 255, 255];
    lineShaders.setGeometry(p);
    lineShaders.draw(matrix);

    drawText(matrix, contactPoints.latFirstPenumbra, contactPoints.lonFirstPenumbra+2, 'P1', [255, 255, 255]);
    drawText(matrix, contactPoints.latFirstUmbra, contactPoints.lonFirstUmbra+2, 'P2', [255, 255, 255]);
    drawText(matrix, contactPoints.latLastUmbra, contactPoints.lonLastUmbra+2, 'P3', [255, 255, 255]);
    drawText(matrix, contactPoints.latLastPenumbra, contactPoints.lonLastPenumbra+2, 'P4', [255, 255, 255]);
}
const charLineMap = {
    '1' : [[0.5, 0.0, 0.5, 1.0]],
    '2' : [[1.0, 0.0, 0.0, 0.0], 
           [0.0, 0.0, 0.0, 0.5],
           [0.0, 0.5, 1.0, 0.5],
           [1.0, 0.5, 1.0, 1.0],
           [1.0, 1.0, 0.0, 1.0]],
    '3' : [[0.0, 1.0, 1.0, 1.0],
           [1.0, 1.0, 1.0, 0.0],
           [0.0, 0.5, 1.0, 0.5],
           [0.0, 0.0, 1.0, 0.0]],
    '4' : [[0.0, 1.0, 0.0, 0.5],
           [0.0, 0.5, 1.0, 0.5],
           [1.0, 1.0, 1.0, 0.0]],
    '5' : [[1.0, 1.0, 0.0, 1.0],
           [0.0, 1.0, 0.0, 0.5],
           [0.0, 0.5, 1.0, 0.5],
           [1.0, 0.5, 1.0, 0.0],
           [0.0, 0.0, 1.0, 0.0]],
    '6' : [[0.0, 0.0, 0.0, 1.0],
           [0.0, 0.0, 1.0, 0.0],
           [1.0, 0.0, 1.0, 0.5],
           [0.0, 0.5, 1.0, 0.5]],
    '7' : [[0.0, 1.0, 1.0, 1.0],
           [1.0, 1.0, 0.5, 0.5],
           [0.5, 0.0, 0.5, 0.5]],
    '8' : [[0.0, 0.0, 1.0, 0.0],
           [0.0, 0.5, 1.0, 0.5],
           [0.0, 1.0, 1.0, 1.0],
           [0.0, 0.0, 0.0, 1.0],
           [1.0, 0.0, 1.0, 1.0]],
    '9' : [[0.0, 1.0, 1.0, 1.0],
           [0.0, 0.5, 1.0, 0.5],
           [0.0, 0.5, 0.0, 1.0],
           [1.0, 0.0, 1.0, 1.0]],
    '0' : [[0.0, 0.0, 0.0, 1.0],
           [0.0, 0.0, 1.0, 0.0],
           [0.0, 1.0, 1.0, 1.0],
           [1.0, 0.0, 1.0, 1.0]],
    'P' : [[0.0, 0.0, 0.0, 1.0],
           [0.0, 1.0, 1.0, 1.0],
           [0.0, 0.5, 1.0, 0.5],
           [1.0, 0.5, 1.0, 1.0]],
    ':' : [[0.4, 0.2, 0.6, 0.2],
           [0.6, 0.2, 0.6, 0.4],
           [0.4, 0.4, 0.6, 0.4],
           [0.4, 0.2, 0.4, 0.4],
           [0.4, 0.6, 0.6, 0.6],
           [0.6, 0.6, 0.6, 0.8],
           [0.4, 0.8, 0.6, 0.8],
           [0.4, 0.6, 0.4, 0.8]],
    '.' : [[0.4, 0.0, 0.6, 0.0],
           [0.6, 0.0, 0.6, 0.2],
           [0.4, 0.2, 0.6, 0.2],
           [0.4, 0.0, 0.4, 0.2]]
};
function drawText(matrix, lat, lon, s, color, upDir)
{
    if (upDir === undefined)
    {
        upDir = [0, 1, 0];
    }
    upDir = orbitsjs.vecMul(upDir, 1.0 / orbitsjs.norm(upDir));
    const angleUp = orbitsjs.atan2d(upDir[1], upDir[0]);
    const rightDir = [orbitsjs.cosd(angleUp - 90), orbitsjs.sind(angleUp - 90), 0];

    const scale = 1.0 / Math.abs(orbitsjs.cosd(lat));

    const p = [];
    for (let indChar = 0; indChar < s.length; indChar++)
    {
        const latStart = lat + rightDir[1] * indChar * 1.0 * scale;
        const lonStart = lon + rightDir[0] * indChar * 0.8 * scale;

        if (!charLineMap.hasOwnProperty(s[indChar]))
        {
            continue;
        }

        lines = charLineMap[s[indChar]];

        for (let indLine = 0; indLine < lines.length; indLine++)
        {
            const line = lines[indLine];
            //let pointStart = orbitsjs.coordWgs84Efi(latStart + line[1], lonStart + line[0]*0.6, 10000);
            //let pointEnd = orbitsjs.coordWgs84Efi(latStart + line[3], lonStart + line[2]*0.6, 10000);
            let pointStart = orbitsjs.coordWgs84Efi(
                latStart + 1.0*(line[1] * upDir[1] + line[0] * rightDir[1]) * scale, 
                lonStart + 0.6*(line[1] * upDir[0] + line[0] * rightDir[0]) * scale, 
                10000);
            let pointEnd = orbitsjs.coordWgs84Efi(
                latStart + 1.0*(line[3] * upDir[1] + line[2] * rightDir[1]) * scale, 
                lonStart + 0.6*(line[3] * upDir[0] + line[2] * rightDir[0]) * scale, 
                10000);
            p.push(orbitsjs.vecMul(pointStart, 0.001));
            p.push(orbitsjs.vecMul(pointEnd, 0.001));
        }
    }

    if (color === undefined)
    {
        color = [127, 127, 127];
    }
    lineShaders.colorOrbit = color;
    lineShaders.setGeometry(p);
    lineShaders.draw(matrix);
}