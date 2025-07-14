export const TEXTURES = {
  sky: "textures/milkyway.png",
  sun: "textures/lensFlare.png",
  earthSurface: "textures/8k_earth_daymap.jpg",
  earthNormal: "textures/8k_earth_normal_map.png",
  earthSpecular: "textures/8k_earth_specular_map.png",
  earthAtmosphere: "textures/8k_earth_clouds.jpg",
  earthNight: "textures/8k_earth_nightmap.jpg",
  moonSurface: "textures/4k_moon_surface.jpg",
  moonNormal: "textures/4k_moon_normal.jpg",
  // marsSurface: "textures/2k_mars_surface.jpg",
  // marsNormal: "textures/2k_mars_normal.png",
  // jupiterSurface: "textures/8k_jupiter.jpg",
  // venusSurface: "textures/8k_venus_surface.jpg",
  // venusAtmosphere: "textures/4k_venus_atmosphere.jpg",
  // mercurySurface: "textures/2k_mercury.jpg",
  // saturnSurface: "textures/8k_saturn.jpg",
  // uranusSurface: "textures/2k_uranus.jpg",
};

export const FONTS = [{ name: "NeonSans", url: "fonts/NeonSans.ttf" }];

export const MODELS = {
  // asteroid1: "models/asteroid_1.glb",
  // asteroid2: "models/asteroid_2.glb"
}

export const SHADERS = {
  planet: {
    vertex: "basePlanet.vert.glsl",
    fragment: "basePlanet.frag.glsl"
  },
  planetAtmosphere: {
    vertex: "atmospherePlanet.vert.glsl",
    fragment: "atmospherePlanet.frag.glsl"
  },
  selectionGlow: {
    vertex: "selectionGlow.vert.glsl",
    fragment: "selectionGlow.frag.glsl"
  },
  // Add more shaders as needed, e.g.:
  // tag: { vertex: "tag.vert.glsl", fragment: "tag.frag.glsl" },
  // sun: { vertex: "sun.vert.glsl", fragment: "sun.frag.glsl" },
};
