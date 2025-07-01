import { Scene } from "./core/Scene";

const scene = new Scene("glCanvas");
scene.initialize();
// scene.skybox.loadCubeMap([
//   { src: 'cubemap/posx.png', target: scene.gl.TEXTURE_CUBE_MAP_POSITIVE_X },
//   { src: 'cubemap/negx.png', target: scene.gl.TEXTURE_CUBE_MAP_NEGATIVE_X },
//   { src: 'cubemap/posy.png', target: scene.gl.TEXTURE_CUBE_MAP_POSITIVE_Y },
//   { src: 'cubemap/negy.png', target: scene.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y },
//   { src: 'cubemap/posz.png', target: scene.gl.TEXTURE_CUBE_MAP_POSITIVE_Z },
//   { src: 'cubemap/negz.png', target: scene.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z },
// ]);
// const earth = new Planet(
//     "Earth",
//     scene.gl,
//     scene.utils,
//     vec3.fromValues(0, 0, -40),
//     vec3.fromValues(20, 20, 20),
//     23.44,
//     "textures/4k_earth_surface.jpg",
//     scene.axisHelper,
//     "textures/4k_earth_normal.jpg",
//     "textures/4k_earth_atmosphere.png", // atmosphere overlay
//     "textures/4k_earth_specular.jpg" // specular (reflectivity)
//   );

// scene.entityManager.add(
//   earth
// );

// const mars =  new Planet(
//     "Mars",
//     scene.gl,
//     scene.utils,
//     vec3.fromValues(0, 0, 50),
//     vec3.fromValues(15, 15, 15),
//     25.19,
//     "textures/2k_mars_surface.jpg",
//     scene.axisHelper,
//     "textures/2k_mars_normal.png"
//   );
// scene.entityManager.add(
//   mars
// );

// const jupiter =  new Planet(
//     "Jupiter",
//     scene.gl,
//     scene.utils,
//     vec3.fromValues(0, 0, -150),
//     vec3.fromValues(80, 80, 80),
//     3.13,
//     "textures/4k_jupiter.jpg",
//     scene.axisHelper,
//     // "textures/4k_jupiter_bump.jpg",
//   );
// scene.entityManager.add(
//  jupiter
// );

// // (scene.em.getEntity('Earth') as Planet).setOrbitSystem(new OrbitSystem(
// //   vec3.fromValues(0, 0, 0),
// //   100,
// //   0.1,
// // ));
// // After planet creation:
// scene.orbitSystem.addOrbit({
//   object: scene.entityManager.getEntity("Earth")!,
//   semiMajorAxis: 500, // in km (1 AU)
//   eccentricity: 0.0167, // nearly circular
//   inclination: 0.00005, // degrees, very close to 0
//   longitudeOfAscendingNode: -11.26064, // Ω in degrees
//   argumentOfPeriapsis: 114.20783, // ω in degrees
//   meanAnomalyAtEpoch: 358.617, // degrees (at J2000)
//   orbitalPeriod: 365.256, // days (sidereal year)
// });
// scene.camera.follow(scene.entityManager.getEntity("Earth")!, vec3.fromValues(30,30,30));
let lastTime = performance.now();
function loop(time: number) {
  const deltaTime = time - lastTime; // in milliseconds
  lastTime = time;
  scene.update(deltaTime);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
