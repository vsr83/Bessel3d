"use strict";

var gl = null;
var earthShaders = null;
var lineShaders = null;
var pointShaders = null;

// Semi-major and semi-minor axes of the WGS84 ellipsoid.
var a = 6378.1370;
var b = 6356.75231414;

// Camera distance from Earth.
var distance = 5.0 * a;
const zFar = 1000000;

// Field of view.
var fieldOfViewRadians = orbitsjs.deg2Rad(30);

let rotZToLon = (rotZ) => {return (-90 - rotZ);}
let rotXToLat = (rotX) => {return (90 + rotX);}

// Rotation.
var rotX = orbitsjs.deg2Rad(-90);
var rotY = orbitsjs.deg2Rad(0);
var rotZ = orbitsjs.deg2Rad(0);

// Delta time (ms) from configuration of date and time.
var dateDelta = 0;

gl = canvas.getContext("webgl2");
if (!gl) 
{
    console.log("Failed to initialize GL.");
}

// Create and initialize shaders.
earthShaders = new PlanetShaders(gl, 50, 50, a, b, 15, 15);
earthShaders.init("textures/8k_earth_daymap.jpg", "textures/8k_earth_nightmap.jpg");

lineShaders = new LineShaders(gl);
lineShaders.init();

pointShaders = new PointShaders(gl);
pointShaders.init();

var canvasGlHidden = document.getElementById("canvasGLHidden");
const glHidden = canvasGlHidden.getContext("webgl2", {preserveDrawingBuffer: true});
const contoursProgram = compileProgramContours(glHidden);
initContoursGpu(glHidden, contoursProgram);

let JTstart = orbitsjs.timeJulianTs(new Date()).JT;


const listEclipses = orbitsjs.solarEclipses(2019.75, 2019);
console.log(listEclipses);
const eclipse = listEclipses[0];

let toFixed = function(num) {
    if (num < 10)
        return "0" + num;
    else 
        return num;
}

function createTimestamp(JT)
{
    const timeGreg = orbitsjs.timeGregorian(JT);
    return timeGreg.year + "-" + toFixed(timeGreg.month) + "-" + toFixed(timeGreg.mday) + 
            "T" + toFixed(timeGreg.hour) + ":" + toFixed(timeGreg.minute)
            + ":" + toFixed(Math.floor(timeGreg.second));
}

const title = createTimestamp(eclipse.JTmax) + " (" + eclipse.type + ")";
const nameText = document.getElementById("nameText");
nameText.innerText = title;

var startTime = performance.now()
const gridSize = 0.25;
const limits = {JTmin : eclipse.JTmax - 5/24, JTmax : eclipse.JTmax + 5/24};
let {gpuLimits, gpuGridData} = computeContours(glHidden, contoursProgram, limits);
const contoursGpu = orbitsjs.createContours(gpuLimits.lonMin, gpuLimits.lonMax, 
    gpuLimits.latMin, gpuLimits.latMax, gridSize, gpuGridData, [0.001, 0.2, 0.4, 0.6, 0.8], [100.0]);
var endTime = performance.now()
console.log(`Contour creation took ${endTime - startTime} milliseconds`)

//const limits = gpuLimits;
limits.lonMin = gpuLimits.lonMin;
limits.lonMax = gpuLimits.lonMax;
limits.latMin = gpuLimits.latMin;
limits.latMax = gpuLimits.latMax;
limits.temporalRes = 1/1440;

startTime = performance.now()
let derContours = createDerContours(limits, 1.0, 1/1440);
endTime = performance.now()
console.log(`Contour creation took ${endTime - startTime} milliseconds`)

startTime = performance.now()
const centralLine = computeCentralLine(limits, 1/1440);
const riseSetPoints = computeRiseSet(limits, 1/3000);
const contourPointsGpu = contourToPoints(contoursGpu);
endTime = performance.now()
console.log(`line creation took ${endTime - startTime} milliseconds`)

const contactPoints = computeFirstLastContact(limits);


requestAnimationFrame(drawScene);

let drawing = false;

function drawScene(time) 
{
    if (earthShaders.numTextures < 2)
    {
        requestAnimationFrame(drawScene);
        return;
    }
    drawing = true;

    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    gl.useProgram(earthShaders.program);

    // Avoid change to the list during the execution of the method.
    //const enableList = guiControls.enableList;

    // Compute Julian time.
    let dateNow = new Date();
    let today = null;

    /*if (guiControls.timeWarp)
    {
        dateDelta += timeControls.warpSeconds.getValue() * 1000;
        //console.log(dateDelta);
    }*/

    // If date and time updates are disabled, set date manually from the GUI controls:
    /*if (!guiControls.enableClock)
    {
        dateNow = new Date(guiControls.dateYear, parseInt(guiControls.dateMonth)-1, guiControls.dateDay, 
            guiControls.timeHour, guiControls.timeMinute, guiControls.timeSecond);

        // Value of dateNow is set from controls above.
        today = new Date(dateNow.getTime()
        + 24 * 3600 * 1000 * guiControls.deltaDays
        + 3600 * 1000 * guiControls.deltaHours
        + 60 * 1000 * guiControls.deltaMins
        + 1000 * guiControls.deltaSecs);
    }
    else
    */{
        today = new Date(dateNow.getTime()
        /*+ 24 * 3600 * 1000 * guiControls.deltaDays
        + 3600 * 1000 * guiControls.deltaHours
        + 60 * 1000 * guiControls.deltaMins
        + 1000 * guiControls.deltaSecs
        + dateDelta*/
        );

        /*timeControls.yearControl.setValue(today.getFullYear());
        timeControls.monthControl.setValue(today.getMonth() + 1);
        timeControls.dayControl.setValue(today.getDate());
        timeControls.hourControl.setValue(today.getHours());
        timeControls.minuteControl.setValue(today.getMinutes());
        timeControls.secondControl.setValue(today.getSeconds());*/
    }
    //const JT = orbitsjs.timeJulianTs(today).JT + (JTeclipse - JTstart);
    const JT = 240.0*(orbitsjs.timeJulianTs(today).JT - JTstart) + eclipse.JTmax - 4/24;
    const T = (JT - 2451545.0)/36525.0;
    const nutPar = orbitsjs.nutationTerms(T);

    if (JT > limits.JTmax)
    {
        JTstart = orbitsjs.timeJulianTs(today).JT;
    }

    const timeGreg = orbitsjs.timeGregorian(JT);
    const dateStr = createTimestamp(JT) + " TT<br>" 
                  + "First contact (Penumbra): " + createTimestamp(contactPoints.JTfirstPenumbra)+ "<br>" 
                  + "First contact (Umbra)&nbsp;&nbsp;&nbsp;: " + createTimestamp(contactPoints.JTfirstUmbra)+ "<br>" 
                  + "Last contact&nbsp; (Umbra)&nbsp;&nbsp;&nbsp;: " + createTimestamp(contactPoints.JTlastUmbra) + "<br>"
                  + "Last contact&nbsp; (Penumbra): " + createTimestamp(contactPoints.JTlastPenumbra);
    const dateText = document.getElementById("dateText");
    dateText.innerHTML = dateStr;

    const bessel = orbitsjs.besselianSolarWithDelta(eclipse, JT, 1/1440);
    const centralLineJT = orbitsjs.besselianCentralLine(eclipse, bessel, JT);

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
    const osvSunEfi = orbitsjs.computeOsvSunEfi(JT, nutPar);
    const osvMoonEfi = orbitsjs.computeOsvMoonEfi(JT, nutPar);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 255);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Handle screen size updates.
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const matrix = createViewMatrix();

    earthShaders.draw(matrix, true, false, true, true, osvMoonEfi.r, osvSunEfi.r);

    drawDistant(osvSunEfi.r, 695700000.0 * 2.0, matrix, true);
    drawDistant(osvMoonEfi.r, 1737400.0 * 2.0, matrix, true);
    drawCentralLine(matrix, wgs84.lat, wgs84.lon, osvMoonEfi.r, centralLine);
    drawRiseSet(matrix, riseSetPoints);
    drawEcliptic(matrix, nutPar, JT);
    drawEquator(matrix);
    drawContours(matrix, contourPointsGpu, derContours);

    let {umbraGrid, umbraLimits} = createUmbraContour(wgs84.lat, wgs84.lon, osvSunEfi, osvMoonEfi);
    //console.log(umbraLimits);
    //console.log(umbraGrid);
    const contoursUmbra = orbitsjs.createContours(umbraLimits.lonMin, umbraLimits.lonMax, 
        umbraLimits.latMin, umbraLimits.latMax, 0.1, umbraGrid, [1.0], [100.0]);
    //console.log(contoursUmbra);
    const contourPointsUmbra = contourToPoints(contoursUmbra);

    lineShaders.colorOrbit = [255, 0, 0];
    for (let indContour = 0; indContour < contourPointsUmbra.length; indContour++)
    {
        const points = contourPointsUmbra[indContour];
        //console.log(points);
        lineShaders.setGeometry(points);
        lineShaders.draw(matrix);
    }
    lineShaders.colorOrbit = [255, 0, 0];
    drawContactPoints(matrix, contactPoints);

    // Call drawScene again next frame
    requestAnimationFrame(drawScene);

    drawing = false;
}

/**
 * Create view matrix taking into account the rotation.
 * 
 * @returns The view matrix.
 */
function createViewMatrix()
{
    // Compute the projection matrix.
    const fieldOfViewRadians = orbitsjs.deg2Rad(30.0);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = (distance - b) / 2;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    //distance = cameraControls.distance.getValue();
    // Camera position in the clip space.
    const cameraPosition = [0, 0, distance];
    const up = [0, 1, 0];
    //up[0] = MathUtils.cosd(guiControls.upLat) * MathUtils.cosd(guiControls.upLon);
    //up[2] = MathUtils.cosd(guiControls.upLat) * MathUtils.sind(guiControls.upLon);
    //up[1] = MathUtils.sind(guiControls.upLat);

    const target = [0, 0, 0];

    // Compute the camera's matrix using look at.
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);
    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    // Handle longitude locking.
    // TODO: Longitude has inconsistent value in J2000.
    /*if (guiControls.lockLonRot)
    {
        rotZ = MathUtils.deg2Rad(-90 - ISS.lon);

        if (guiControls.frame === 'J2000')
        {
            rotZ = MathUtils.deg2Rad(-90 - ISS.lon - MathUtils.rad2Deg(LST));
        }

        cameraControls.lon.setValue(ISS.lon);
    }
    else if (canvas.onmousemove == null)
    {        
        rotZ = MathUtils.deg2Rad(-90 - guiControls.lon);
    }
    */

    // Handle latitude locking.
    // TODO: Latitude has inconsistent value in J2000.
    /*if (guiControls.lockLatRot)
    {
        rotX = MathUtils.deg2Rad(-90 + ISS.lat);
        cameraControls.lat.setValue(ISS.lat);
    }
    else if (canvas.onmousemove == null)
    {
        rotX = MathUtils.deg2Rad(-90 + guiControls.lat);
    }*/

    // Rotate view projection matrix to take into account rotation to target coordinates.
    var matrix = m4.xRotate(viewProjectionMatrix, rotX);
    matrix = m4.yRotate(matrix, rotY);
    matrix = m4.zRotate(matrix, rotZ);

    return matrix;
}

/**
 * Draw distant object with the planet shader as a sphere.
 * 
 * @param {*} rEFI 
 *      Coordinates of the object in the EFI frame.
 * @param {*} rObject 
 *      Radius of the object sphere (in meters).
 * @param {*} matrix 
 *      View matrix.
 * @param {*} drawSub 
 *      Draw point of the Earth below the target.
 */
function drawDistant(rEFI, rObject, matrix, drawSub)
{
    // Due to how depth buffer works, it is not feasible to draw objects 
    // like the Sun millions of kilometers away. Rather, they are drawn 
    // to the maximum distance while retaining the angular diameter.

    // The following assumes that the observer is close to the center
    // of the Earth.

    // Angular diameter of the object as seen from the center of the Earth.
    const angDiam = 2 * orbitsjs.atand(rObject / orbitsjs.norm(rEFI));

    // Distance to the object in the visualization space.
    const D = 0.5 * zFar;

    // angDiam = 2 * atand(diameter / (2 * D));
    // <=> diameter / (2 * D) = tand(andDiam/2)
    // <=> diameter = 2 * D * tand(angDiam/2)

    const rSphere = D * orbitsjs.tand(angDiam / 2);
    const scale = rSphere / a;

    const targetPos = orbitsjs.vecMul(rEFI, D / orbitsjs.norm(rEFI));

    let targetMatrix = m4.translate(matrix, targetPos[0], targetPos[1], targetPos[2]);
    targetMatrix = m4.scale(targetMatrix, scale, scale, scale);

    earthShaders.draw(targetMatrix, false, false, false, false);

    if (drawSub)
    {
        const pLine = [targetPos];
        // Distance to the object in the visualization space.
        const D = 0.5 * zFar;
        let {lat, lon, h} = orbitsjs.coordEfiWgs84(targetPos); 
        pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon, 0), 0.001));
        pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat+1, lon, 0), 0.001));
        pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat-1, lon, 0), 0.001));
        pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon+1, 0), 0.001));
        pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon-1, 0), 0.001));
    
        //console.log(pLine);
        lineShaders.setGeometry(pLine);
        lineShaders.draw(matrix);
    }
}