"use strict";

var contourWorker = null;
var gl = null;
var earthShaders = null;
var lineShaders = null;
var pointShaders = null;

// Semi-major and semi-minor axes of the WGS84 ellipsoid.
var a = 6378.1370;
var b = 6356.75231414;

// Current state of the camera.
const camera = {
    rotX : orbitsjs.deg2Rad(-90),
    rotY : 0,
    rotZ : 0,
    fovRad : orbitsjs.deg2Rad(30),
    distance : 10.0 * a,
    zFar : 1000000
};

const diffUTCTDT = 60.0/86400.0;

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

//var canvasGlHidden = document.getElementById("canvasGLHidden");
//const glHidden = canvasGlHidden.getContext("webgl2", {preserveDrawingBuffer: true});
//const contoursProgram = compileProgramContours(glHidden);
//initContoursGpu(glHidden, contoursProgram);

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

// Load eclipses.
var startTime = performance.now()
//const listEclipses = orbitsjs.solarEclipses(2019.75, 2019);
const listEclipses = orbitsjs.solarEclipses(1900.00, 2100.00);
console.log(listEclipses);
var endTime = performance.now();
console.log(`Eclipse computation took ${endTime - startTime} milliseconds`)

let eclipseNames = [];
let eclipseInds = [];

for (let indEclipse = 0; indEclipse < listEclipses.length; indEclipse++)
{
    const eclipse = listEclipses[indEclipse];
    const timeGreg = orbitsjs.timeGregorian(eclipse.JTmax);
    const eclipseName = timeGreg.year + "-" + toFixed(timeGreg.month) + "-" + toFixed(timeGreg.mday) + " (" + eclipse.type + ")";
    eclipseNames.push(eclipseName);
    eclipseInds[eclipseName] = indEclipse;
}

// It is not a good idea to allow loading a new eclipse when drawing of the scene
// is on-going. Therefore, the new eclipse is load to the variable pendingLoad
// that is read before next drawing of the scene.
let pendingLoad = null;

// Initialize autocomplete.
const autoCompleteJS = new autoComplete({
    placeHolder: "Search YYYY-MM-SS (TYPE)",
    data: {
        src: eclipseNames, 
        cache: true,
    },
    resultItem: {
        highlight: true
    },
    resultsList:{
        tabSelect: true,
        noResults: true
    },
    events: {
        input: {
            selection: (event) => {
                const selection = event.detail.selection.value;
                autoCompleteJS.input.value = selection;
                pendingLoad = eclipseInds[selection];
            }
        }
    }
});

/**
 * Load an eclipse. The method generates state without the contour data and then
 * calls a worker thread that computes the contours. State is reinitialized 
 * whenever the worker thread has generated curves.
 * 
 * @param {*} eclipseIn 
 *     Eclipse object.
 * @returns State object.
 */
function loadEclipse(eclipseIn)
{
    // Terminate a contour worker if one is already running.
    if (contourWorker != null)
    {
        contourWorker.terminate();
    }

    // Create a contour worker for computation of the state.
    contourWorker = new Worker("computation/ContourWorker.js");
    contourWorker.addEventListener('message', function(e) {
        console.log("Worker has provided data.");
        state = e.data;
    }, false);
    
    contourWorker.postMessage({
        eclipse : eclipseIn,
        computeGrid_4 : guiControls.computeGrid_4,
        computeGrid_2 : guiControls.computeGrid_2,
        computeGrid_1 : guiControls.computeGrid_1,
        computeGrid_0_5 : guiControls.computeGrid_0_5,
        computeGrid_0_25 : guiControls.computeGrid_0_25,
    });

    // Generate a state without the contour curves.
    const stateOut = {};
    stateOut.eclipse = eclipseIn;

    // Update title:
    stateOut.title = createTimestamp(stateOut.eclipse.JTmax) + " (" + stateOut.eclipse.type + ")";
    const nameText = document.getElementById("nameText");
    nameText.innerText = stateOut.title;

    stateOut.contours = null;
    stateOut.limits = {JTmin : stateOut.eclipse.JTmax - 5/24, JTmax : stateOut.eclipse.JTmax + 5/24};    
    stateOut.limits = computeLimits(stateOut.eclipse, 4.0, 5.0/1440.0);
    stateOut.contours = [];   
    stateOut.contourPointsUmbra = [] 
    stateOut.umbraContours = [];
    stateOut.contourPointsDer = [];    
    stateOut.centralLine = computeCentralLine(stateOut.eclipse, stateOut.limits, 3/1440);
    stateOut.umbraLine = [];
    stateOut.contactPoints = computeFirstLastContact(stateOut.eclipse, stateOut.limits);    
    stateOut.riseSetPoints = computeRiseSet(stateOut.eclipse, stateOut.limits, stateOut.contactPoints,  3/3000);
    stateOut.contourPointsMag = contourToPoints(stateOut.contours);
    stateOut.magCaptions = [];
    stateOut.maxCaptions = [];
    stateOut.maxLinePoints = [[], []];

    stateOut.limits.JTmin = stateOut.contactPoints.JTfirstPenumbra - 60/1440;
    stateOut.limits.JTax = stateOut.contactPoints.JTlastPenumbra + 60/1440;

    // Initialize camera rotation to the first contact point.
    camera.rotZ = orbitsjs.deg2Rad(-90 - stateOut.contactPoints.lonFirstPenumbra);
    camera.rotX = orbitsjs.deg2Rad(-90 + stateOut.contactPoints.latFirstPenumbra);

    JTstart = orbitsjs.timeJulianTs(new Date()).JT;
    return stateOut;
}

/**
 * Compute rotation to the target.
 * 
 * @param {*} JT 
 *      Julian time.
 * @param {*} state 
 *      State.
 * @param {*} wgs84 
 *      WGS84 coordinates of the intersection with the Sun-Moon axis.
 * @returns Object with targetRotZ and targetRotX rotations.
 */
function computeTarget(JT, state, wgs84)
{
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

    return {targetRotX : targetRotX, targetRotZ : targetRotZ};
}

// Time of the latest time slider input event.
let sliderTime = null;

// Initial value of the time slider.
let sliderStartValue = 0;
const timeSlider = document.getElementById("timeRange");
timeSlider.addEventListener('input', (event) => {
    if (sliderTime == null)
    {
        sliderTime = new Date().getTime();
        sliderStartValue = timeSlider.value;
    }
});

// Warp factor during the previous frame.
let warpFactorPrev = guiControls.warpFactor;

// The Julian time corresponding to the (hardware) clock.
let JTstart = orbitsjs.timeJulianTs(new Date()).JT;
let JTprev = undefined;

// Eclipse at init.
let indEclipse = eclipseInds['2019-12-26 (Annular)'];
let state = loadEclipse(listEclipses[indEclipse]);

let drawing = false;
requestAnimationFrame(drawScene);

/**
 * Compute intersection of the Moon-Earth axis with the Earth.
 * 
 * @param {*} eclipse 
 *     The eclipse object.
 * @param {*} JT 
 *     Julian time.
 * @returns WGS84 coordinates of the intersection.
 */
function axisIntersection(eclipse, JT)
{
   // Besselian elements.
   const bessel = orbitsjs.besselianSolarWithDelta(state.eclipse, JT, 1/1440);
   // Compute position on the central line.
   const centralLineJT = orbitsjs.besselianCentralLine(state.eclipse, bessel, JT);

   // Compute the intersection of the Sun-Moon axis with Earth.
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

   return wgs84;
}

/**
 * Handle slider updates.
 * 
 * @param {*} JT 
 *      Julian time (simulated).
 * @param {*} todayJT
 *      Julian time (hardware).
 * @param {*} warpFactorNew
 *      Warp factor when drawing started.
 */
function handleSlider(JT, todayJT, warpFactorNew)
{
    if (sliderTime == null)
    {
        // No user action. Update slider position according to (simulated) time.
        timeSlider.value = Math.floor(10000 * (JT - state.limits.JTmin)/(state.limits.JTmax - state.limits.JTmin));
    }
    else 
    {
        if (new Date().getTime() - sliderTime > 1000)
        {
            // Assume that slider action has been handled since 1 second has passed 
            // since user action.
            sliderTime = null;
        }
        else 
        {
            // Compute JTstart so that the slider position corresponds to the requested
            // state of the eclipse.

            // 10000 * (JT - JTmin) / (JTmax - JTmin) = value 
            // 10000 * (JT - JTmin) = (JTmax - JTmin) * value
            // JT = JTmin + (JTmax - JTmin) * value / 10000
            const JTtarget = state.limits.JTmin + (state.limits.JTmax - state.limits.JTmin) 
                           * timeSlider.value / 10000;

            // JT = warpFactor*(todayJT - JTstart) + JTmin;
            // (JT - JTmin) / warpFactor = todayJT - JTstart
            // JTstart = todayJT - (JT - JTmin) / warpFactor
            JTstart = todayJT - (JTtarget - state.limits.JTmin) / warpFactorNew;
        }
    }

    // When time exceeds limit end time of the eclipse, return to the limit 
    // start time of the eclipse. 
    if (JT > state.limits.JTmax && sliderTime == null)
    {
       JTstart = todayJT;
    }
    if (JT < state.limits.JTmin && sliderTime == null)
    {
       //JTstart = todayJT;
       //JT = warpFactor*(todayJT - JTstart) + JTmin = JTmax
       // (JTmax - JTmin)/warpFactor = todayJT - JTstart
       JTstart = todayJT - (state.limits.JTmax - state.limits.JTmin) / warpFactorNew;
    }
}

/**
 * Draw the scene.
 * 
 * @param {*} time 
 *      Timestamp from requestAnimationFrame (not used).
 */
function drawScene(time) 
{
    // Do not draw the scene before the textures have been loaded.
    if (earthShaders.numTextures < 2)
    {
        requestAnimationFrame(drawScene);
        return;
    }

    // Load new eclipse if requested.
    if (pendingLoad != null)
    {
        state = loadEclipse(listEclipses[pendingLoad]);
        indEclipse = pendingLoad;   
        pendingLoad = null;   
    }

    // Avoid divisions by zero:
    let warpFactorNew = guiControls.warpFactor;
    if (warpFactorNew == 0) {
        warpFactorNew = 0.00001;
    }

    drawing = true;

    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    gl.useProgram(earthShaders.program);

    // Compute Julian time corresponding to the (hardware) clock.
    let dateNow = new Date();
    let today = null;
    today = new Date(dateNow.getTime());
    const todayJT = orbitsjs.timeJulianTs(today).JT;

    // Compute Julian time.
    if (warpFactorPrev != warpFactorNew)
    {
        // We need to take into account that the warp factor can change between
        // two frames. In order to maintain continuity, we need to recompute 
        // JTstart.

        // warp * (todayJT - JTstartnew) = warpPrev * (todayJT - JTstartold) 
        // todayJT - JTstartnew = (warpPrev / warp) * (todayJT - JTstartold)
        // JTstartnew = todayJT - (warpPrev / warp) * (todayJT - JTstartold)
        JTstart = todayJT - (warpFactorPrev / warpFactorNew)
                * (todayJT - JTstart);
    }

    // If paused, update JTstart so that the time does not change.
    if (guiControls.pause && sliderTime == null)
    {
        // warpFactorNew * (todayJT - JTstart) + state.limits.JTmin = JTprev;
        // (JTprev - JTmin) / warpFactorNew = todayJT - JTstart

        JTstart = todayJT - (JTprev - state.limits.JTmin) / warpFactorNew;
    }

    warpFactorPrev = warpFactorNew;

    // Compute the Julian time taking into account the time warp.
    let JT = warpFactorNew * (todayJT - JTstart) + state.limits.JTmin;
    JTprev = JT;

    // Handle the slider.
    handleSlider(JT, todayJT, warpFactorNew);

    // Compute nutation parameters.
    let T = (JT - 2451545.0)/36525.0;
    let nutPar = orbitsjs.nutationTerms(T);

    // Update time and contact point captions.
    const timeGreg = orbitsjs.timeGregorian(JT);
    const dateStr = createTimestamp(JT) + " TT - " + JT + "<br>" 
                  + "P1 : First contact (Penumbra): " + createTimestamp(state.contactPoints.JTfirstPenumbra)+ "<br>" 
                  + "P2 : First contact (Umbra)&nbsp;&nbsp;&nbsp;: " + createTimestamp(state.contactPoints.JTfirstUmbra)+ "<br>" 
                  + "P3 : Last contact&nbsp; (Umbra)&nbsp;&nbsp;&nbsp;: " + createTimestamp(state.contactPoints.JTlastUmbra) + "<br>"
                  + "P4 : Last contact&nbsp; (Penumbra): " + createTimestamp(state.contactPoints.JTlastPenumbra);
    const dateText = document.getElementById("dateText");
    dateText.innerHTML = dateStr;

    // WGS84 coordinates of the intersection.
    const wgs84 = axisIntersection(state.eclipse, JT);

    // Compute rotations required to point to the target.
    let {targetRotX, targetRotZ} = computeTarget(JT, state, wgs84);

    if (guiControls.lockLonRot)
    {
        camera.rotZ = targetRotZ;
    }
    if (guiControls.lockLatRot)
    {
        camera.rotX = targetRotX;
    }

    // Compute position of the Sun and the Moon in the EFI frame for the shader.
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

    // The view matrix.
    const matrix = createViewMatrix();

    // Draw the Earth.
    earthShaders.draw(matrix, 
        guiControls.enableTextures, 
        guiControls.enableGrid, 
        guiControls.enableMap, 
        guiControls.enableEclipse, 
        true,
        osvMoonEfi.r, 
        osvSunEfi.r);

    // Draw the Sun and the Moon and lines to the subsolar and sublunar points.
    lineShaders.colorOrbit = guiControls.colorSubsolar;
    drawDistant(osvSunEfi.r, 695700000.0 * 2.0, matrix, guiControls.enableSubsolar,
        guiControls.enableSubsolarLine);
    lineShaders.colorOrbit = guiControls.colorSublunar;
    drawDistant(osvMoonEfi.r, 1737400.0 * 2.0, matrix, guiControls.enableSublunar,
        guiControls.enableSublunarLine);

    // Draw curves.
    drawCentralLine(matrix, wgs84.lat, wgs84.lon, osvMoonEfi.r, state.centralLine);
    drawRiseSet(matrix, state.riseSetPoints, state.maxLinePoints);

    // Draw contact points.
    drawContactPoints(matrix, state.contactPoints);

    // Draw planes.
    drawEcliptic(matrix, nutPar, JT);
    drawEquator(matrix);

    // Draw magnitude contours.
    drawContours(matrix, state.contourPointsMag, state.contourPointsDer, state.contourPointsUmbra);

    if (guiControls.enableMagContours)
    {
        drawCaptions(matrix, state.magCaptions);
    }
    if (guiControls.enableDerContours)
    {
        drawCaptions(matrix, state.maxCaptions);
    }

    // Compute and draw umbra.
    if (guiControls.enableUmbra)
    {
        lineShaders.colorOrbit = guiControls.colorUmbra;
        lineShaders.setGeometry(state.umbraLine);
        lineShaders.draw(matrix);
    }
    if (guiControls.enableUmbraContour)
    {
        let {umbraGrid, umbraLimits} = createUmbraContour(wgs84.lat, wgs84.lon, osvSunEfi, osvMoonEfi, 0.1);
        const contoursUmbra = orbitsjs.createContours(umbraLimits.lonMin, umbraLimits.lonMax, 
            umbraLimits.latMin, umbraLimits.latMax, 0.1 / Math.abs(orbitsjs.cosd(wgs84.lat)), umbraGrid, [1.0], [100.0]);
        const contourPointsUmbra = contourToPoints(contoursUmbra);

        lineShaders.colorOrbit = guiControls.colorUmbraContour;
        for (let indContour = 0; indContour < contourPointsUmbra.length; indContour++)
        {
            const points = contourPointsUmbra[indContour];
            lineShaders.setGeometry(points);
            lineShaders.draw(matrix);
        }
    }

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
    camera.fovRad = orbitsjs.deg2Rad(guiControls.fov);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = (camera.distance - b) / 2;
    const projectionMatrix = m4.perspective(camera.fovRad, aspect, zNear, camera.zFar);

    // Camera position in the clip space.
    const cameraPosition = [0, 0, camera.distance];
    const up = [0, 1, 0];
    const target = [0, 0, 0];

    // Compute the camera's matrix using look at.
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);
    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    // Update controls.
    cameraControls.lon.setValue(-90 - orbitsjs.rad2Deg(camera.rotZ));
    cameraControls.lat.setValue( 90 + orbitsjs.rad2Deg(camera.rotX));
    cameraControls.distance.setValue(camera.distance);

    // Rotate view projection matrix to take into account rotation to target coordinates.
    var matrix = m4.xRotate(viewProjectionMatrix, camera.rotX);
    matrix = m4.yRotate(matrix, camera.rotY);
    matrix = m4.zRotate(matrix, camera.rotZ);

    return matrix;
}