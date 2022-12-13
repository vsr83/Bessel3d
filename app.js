"use strict";

console.log(useGpu);

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


const listEclipses = orbitsjs.solarEclipses(2019.75, 2019);
//const listEclipses = orbitsjs.solarEclipses(1950.00, 2050);
console.log(listEclipses);

let indEclipse = 0;
function loadEclipse(eclipseIn)
{
    const state = {};
    state.eclipse = eclipseIn;

    // Update title:
    state.title = createTimestamp(state.eclipse.JTmax) + " (" + state.eclipse.type + ")";
    const nameText = document.getElementById("nameText");
    nameText.innerText = state.title;

    var startTime = performance.now()
    state.gridSize = 0.25;
    
    state.contours = null;
    state.limits = {JTmin : state.eclipse.JTmax - 5/24, JTmax : state.eclipse.JTmax + 5/24};
    
    if (useGpu)
    {
        let {gpuLimits, gpuGridData} = computeContours(glHidden, contoursProgram, state.limits);
        state.contours = orbitsjs.createContours(gpuLimits.lonMin, gpuLimits.lonMax, 
            gpuLimits.latMin, gpuLimits.latMax, state.gridSize, gpuGridData, [0.001, 0.2, 0.4, 0.6, 0.8], [100.0]);
        state.limits.lonMin = gpuLimits.lonMin;
        state.limits.lonMax = gpuLimits.lonMax;
        state.limits.latMin = gpuLimits.latMin;
        state.limits.latMax = gpuLimits.latMax;
    }
    else
    {
        state.limits = computeLimits(state.eclipse, 2.0, 5.0/1440.0);
        state.contours = createContours(state.limits, 0.5, 2.0/1440);
    }
    var endTime = performance.now();
    console.log(`Contour creation took ${endTime - startTime} milliseconds`);
        
    //const limits = gpuLimits;
    state.limits.temporalRes = 1/1440;
    
    startTime = performance.now()
    state.derContours = createDerContours(state.limits, 1.0, 1/1440);
    state.contourPointsDer = contourToPoints(state.derContours);
    endTime = performance.now()
    console.log(`Contour creation took ${endTime - startTime} milliseconds`)
    
    startTime = performance.now()
    state.centralLine = computeCentralLine(state.eclipse, state.limits, 1/1440);
    state.riseSetPoints = computeRiseSet(state.eclipse, state.limits, 1/3000);
    state.contourPointsGpu = contourToPoints(state.contours);
    endTime = performance.now()
    console.log(`line creation took ${endTime - startTime} milliseconds`)
    
    let {magCaptions, maxCaptions} = createMagCaptions(state.derContours);
    state.magCaptions = magCaptions;
    state.maxCaptions = maxCaptions;
    state.contactPoints = computeFirstLastContact(state.eclipse, state.limits);    

    state.limits.JTmin = state.contactPoints.JTfirstPenumbra - 60/1440;
    state.limits.JTax = state.contactPoints.JTlastPenumbra + 60/1440;

    return state;
}

let state = loadEclipse(listEclipses[0])

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
    today = new Date(dateNow.getTime());
    //const JT = orbitsjs.timeJulianTs(today).JT + (JTeclipse - JTstart);
    let JT = 500.0*(orbitsjs.timeJulianTs(today).JT - JTstart) + state.eclipse.JTmax - 4/24;
    let T = (JT - 2451545.0)/36525.0;
    let nutPar = orbitsjs.nutationTerms(T);

    if (JT > state.limits.JTmax)
    {
        //indEclipse++;
        state = loadEclipse(listEclipses[indEclipse]);
        console.log(state);

        // Compute Julian time.
        dateNow = new Date();
        today = new Date(dateNow.getTime());
        //const JT = orbitsjs.timeJulianTs(today).JT + (JTeclipse - JTstart);
        JT = 500.0*(orbitsjs.timeJulianTs(today).JT - JTstart) + state.eclipse.JTmax - 4/24;
        T = (JT - 2451545.0)/36525.0;
        nutPar = orbitsjs.nutationTerms(T);
        JTstart = orbitsjs.timeJulianTs(today).JT;
    }

    const timeGreg = orbitsjs.timeGregorian(JT);
    const dateStr = createTimestamp(JT) + " TT<br>" 
                  + "P1 : First contact (Penumbra): " + createTimestamp(state.contactPoints.JTfirstPenumbra)+ "<br>" 
                  + "P2 : First contact (Umbra)&nbsp;&nbsp;&nbsp;: " + createTimestamp(state.contactPoints.JTfirstUmbra)+ "<br>" 
                  + "P3 : Last contact&nbsp; (Umbra)&nbsp;&nbsp;&nbsp;: " + createTimestamp(state.contactPoints.JTlastUmbra) + "<br>"
                  + "P4 : Last contact&nbsp; (Penumbra): " + createTimestamp(state.contactPoints.JTlastPenumbra);
    const dateText = document.getElementById("dateText");
    dateText.innerHTML = dateStr;

    const bessel = orbitsjs.besselianSolarWithDelta(state.eclipse, JT, 1/1440);
    const centralLineJT = orbitsjs.besselianCentralLine(state.eclipse, bessel, JT);

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

    let targetRotZ = 0;
    let targetRotX = 0;
    if (isNaN(state.contactPoints.JTfirstUmbra))
    {
        if (JT < state.contactPoints.JTfirstPenumbra)
        {
            targetRotZ = orbitsjs.deg2Rad(-90 - state.contactPoints.lonFirstPenumbra);
            targetRotX = orbitsjs.deg2Rad(-90 + state.contactPoints.latFirstPenumbra);
        }
        else if (JT > state.contactPoints.JTlastPenumbra)
        {
            targetRotZ = orbitsjs.deg2Rad(-90 - state.contactPoints.lonLastPenumbra);
            targetRotX = orbitsjs.deg2Rad(-90 + state.contactPoints.latLastPenumbra);
        }
        else 
        {
            if (state.contactPoints.lonLastPenumbra < state.contactPoints.lonFirstPenumbra)
                state.contactPoints.lonLastPenumbra += 360.0;

            targetRotZ = orbitsjs.deg2Rad(-90 - state.contactPoints.lonFirstPenumbra -
                (state.contactPoints.lonLastPenumbra - state.contactPoints.lonFirstPenumbra)
               *(JT - state.contactPoints.JTfirstPenumbra) / (state.contactPoints.JTlastPenumbra - state.contactPoints.JTfirstPenumbra));
            targetRotX = orbitsjs.deg2Rad(-90 + state.contactPoints.latFirstPenumbra +
                (state.contactPoints.latLastPenumbra - state.contactPoints.latFirstPenumbra)
               *(JT - state.contactPoints.JTfirstPenumbra) / (state.contactPoints.JTlastPenumbra - state.contactPoints.JTfirstPenumbra));
        }
    }
    else if (JT < state.contactPoints.JTfirstUmbra)
    {
        targetRotZ = orbitsjs.deg2Rad(-90 - state.contactPoints.lonFirstUmbra);
        targetRotX = orbitsjs.deg2Rad(-90 + state.contactPoints.latFirstUmbra);
    }
    else if (JT > state.contactPoints.JTlastUmbra)
    {
        targetRotZ = orbitsjs.deg2Rad(-90 - state.contactPoints.lonLastUmbra);
        targetRotX = orbitsjs.deg2Rad(-90 + state.contactPoints.latLastUmbra);
    }
    else 
    {
        targetRotZ = orbitsjs.deg2Rad(-90 - wgs84.lon);
        targetRotX = orbitsjs.deg2Rad(-90 + wgs84.lat);    
    }

    if (guiControls.lockLonRot)
    {
        rotZ = targetRotZ;
    }
    if (guiControls.lockLatRot)
    {
        rotX = targetRotX;
    }

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

    earthShaders.draw(matrix, 
        guiControls.enableTextures, 
        guiControls.enableGrid, 
        guiControls.enableMap, 
        guiControls.enableEclipse, 
        osvMoonEfi.r, 
        osvSunEfi.r);

    drawDistant(osvSunEfi.r, 695700000.0 * 2.0, matrix, guiControls.enableSubsolar,
        guiControls.enableSubsolarLine);
    drawDistant(osvMoonEfi.r, 1737400.0 * 2.0, matrix, guiControls.enableSublunar,
        guiControls.enableSublunarLine);
    drawCentralLine(matrix, wgs84.lat, wgs84.lon, osvMoonEfi.r, state.centralLine);
    drawRiseSet(matrix, state.riseSetPoints);
    drawEcliptic(matrix, nutPar, JT);
    drawEquator(matrix);
    drawContours(matrix, state.contourPointsGpu, state.contourPointsDer);

    if (guiControls.enableMagContours)
    {
        drawCaptions(matrix, state.magCaptions);
    }
    if (guiControls.enableDerContours)
    {
        drawCaptions(matrix, state.maxCaptions);
    }

    let {umbraGrid, umbraLimits} = createUmbraContour(wgs84.lat, wgs84.lon, osvSunEfi, osvMoonEfi);
    const contoursUmbra = orbitsjs.createContours(umbraLimits.lonMin, umbraLimits.lonMax, 
        umbraLimits.latMin, umbraLimits.latMax, 0.1, umbraGrid, [1.0], [100.0]);
    const contourPointsUmbra = contourToPoints(contoursUmbra);

    if (guiControls.enableUmbra)
    {
        lineShaders.colorOrbit = guiControls.colorUmbra;
        for (let indContour = 0; indContour < contourPointsUmbra.length; indContour++)
        {
            const points = contourPointsUmbra[indContour];
            lineShaders.setGeometry(points);
            lineShaders.draw(matrix);
        }
    }

    lineShaders.colorOrbit = [255, 0, 0];
    drawContactPoints(matrix, state.contactPoints);

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

