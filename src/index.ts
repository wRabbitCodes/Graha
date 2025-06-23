import { Scene } from "./engine/Scene";
import { Planet } from "./models/Planet";
import { vec3 } from "gl-matrix";
import { Sun } from "./models/Sun";
import { OrbitSystem } from "./systems/OrbitSystems";

const scene = new Scene("glCanvas");

// scene.skybox.loadCubeMap([
//   { src: 'cubemap/posx.png', target: scene.gl.TEXTURE_CUBE_MAP_POSITIVE_X },
//   { src: 'cubemap/negx.png', target: scene.gl.TEXTURE_CUBE_MAP_NEGATIVE_X },
//   { src: 'cubemap/posy.png', target: scene.gl.TEXTURE_CUBE_MAP_POSITIVE_Y },
//   { src: 'cubemap/negy.png', target: scene.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y },
//   { src: 'cubemap/posz.png', target: scene.gl.TEXTURE_CUBE_MAP_POSITIVE_Z },
//   { src: 'cubemap/negz.png', target: scene.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z },
// ]);

scene.em.add(new Planet('Earth', scene.gl, scene.utils,
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(2, 2, 2),
  "textures/4k_earth_surface.jpg",
  "textures/4k_earth_normal.jpg",
  "textures/4k_earth_atmosphere.png",      // atmosphere overlay
  "textures/4k_earth_specular.jpg",     // specular (reflectivity)
));

(scene.em.getEntity('Earth') as Planet).setOrbitSystem(new OrbitSystem(
  vec3.fromValues(0, 0, 0),
  30,
  0.1,
));

scene.em.add(new Planet('Mars', scene.gl, scene.utils,
  vec3.fromValues(2, 0, 10),
  vec3.fromValues(4, 4, 4),
  "textures/2k_mars_surface.jpg",
  "textures/2k_mars_normal.png",
));

function loop(time: number) {
  scene.render(time);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);