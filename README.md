# Bessel3d
Real-time visualization of solar eclipses. The code is still heavily under development and currently only visualizes a single solar eclipse. The GPU-preprocessed version seems to suffer from issues with Intel GPUs. The ephemeris for the Moon is also somewhat inaccurate, which can introduce about 30 km error.

[![Screenshot.](scrshot.png)](https://vsr83.github.io/Bessel3d/)
If the visualization has issues, try the non-optimized version at:
[https://vsr83.github.io/Bessel3d/index_nogpu.html](https://vsr83.github.io/Bessel3d/index_nogpu.html).

## Attributions
1. The JSON Earth map has been generated from [Natural Earth Data](https://www.naturalearthdata.com/) via the website [https://geojson-maps.ash.ms/](https://geojson-maps.ash.ms/).
2. The Earth day and night textures are from the Solar System Scope [website](https://www.solarsystemscope.com/textures/).
