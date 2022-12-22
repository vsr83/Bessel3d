// dat.gui controls
let guiControls = null;

// Hold
const displayControls = {};
const cameraControls = {};
const frameControls = {};
const timeControls = {};

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
}


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
appearanceFolder.add(guiControls, 'grayscale').name('Grayscale');
appearanceFolder.add(guiControls, 'brightness',0, 1.0, 0.01).name('Brightness');

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

appearanceFolder.addColor(guiControls, 'colorGrid').name('Grid Color')
.onChange(function()
{
    earthShaders.colorGrid = guiControls.colorGrid;
    earthShaders.setColorsGrid();
});
appearanceFolder.addColor(guiControls, 'colorMap').name('Map Color')
.onChange(function()
{
    earthShaders.colorMap = guiControls.colorMap;
    earthShaders.setColorsMap();
});
appearanceFolder.addColor(guiControls, 'colorText').name('Text');
appearanceFolder.addColor(guiControls, 'colorUmbra').name('Umbra');
appearanceFolder.addColor(guiControls, 'colorContact').name('Contact Points');
appearanceFolder.addColor(guiControls, 'colorCentral').name('Central Line');
appearanceFolder.addColor(guiControls, 'colorOrbit').name('Orbits');
appearanceFolder.addColor(guiControls, 'colorRiseSet').name('Rise/Set Lines');
appearanceFolder.addColor(guiControls, 'colorMagContour').name('Mag. Contours');
appearanceFolder.addColor(guiControls, 'colorDerContour').name('Max. Contours');
appearanceFolder.addColor(guiControls, 'colorSubsolar').name('Subsolar Point');
appearanceFolder.addColor(guiControls, 'colorSublunar').name('Sublunar Point');

const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(guiControls, 'fov', 1, 180, 1).name('Field of View');
cameraFolder.add(guiControls, 'lockLonRot').name('Lock Longitude');
cameraFolder.add(guiControls, 'lockLatRot').name('Lock Latitude');
cameraControls.lon = cameraFolder.add(guiControls, 'lon', -180, 180, 0.1).name('Longitude');
cameraControls.lat = cameraFolder.add(guiControls, 'lat', -180, 180, 0.1).name('Latitude');
cameraControls.distance = cameraFolder.add(guiControls, 'distance', 6378.1370*1.01, 1000000, 100).name('Distance');

const timeFolder = gui.addFolder('Time');
timeControls.warpFactor = timeFolder.add(guiControls, 'warpFactor', -1000, 1000, 1).name('Warp Factor');

const computationFolder = gui.addFolder('Computation');
computationFolder.add(guiControls, 'computeGrid_4').name("Grid 4.0");
computationFolder.add(guiControls, 'computeGrid_2').name("Grid 2.0");
computationFolder.add(guiControls, 'computeGrid_1').name("Grid 1.0");
computationFolder.add(guiControls, 'computeGrid_0_5').name("Grid 0.5");
computationFolder.add(guiControls, 'computeGrid_0_25').name("Grid 0.25");

gui.add(guiControls, 'GitHub');
