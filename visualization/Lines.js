
/**
 * Coordinate transform between fundamental and EFI frames.
 * 
 * @param {*} r 
 *      Position vector in the fundamental frame.
 * @param {*} bessel 
 *      Besselian elements.
 * @param {*} JT 
 *      Julian time.
 * @returns Position in EFI frame.
 */
function coordFundEfi(r, bessel, JTtdb, nutParams)
{
    const de = 6378137;
    const JTut1 = orbitsjs.correlationTdbUt1(JTtdb);
    const osvFund2 = {r: r, v : [0, 0, 0], JT : JTut1};
    const osvToD2 = orbitsjs.coordFundTod(osvFund2, bessel.a, bessel.d);
    osvToD2.r = orbitsjs.vecMul(osvToD2.r, de);
    const osvPef2 = orbitsjs.coordTodPef(osvToD2, nutParams);
    const osvEfi2 = orbitsjs.coordPefEfi(osvPef2, 0, 0);

    return osvEfi2.r;
}

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
    const T = (limits.JTmin - 2451545.0)/36525.0;
    const nutPar = orbitsjs.nutationTerms(T);

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
            const rEfi = coordFundEfi(osvFund.r, bessel, JT, nutPar);
            centralLine.push(orbitsjs.vecMul(rEfi, 0.001));
        }
    }

    return centralLine;
}

/**
 * Compute umbral line.
 * 
 * @param {*} eclipse 
 *      Solar eclipse.
 * @param {*} limits 
 *      Limits object.
 * @param {*} contactPoints
 *      Computed contact points.
 * @param {*} timeStep
 *      Time step.
 */
function computeUmbraLine(eclipse, limits, contactPoints, timeStep)
{
    const centralLine = [];
    const T = (limits.JTmin - 2451545.0)/36525.0;
    const nutPar = orbitsjs.nutationTerms(T);

    const pointsMin = [];
    const pointsMax = [];

    let JTvalues = [];
    
    if (!isNaN(contactPoints.JTfirstUmbra))
    {
        JTvalues.push(contactPoints.JTfirstUmbra + 2/86400);
        JTvalues.push(contactPoints.JTfirstUmbra + 12/86400);
    }
    else 
    {
        return [];
    }

    for (let JT = limits.JTmin - limits.temporalRes; JT < limits.JTmax + limits.temporalRes;)
    {
        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/86400);
        const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);

        if (!isNaN(centralLineJT.zeta))
        {
            JTvalues.push(JT);
            JT += timeStep * 5 * centralLineJT.zeta + 1/86400.0;
        }
        else
        {
            JT += timeStep;
        }
    }

    if (!isNaN(contactPoints.JTlastUmbra))
    {
        JTvalues.push(contactPoints.JTlastUmbra - 22/86400);
        JTvalues.push(contactPoints.JTlastUmbra - 2/86400);
    }

    for (let indJT = 0; indJT < JTvalues.length; indJT++)
    {
        JT = JTvalues[indJT];

        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/86400);
        const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);

        const besselPlus = orbitsjs.besselianSolarWithDelta(eclipse, JT + 1/86400, 1/86400);
        const centralLineJTPlus = orbitsjs.besselianCentralLine(eclipse, besselPlus, JT + 1/1440);
    
        if (!isNaN(centralLineJT.zeta) && !isNaN(centralLineJTPlus.zeta))
        {                       
            const rFund = [bessel.x, bessel.y, centralLineJT.zeta];
            const rFundPlus = [besselPlus.x, besselPlus.y, centralLineJTPlus.zeta];
            const rEfi = coordFundEfi(rFund, bessel, JT, nutPar);
            const rEfiPlus = coordFundEfi(rFundPlus, besselPlus, JT + 1/86400, nutPar);
            const wgs84 = orbitsjs.coordEfiWgs84(rEfi);
            const wgs84Plus = orbitsjs.coordEfiWgs84(rEfiPlus);

            let wgs84Dir = [wgs84Plus.lat - wgs84.lat, wgs84Plus.lon - wgs84.lon, 0.0];
            const degPerMin = orbitsjs.norm(wgs84Dir);
            wgs84Dir = orbitsjs.vecMul(wgs84Dir, 1/degPerMin);
            const orthDir = [wgs84Dir[1], -wgs84Dir[0], 0];

            //console.log(degPerMin);

            const osvMoonEfi = orbitsjs.computeOsvMoonEfi(JT, nutPar)
            const osvSunEfi = orbitsjs.computeOsvSunEfi(JT, nutPar)        
            let {umbraGrid, umbraLimits} = createUmbraContour(wgs84.lat, wgs84.lon, osvSunEfi, osvMoonEfi, 0.025);

            const latCenter = wgs84.lat; 
            const lonCenter = wgs84.lon;
            const scale = 1.0 / Math.abs(orbitsjs.cosd(latCenter));

            let indLat = 0;
            let latMax = -180;
            let latMin = 180;
            let pointMax = undefined;
            let pointMin = undefined;

            for (let lat = latCenter - 2.0 * scale; lat <= latCenter + 2.01 * scale; lat += 0.025 * scale)
            {
                let indLon = 0;
                let umbraRow = [];
                for (let lon = lonCenter - 6.0 * scale; lon <= lonCenter + 6.01 * scale; lon += 0.025 * scale)
                {
                    if (umbraGrid[indLat][indLon] != 0)
                    {
                       // console.log(lat + " "+ lon);

                        let dist = orbitsjs.dot([lat - latCenter, lon - lonCenter, 0], orthDir);

                        if (dist > latMax)
                        {
                            latMax = dist;
                            pointMax = orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon, 20000), 0.001);
                        }
                        if (dist < latMin)
                        {
                            latMin = dist;
                            pointMin = orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon, 20000), 0.001);
                        }
                    }
                    indLon++;
                }
                indLat++;
            }

            if (!(pointMin === undefined))
            {
                pointsMin.push(pointMin);
            }
            if (!(pointMax === undefined))
            {
                pointsMax.push(pointMax);
            }
        }
    }

    const lines = [];

    for (let indPoint = 0; indPoint < pointsMin.length - 1; indPoint++)
    {
        lines.push(pointsMin[indPoint]);
        lines.push(pointsMin[indPoint + 1]);
    }
    for (let indPoint = 0; indPoint < pointsMax.length - 1; indPoint++)
    {
        lines.push(pointsMax[indPoint]);
        lines.push(pointsMax[indPoint + 1]);
    }
    lines.push(pointsMax[0]);
    lines.push(pointsMin[0]);
    lines.push(pointsMax[pointsMax.length - 1]);
    lines.push(pointsMin[pointsMin.length - 1]);

    return lines;
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

    // The basic approach for all 4 contacts points is the same. We first find the
    // contact with 2-minute time steps. Thereafter, we repeat the 2-minute interval 
    // with 1-second time steps.

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
                osvToD.JT = orbitsjs.correlationTdbUt1(osvToD.JT);
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
                osvToD.JT = orbitsjs.correlationTdbUt1(osvToD.JT);
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
        for (let JT = JTfirstUmbra - 2/1440; JT <= JTfirstUmbra; JT += 0.1/86400)
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
                osvToD.JT = orbitsjs.correlationTdbUt1(osvToD.JT);
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
        for (let JT = JTlastUmbra + 2/1440; JT >= JTlastUmbra; JT -= 0.1/86400)
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
                osvToD.JT = orbitsjs.correlationTdbUt1(osvToD.JT);
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

function computeMax(eclipse, limits, contactPoints, timeStep)
{
    const T = (limits.JTmin - 2451545.0)/36525.0;
    const nutPar = orbitsjs.nutationTerms(T);
    const lineRise = [];
    const lineSet = [];
    const deltaAngle = 0.1;

    for (let JT = limits.JTmin - limits.temporalRes; JT < limits.JTmax + limits.temporalRes; JT += timeStep)
    {
        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);

        const osvMoonEfi = orbitsjs.computeOsvMoonEfi(JT, nutPar)
        const osvSunEfi = orbitsjs.computeOsvSunEfi(JT, nutPar)        
        const osvMoonEfiPlus = orbitsjs.computeOsvMoonEfi(JT + 1/1440.0, nutPar)
        const osvSunEfiPlus = orbitsjs.computeOsvSunEfi(JT + 1/1440.0, nutPar)        
    
        let prevDer = Math.NaN;

        for (let angle = 0; angle <= 360; angle += deltaAngle)
        {
            const rEfi = coordFundEfi(
                [orbitsjs.cosd(angle), orbitsjs.sind(angle), 0], bessel, JT, nutPar);
            const wgs84 = orbitsjs.coordEfiWgs84(rEfi);

            const rEnuSun = orbitsjs.coordEfiEnu(osvSunEfi, wgs84.lat, wgs84.lon, 0.0).r;
            const rEnuMoon = orbitsjs.coordEfiEnu(osvMoonEfi, wgs84.lat, wgs84.lon, 0.0).r;
            const rEnuSunPlus = orbitsjs.coordEfiEnu(osvSunEfiPlus, wgs84.lat, wgs84.lon, 0.0).r;
            const rEnuMoonPlus = orbitsjs.coordEfiEnu(osvMoonEfiPlus, wgs84.lat, wgs84.lon, 0.0).r;
            
            const mag = orbitsjs.eclipseMagnitude(rEnuSun, rEnuMoon).mag;
            const magPlus = orbitsjs.eclipseMagnitude(rEnuSunPlus, rEnuMoonPlus).mag;

            const magDer = magPlus - mag;

            if (angle > 0 && Math.sign(magDer) != Math.sign(prevDer) && mag > 0.005)
            {
                if (rEnuSunPlus[2] > rEnuSun[2])
                {
                    lineRise.push(orbitsjs.vecMul(rEfi, 0.001001));
                }
                else 
                {
                    lineSet.push(orbitsjs.vecMul(rEfi, 0.001001));
                }
            }

            prevDer = magDer;
        }
    }

    lineSet.sort(function(a, b){return a[2] - b[2]});
    lineRise.sort(function(a, b){return a[2] - b[2]});

    const lineSetOut = [];
    const lineRiseOut = [];

    for (let indSet = 0; indSet < lineSet.length-1; indSet++)
    {
        lineSetOut.push(lineSet[indSet]);
        lineSetOut.push(lineSet[indSet + 1]);
    }
    for (let indRise = 0; indRise < lineRise.length-1; indRise++)
    {
        lineRiseOut.push(lineRise[indRise]);
        lineRiseOut.push(lineRise[indRise + 1]);
    }

    return [lineSetOut, lineRiseOut];
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
function computeRiseSet(eclipse, limits, contactPoints, timeStep)
{
    const riseSetPointsStart = [];
    const riseSetPointsEnd = [];
    const riseSetPoints = [];
    const nutPar = orbitsjs.nutationTerms((limits.JTmin - 2451545.0) / 36525.0);

    for (let JT = limits.JTmin - limits.temporalRes; JT < limits.JTmax + limits.temporalRes; JT += timeStep)
    {
        const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
        const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);
        const points = orbitsjs.besselianRiseSet(bessel);

        const osvSunEfiPlus = orbitsjs.computeOsvSunEfi(JT + 1/24, nutPar);
    
        if (points.length > 0)
        {
            const rEfi = coordFundEfi([points[0][0], points[0][1], 0], bessel, JT, nutPar);
            const rEfi2 = coordFundEfi([points[1][0], points[1][1], 0], bessel, JT, nutPar);
            const rEfiPlus = coordFundEfi([points[0][0], points[0][1], 0], bessel, JT + 1/24, nutPar);
            const rEfi2Plus = coordFundEfi([points[1][0], points[1][1], 0], bessel, JT+ 1/24, nutPar);
    
            const wgs84 = orbitsjs.coordEfiWgs84(rEfi);
            const wgs842 = orbitsjs.coordEfiWgs84(rEfi2);
            const sunEnu = orbitsjs.coordEfiEnu(osvSunEfiPlus, wgs84.lat, wgs84.lon, 0.0);
            const sunEnu2 = orbitsjs.coordEfiEnu(osvSunEfiPlus, wgs842.lat, wgs842.lon, 0.0);

            if (sunEnu.r[2] > 0.0)
            {
                riseSetPointsStart.push(orbitsjs.vecMul(rEfi, 0.001));
            }
            else 
            {
                riseSetPointsEnd.push(orbitsjs.vecMul(rEfi, 0.001));                
            }
            if (sunEnu2.r[2] > 0.0)
            {
                riseSetPointsStart.push(orbitsjs.vecMul(rEfi2, 0.001));
            }
            else 
            {
                riseSetPointsEnd.push(orbitsjs.vecMul(rEfi2, 0.001));
            }
        }
    }

    const riseSetPoints2 = [];

    for (let indPoint = 0; indPoint < riseSetPointsStart.length/2-1; indPoint++)
    {
        riseSetPoints2.push(riseSetPointsStart[indPoint*2]);
        riseSetPoints2.push(riseSetPointsStart[indPoint*2 + 2]);
        if (riseSetPointsStart[indPoint*2 +3] === undefined) continue;
        riseSetPoints2.push(riseSetPointsStart[indPoint*2 + 1]);
        riseSetPoints2.push(riseSetPointsStart[indPoint*2 + 3]);
    }
    riseSetPoints2.push(riseSetPointsStart[0]);
    riseSetPoints2.push(riseSetPointsStart[1]);
    riseSetPoints2.push(riseSetPointsStart[riseSetPointsStart.length-2]);
    riseSetPoints2.push(riseSetPointsStart[riseSetPointsStart.length-1]);

    for (let indPoint = 0; indPoint < riseSetPointsEnd.length/2-1; indPoint++)
    {
        riseSetPoints2.push(riseSetPointsEnd[indPoint*2]);
        riseSetPoints2.push(riseSetPointsEnd[indPoint*2 + 2]);
        if (riseSetPointsEnd[indPoint*2 +3] === undefined) continue;
        riseSetPoints2.push(riseSetPointsEnd[indPoint*2 + 1]);
        riseSetPoints2.push(riseSetPointsEnd[indPoint*2 + 3]);
    }
    riseSetPoints2.push(riseSetPointsEnd[0]);
    riseSetPoints2.push(riseSetPointsEnd[1]);
    riseSetPoints2.push(riseSetPointsEnd[riseSetPointsEnd.length-2]);
    riseSetPoints2.push(riseSetPointsEnd[riseSetPointsEnd.length-1]);


    return riseSetPoints2;
}

/**
 * Draw distant circle corresponding to the equator of the Earth.
 * 
 * @param {*} matrix 
 *      The view matrix.
 */
function drawEquator(matrix)
{
    if (!guiControls.enableEquator)
    {
        return;
    }

    lineShaders.colorOrbit = guiControls.colorOrbit;
    const pEquator = [];
    // Distance to the object in the visualization space.
    const D = 0.5 * camera.zFar;

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
    if (!guiControls.enableEcliptic)
    {
        return;
    }

    lineShaders.colorOrbit = guiControls.colorOrbit;
    const pSun = [];
    // Distance to the object in the visualization space.
    const D = 0.5 * camera.zFar;

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
    if (guiControls.enableAxisLine)
    {
        const D = 0.5 * camera.zFar;
        const p = [];
    
        p.push(orbitsjs.vecMul(rECEFMoon, D/orbitsjs.norm(rECEFMoon)));
        p.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon, 0), 0.001));
        lineShaders.colorOrbit = guiControls.colorCentral;
        lineShaders.setGeometry(p);
        lineShaders.draw(matrix);
    }

    if (guiControls.enableCentral)
    {
        lineShaders.colorOrbit = guiControls.colorCentral;
        lineShaders.setGeometry(centralLine);
        lineShaders.draw(matrix);
    }
}

/**
 * Draw rise and set points.
 * 
 * @param {*} matrix 
 *      The view matrix.
 * @param {*} riseSetPoints 
 *      The rise and set points.
 * @param {*} maxLinePoints
 *      Maximum eclipse at sunrise/sunset.
 */
function drawRiseSet(matrix, riseSetPoints, maxLinePoints)
{
    if (guiControls.enableRiseSet)
    {
        lineShaders.colorOrbit = guiControls.colorRiseSet;
        lineShaders.setGeometry(riseSetPoints);
        lineShaders.draw(matrix);

        lineShaders.colorOrbit = guiControls.colorMaxRiseSet;
        lineShaders.setGeometry(maxLinePoints[0]);
        lineShaders.draw(matrix);
        lineShaders.setGeometry(maxLinePoints[1]);
        lineShaders.draw(matrix);
    
    }
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
    if (!guiControls.enableContact)
    {
        return;
    }
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

    lineShaders.colorOrbit = guiControls.colorContact;
    lineShaders.setGeometry(p);
    lineShaders.draw(matrix);

    drawText(matrix, contactPoints.latFirstPenumbra, contactPoints.lonFirstPenumbra+2, 'P1', guiControls.colorText);
    drawText(matrix, contactPoints.latFirstUmbra, contactPoints.lonFirstUmbra+2, 'P2', guiControls.colorText);
    drawText(matrix, contactPoints.latLastUmbra, contactPoints.lonLastUmbra+2, 'P3', guiControls.colorText);
    drawText(matrix, contactPoints.latLastPenumbra, contactPoints.lonLastPenumbra+2, 'P4', guiControls.colorText);
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

/**
 * Draw text.
 * 
 * @param {*} matrix
 *      The view matrix. 
 * @param {*} lat 
 *      Start latitude.
 * @param {*} lon
 *      Start longitude. 
 * @param {*} s
 *      String of text. 
 * @param {*} color 
 *      Color of the text.
 * @param {*} upDir 
 *      Direction (lon, lat, up).
 */
function drawText(matrix, lat, lon, s, color, upDir)
{
    
    if (!guiControls.enableCaptions)
    {
        return;
    }

    if (upDir === undefined)
    {
        upDir = [0, 1, 0];
    }
    upDir = orbitsjs.vecMul(upDir, 1.0 / orbitsjs.norm(upDir));
    const angleUp = orbitsjs.atan2d(upDir[1], upDir[0]);
    const rightDir = [orbitsjs.cosd(angleUp - 90), orbitsjs.sind(angleUp - 90), 0];

    // x = cosd(lat) * cosd(lon)
    // y = cosd(lat) * sind(lon)
    // z = sind(lat)

    // In terms of radians. Degree derivatives are proportional.
    // dx/dlat = -sin(lat) * cos(lon)
    // dy/dlat = -sin(lat) * sin(lon) 
    // dz/dlat =  cos(lat)
    // dx/dlon = -cos(lat) * sin(lon)
    // dy/dlon =  cos(lat) * cos(lon)
    // dz/dlon =  0

    let dirLon = [
        -orbitsjs.cosd(lat) * orbitsjs.sind(lon),
         orbitsjs.cosd(lat) * orbitsjs.cosd(lon),
         0.0
    ];
    let dirLat = [
        -orbitsjs.sind(lat) * orbitsjs.cosd(lon),
        -orbitsjs.sind(lat) * orbitsjs.sind(lon),
         orbitsjs.cosd(lat)
    ];
    // Probably unnecessary.
    dirLon = orbitsjs.vecMul(dirLon, 1/orbitsjs.norm(dirLon));
    dirLat = orbitsjs.vecMul(dirLat, 1/orbitsjs.norm(dirLat));


    let scale = 100000.0;

    const p = [];
    for (let indChar = 0; indChar < s.length; indChar++)
    {
        let pStart = orbitsjs.coordWgs84Efi(lat, lon, 10000.0);

        if (!charLineMap.hasOwnProperty(s[indChar]))
        {
            continue;
        }

        lines = charLineMap[s[indChar]];

        for (let indLine = 0; indLine < lines.length; indLine++)
        {
            const line = lines[indLine];

            let pointStart = orbitsjs.linComb(
                [1, scale * (indChar + 0.8*line[0]), scale * line[1]], 
                [pStart, dirLon, dirLat]);
            let pointEnd = orbitsjs.linComb(
                [1, scale * (indChar + 0.8*line[2]), scale * line[3]], 
                [pStart, dirLon, dirLat]);
    
            p.push(orbitsjs.vecMul(pointStart, 0.001));
            p.push(orbitsjs.vecMul(pointEnd, 0.001));
        }
    }

    if (color === undefined)
    {
        color = guiControls.colorText;
    }

    lineShaders.colorOrbit = color;
    lineShaders.setGeometry(p);
    lineShaders.draw(matrix);
}