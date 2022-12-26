// dat.gui controls
let guiControls = null;

// Hold
const displayControls = {};
const appearanceControls = {};
const cameraControls = {};
const frameControls = {};
const timeControls = {};

function loadPreset(data)
{
    displayControls.enableMap.setValue(data.enableMap);
    displayControls.enableGrid.setValue(data.enableGrid);
    displayControls.enableMagContours.setValue(data.enableMagContours);
    displayControls.enableDerContours.setValue(data.enableDerContours);
    displayControls.enableEcliptic.setValue(data.enableEcliptic);
    displayControls.enableEquator.setValue(data.enableEquator);
    displayControls.enableEclipse.setValue(data.enableEclipse);
    displayControls.enableUmbra.setValue(data.enableUmbra);
    displayControls.enableConstellations.setValue(data.enableConstellations);
    displayControls.enableTextures.setValue(data.enableTextures);
    displayControls.enableSubsolar.setValue(data.enableSubsolar);
    displayControls.enableSublunar.setValue(data.enableSublunar);
    displayControls.enableCentral.setValue(data.enableCentral);
    displayControls.enableAxisLine.setValue(data.enableAxisLine);
    displayControls.enableSubsolarLine.setValue(data.enableSubsolarLine);
    displayControls.enableSublunarLine.setValue(data.enableSublunarLine);
    displayControls.drawClock.setValue(data.drawClock);
    displayControls.drawTitle.setValue(data.drawTitle);

    appearanceControls.grayscale.setValue(data.grayscale);
    appearanceControls.brightness.setValue(data.brightness);
    appearanceControls.colorGrid.setValue(data.colorGrid);
    appearanceControls.colorMap.setValue(data.colorMap)
    appearanceControls.colorText.setValue(data.colorText);
    appearanceControls.colorUmbra.setValue(data.colorUmbra);
    appearanceControls.colorContact.setValue(data.colorContact);
    appearanceControls.colorCentral.setValue(data.colorCentral);
    appearanceControls.colorOrbit.setValue(data.colorOrbit);
    appearanceControls.colorRiseSet.setValue(data.colorRiseSet);
    appearanceControls.colorMaxRiseSet.setValue(data.colorMaxRiseSet);
    appearanceControls.colorMagContour.setValue(data.colorMagContour);
    appearanceControls.colorDerContour.setValue(data.colorDerContour);
    appearanceControls.colorSubsolar.setValue(data.colorSubsolar);
    appearanceControls.colorSublunar.setValue(data.colorSublunar);
}

guiControls = new function()
{
    this.enableMap = true;
    this.enableGrid = false;
    this.enableMagContours = true;
    this.enableDerContours = true;

    this.enableEcliptic = true;
    this.enableEquator = true;
    this.enableEclipse = true;
    this.enableUmbra = true;
    this.enableConstellations = false;
    this.enableTextures = true; 
    this.enableSubsolar = true;
    this.enableSublunar = true; 
    this.enableCentral = true;
    this.enableAxisLine = true;
    this.enableSubsolarLine = false;
    this.enableSublunarLine = false; 
    this.drawClock = true; 
    this.drawTitle = true;
    this.gridLonResolution = 30;
    this.gridLatResolution = 30; 

    this.brightness = 0.8;
    this.colorGrid = [80, 80, 80];
    this.colorMap = [80, 80, 120];
    this.colorText = [255, 255, 255];
    this.colorCentral = [255, 255, 255];
    this.colorContact = [255, 255, 255];
    this.colorOrbit = [127, 127, 127];
    this.colorUmbra = [255, 0, 0];
    this.colorRiseSet = [0, 255, 0];
    this.colorMagContour = [127, 127, 127];
    this.colorDerContour = [127, 127, 127];
    this.colorSubsolar = [255, 255, 255];
    this.colorSublunar = [255, 255, 255];
    this.colorMaxRiseSet = [255, 255, 255];

    this.enableRiseSet = true; 
    this.enableContact = true; 
    this.enableCaptions = true; 

    this.warpFactor = 500.0;
    this.skipToNext = false;

    this.grayscale = false;

    this.GitHub = function() {
        window.open("https://github.com/vsr83/Bessel3d");
    };
    this.lockLonRot = false; 
    this.lockLatRot = false;
    this.lon = 0.0; 
    this.lat = 0.0;
    this.distance = 6378.1370*1.01;
    this.upLon = 0.0;
    this.upLat = 90.0;
    this.fov = 10;

    this.computeGrid_4 = true;
    this.computeGrid_2 = true;
    this.computeGrid_1 = true;
    this.computeGrid_0_5 = true;
    this.computeGrid_0_25 = true;

    this.presetDefaults = function()
    {
        loadPreset(presetDefaults);
    }
    this.presetBw = function()
    {
        loadPreset(presetBw);
    }
    this.presetGrayscale = function()
    {
        loadPreset(presetGrayscale);
    }
}

// Presets:
const presetBw = {
    "enableMap":true,
    "enableGrid":false,
    "enableMagContours":true,
    "enableDerContours":true,
    "enableEcliptic":true,
    "enableEquator":true,
    "enableEclipse":false,
    "enableUmbra":true,
    "enableConstellations":false,
    "enableTextures":false,
    "enableSubsolar":true,
    "enableSublunar":true,
    "enableCentral":true,
    "enableAxisLine":true,
    "enableSubsolarLine":false,
    "enableSublunarLine":false,
    "drawClock":true,
    "drawTitle":true,
    "gridLonResolution":30,
    "gridLatResolution":30,
    "brightness":1,
    "colorGrid":[0,0,0],
    "colorMap":[0,0,0],
    "colorText":[0,0,0],
    "colorCentral":[0,0,0],
    "colorContact":[2.5,0,0],
    "colorOrbit":[127,127,127],
    "colorUmbra":[0,0,0],
    "colorRiseSet":[0,0,0],
    "colorMagContour":[15.0,0,0],
    "colorDerContour":[127,127,127],
    "colorSubsolar":[0,0,0],
    "colorSublunar":[0,0,0],
    "colorMaxRiseSet":[0,0,0],
    "enableRiseSet":true,
    "enableContact":true,
    "enableCaptions":true,
    "warpFactor":0,
    "skipToNext":false,
    "grayscale":false,
    "lockLonRot":false,
    "lockLatRot":false,
    "lon":85.8,
    "lat":21.1,
    "distance":82400,
    "upLon":0,
    "upLat":90,
    "fov":10,
    "computeGrid_4":true,
    "computeGrid_2":true,
    "computeGrid_1":true,
    "computeGrid_0_5":true,
    "computeGrid_0_25":true
};

const presetGrayscale = 
{
    "enableMap":true,
    "enableGrid":false,
    "enableMagContours":true,
    "enableDerContours":true,
    "enableEcliptic":true,
    "enableEquator":true,
    "enableEclipse":true,
    "enableUmbra":true,
    "enableConstellations":false,
    "enableTextures":true,
    "enableSubsolar":true,
    "enableSublunar":true,
    "enableCentral":true,
    "enableAxisLine":true,
    "enableSubsolarLine":false,
    "enableSublunarLine":false,
    "drawClock":true,
    "drawTitle":true,
    "gridLonResolution":30,
    "gridLatResolution":30,
    "brightness":0.61,
    "colorGrid":[80,80,80],
    "colorMap":[132.49999999999997,132.49999999999997,132.49999999999997],
    "colorText":[255,255,255],
    "colorCentral":[255,255,255],
    "colorContact":[255,255,255],
    "colorOrbit":[127,127,127],
    "colorUmbra":[255,0,0],
    "colorRiseSet":[255,255,255],
    "colorMagContour":[127,127,127],
    "colorDerContour":[127,127,127],
    "colorSubsolar":[255,255,255],
    "colorSublunar":[255,255,255],
    "colorMaxRiseSet":[255,255,255],
    "enableRiseSet":true,
    "enableContact":true,
    "enableCaptions":true,
    "warpFactor":500,
    "skipToNext":false,
    "grayscale":true,
    "lockLonRot":false,
    "lockLatRot":false,
    "lon":126.10000000000001,
    "lat":23.900000000000002,
    "distance":71100,
    "upLon":0,
    "upLat":90,
    "fov":10,
    "computeGrid_4":true,
    "computeGrid_2":true,
    "computeGrid_1":true,
    "computeGrid_0_5":true,
    "computeGrid_0_25":true
}

const presetDefaults = JSON.parse(JSON.stringify(guiControls));


gui = new dat.GUI();

const visibilityFolder = gui.addFolder('Visibility');
displayControls.enableMap = visibilityFolder.add(guiControls, 'enableMap').name('Map Lines');
displayControls.enableEclipse = visibilityFolder.add(guiControls, 'enableEclipse').name('Penumbra');
displayControls.enableUmbra = visibilityFolder.add(guiControls, 'enableUmbra').name('Umbra');
displayControls.enableMagContours = visibilityFolder.add(guiControls, 'enableMagContours').name('Mag. Contours');

displayControls.enableDerContours = visibilityFolder.add(guiControls, 'enableDerContours').name('Max. Contours');
displayControls.enableGrid = visibilityFolder.add(guiControls, 'enableGrid').name('Grid Lines');
displayControls.enableRiseSet = visibilityFolder.add(guiControls, 'enableRiseSet').name('Rise&Set Lines');
displayControls.enableContact = visibilityFolder.add(guiControls, 'enableContact').name('Contact Points');
displayControls.enableEcliptic = visibilityFolder.add(guiControls, 'enableEcliptic').name('Ecliptic');
displayControls.enableEquator = visibilityFolder.add(guiControls, 'enableEquator').name('Equator');
displayControls.enableConstellations = visibilityFolder.add(guiControls, 'enableConstellations').name('Constellations');
displayControls.enableTextures = visibilityFolder.add(guiControls, 'enableTextures').name('Textures'); 
displayControls.enableSubsolar = visibilityFolder.add(guiControls, 'enableSubsolar').name('Subsolar point');
displayControls.enableSublunar = visibilityFolder.add(guiControls, 'enableSublunar').name('Sublunar point'); 
displayControls.enableCentral = visibilityFolder.add(guiControls, 'enableCentral').name('Central line');
displayControls.enableAxisLine = visibilityFolder.add(guiControls, 'enableAxisLine').name('Axis line');
displayControls.enableSubsolarLine = visibilityFolder.add(guiControls, 'enableSubsolarLine').name('Subsolar line');
displayControls.enableSublunarLine = visibilityFolder.add(guiControls, 'enableSublunarLine').name('Sublunar line'); 
displayControls.drawClock = visibilityFolder.add(guiControls, 'drawClock').name('Clock')
    .onChange(function() 
    {
        const container = document.getElementById("dateContainer");
        if (guiControls.drawClock)
        {
            container.style.visibility = "visible";
        }
        else 
        {
            container.style.visibility = "hidden";
        }
    }); 
displayControls.drawTitle = visibilityFolder.add(guiControls, 'drawTitle').name('Title')
.onChange(function() 
{
    const title = document.getElementById("nameContainer");
    if (guiControls.drawTitle)
    {
        title.style.visibility = "visible";
    }
    else 
    {
        title.style.visibility = "hidden";
    }
}); 

const appearanceFolder = gui.addFolder('Appearance');
appearanceControls.grayscale = appearanceFolder.add(guiControls, 'grayscale').name('Grayscale');
appearanceControls.brightness =  appearanceFolder.add(guiControls, 'brightness',0, 1.0, 0.01).name('Brightness');

displayControls.gridLonResolution = appearanceFolder.add(guiControls, 'gridLonResolution', 1, 180, 1)
    .name('Grid Lon. Resolution')
    .onChange(function()
    {
        earthShaders.updateGrid(guiControls.gridLonResolution, guiControls.gridLatResolution);
    });
displayControls.gridLatResolution = appearanceFolder.add(guiControls, 'gridLatResolution', 1, 180, 1)
    .name('Grid Lat. Resolution')
    .onChange(function()
    {
        earthShaders.updateGrid(guiControls.gridLonResolution, guiControls.gridLatResolution);
    });

appearanceControls.colorGrid = appearanceFolder.addColor(guiControls, 'colorGrid').name('Grid Color')
.onChange(function()
{
    earthShaders.colorGrid = guiControls.colorGrid;
    earthShaders.setColorsGrid();
});
appearanceControls.colorMap = appearanceFolder.addColor(guiControls, 'colorMap').name('Map Color')
.onChange(function()
{
    earthShaders.colorMap = guiControls.colorMap;
    earthShaders.setColorsMap();
});
appearanceControls.colorText = appearanceFolder.addColor(guiControls, 'colorText').name('Text');
appearanceControls.colorUmbra = appearanceFolder.addColor(guiControls, 'colorUmbra').name('Umbra');
appearanceControls.colorContact = appearanceFolder.addColor(guiControls, 'colorContact').name('Contact Points');
appearanceControls.colorCentral = appearanceFolder.addColor(guiControls, 'colorCentral').name('Central Line');
appearanceControls.colorOrbit = appearanceFolder.addColor(guiControls, 'colorOrbit').name('Orbits');
appearanceControls.colorRiseSet = appearanceFolder.addColor(guiControls, 'colorRiseSet').name('Rise/Set Lines');
appearanceControls.colorMaxRiseSet = appearanceFolder.addColor(guiControls, 'colorMaxRiseSet').name('Rise/Set Max');
appearanceControls.colorMagContour = appearanceFolder.addColor(guiControls, 'colorMagContour').name('Mag. Contours');
appearanceControls.colorDerContour = appearanceFolder.addColor(guiControls, 'colorDerContour').name('Max. Contours');
appearanceControls.colorSubsolar = appearanceFolder.addColor(guiControls, 'colorSubsolar').name('Subsolar Point');
appearanceControls.colorSublunar = appearanceFolder.addColor(guiControls, 'colorSublunar').name('Sublunar Point');

appearanceFolder.add(guiControls, 'presetDefaults').name('Preset - Defaults');
appearanceFolder.add(guiControls, 'presetGrayscale').name('Preset - Grayscale');
appearanceFolder.add(guiControls, 'presetBw').name('Preset - BW');

const cameraFolder = gui.addFolder('Camera');
cameraControls.fov = cameraFolder.add(guiControls, 'fov', 1, 180, 1).name('Field of View');
cameraControls.lockLonRot = cameraFolder.add(guiControls, 'lockLonRot').name('Lock Longitude');
cameraControls.lockLatRot = cameraFolder.add(guiControls, 'lockLatRot').name('Lock Latitude');
cameraControls.lon = cameraFolder.add(guiControls, 'lon', -180, 180, 0.1).name('Longitude');
cameraControls.lat = cameraFolder.add(guiControls, 'lat', -180, 180, 0.1).name('Latitude');
cameraControls.distance = cameraFolder.add(guiControls, 'distance', 6378.1370*1.01, 1000000, 100).name('Distance');

const timeFolder = gui.addFolder('Time');
timeControls.warpFactor = timeFolder.add(guiControls, 'warpFactor', -10000, 10000, 1).name('Warp Factor');

const computationFolder = gui.addFolder('Computation');
computationFolder.add(guiControls, 'computeGrid_4').name("Grid 4.0");
computationFolder.add(guiControls, 'computeGrid_2').name("Grid 2.0");
computationFolder.add(guiControls, 'computeGrid_1').name("Grid 1.0");
computationFolder.add(guiControls, 'computeGrid_0_5').name("Grid 0.5");
computationFolder.add(guiControls, 'computeGrid_0_25').name("Grid 0.25");

gui.add(guiControls, 'GitHub');
