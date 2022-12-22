self.importScripts("../imports/orbits_js.js");
self.importScripts("../visualization/Captions.js");
self.importScripts("../visualization/Contours.js");
self.importScripts("../visualization/Lines.js");

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

function createState(eclipseData, gridSize, timeStep)
{
    const state = {};
    state.eclipse = eclipseData;

    console.log("ContourWorker - " + gridSize + " started");

    // Update title:
    state.title = createTimestamp(state.eclipse.JTmax) + " (" + state.eclipse.type + ")";

    startTime = performance.now()
    state.gridSize = 0.25;
    
    state.contours = null;
    state.limits = {JTmin : state.eclipse.JTmax - 5/24, JTmax : state.eclipse.JTmax + 5/24};
    
    state.limits = computeLimits(state.eclipse, 2.0, 5.0/1440.0);
    let {contoursMag, contoursMagUmbra} = createContours(state.limits, gridSize, timeStep);

    console.log(contoursMag);
    state.contours = contoursMag;
    state.umbraContours = contoursMagUmbra;
        
    //const limits = gpuLimits;
    state.limits.temporalRes = 1/1440;
        
    state.centralLine = computeCentralLine(state.eclipse, state.limits, timeStep);
    state.riseSetPoints = computeRiseSet(state.eclipse, state.limits, timeStep);
    state.contourPointsMag = contourToPoints(state.contours);
    state.contourPointsUmbra = contourToPoints(state.umbraContours);
    state.contactPoints = computeFirstLastContact(state.eclipse, state.limits);    

    console.log(state.contourPointsUmbra);

    state.limits.JTmin = state.contactPoints.JTfirstPenumbra - 60/1440;
    state.limits.JTax = state.contactPoints.JTlastPenumbra + 60/1440;
    state.derContours = createDerContours(state.limits, 1.0, timeStep);
    state.contourPointsDer = contourToPoints(state.derContours);
    let {magCaptions, maxCaptions} = createMagCaptions(state.derContours);
    state.magCaptions = magCaptions;
    state.maxCaptions = maxCaptions;

    console.log("ContourWorker - " + gridSize + " done");

    return state;
}

self.addEventListener('message', function(e)
{
    if (e.data.computeGrid_4)
    {
        let state_4 = createState(e.data.eclipse, 4.0, 4/1440);
        this.self.postMessage(state_4);
    }
    if (e.data.computeGrid_2)
    {
        let state_2 = createState(e.data.eclipse, 2.0, 2/1440);
        this.self.postMessage(state_2);
    }
    if (e.data.computeGrid_1)
    {
        let state_1 = createState(e.data.eclipse, 1.0, 1/1440);
        this.self.postMessage(state_1);
    }
    if (e.data.computeGrid_0_5)
    {
        let state_0_5 = createState(e.data.eclipse, 0.5, 1/1440);
        this.self.postMessage(state_0_5);
    }
    if (e.data.computeGrid_0_25)
    {
        let state_0_25 = createState(e.data.eclipse, 0.25, 1/1440);
        this.self.postMessage(state_0_25);
    }
});