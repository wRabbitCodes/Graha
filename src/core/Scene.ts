// import { IO } from "./IO";
// import { Canvas } from "./Canvas";
// import { GLUtils } from "../engine/utils/GLUtils";
// import { Camera } from "./Camera";
// import { EntityManager } from "./EntityManager";
// import { vec3 } from "gl-matrix";
// import { SkySphere } from "../models/SkySphere";
// import { Sun } from "../models/Sun";
// import { AxisHelper } from "../systems/AxisPlotter";
// import { OrbitSystem } from "../systems/OrbitManager";
// import { Raycaster } from "../engine/utils/Raycaster";
// import { Planet } from "../models/Planet";
// import { BoundingBoxHelper } from "../systems/BoundingBoxPlotter";
// import { Popup } from "../models/PopupPanel";
// import { CollisionDetector } from "../engine/utils/CollisionDetector";

// export class Scene {
//   readonly gl: WebGL2RenderingContext;
//   readonly utils: GLUtils;
//   readonly canvas: Canvas;
//   readonly camera: Camera;
//   readonly sun: Sun;
//   readonly skySphere: SkySphere;
//   readonly input: IO;
//   readonly entityManager: EntityManager;
//   readonly orbitSystem: OrbitSystem;
//   readonly raycaster: Raycaster;
//   readonly axisHelper: AxisHelper;
//   readonly boundingBoxHelper: BoundingBoxHelper;
//   readonly popup: Popup;
//   readonly collisionDetector: CollisionDetector;

//   private selected: Planet | null = null;

//   constructor(canvasId: string) {
//     this.canvas = new Canvas(canvasId);
//     this.gl = this.canvas.gl;

//     this.utils = new GLUtils(this.gl);
//     this.input = new IO(this.canvas.canvas);
//     this.camera = new Camera();
//     this.axisHelper = new AxisHelper(this.gl, this.utils);
//     this.entityManager = new EntityManager();
//     this.sun = new Sun(
//       this.gl,
//       this.utils,
//       this.axisHelper,
//       "textures/lensFlare.png"
//     );
//     this.skySphere = new SkySphere(
//       this.gl,
//       this.utils,
//       "textures/milkyway.png"
//     );
//     this.orbitSystem = new OrbitSystem(this.gl, this.utils);
//     this.raycaster = new Raycaster();
//     this.boundingBoxHelper = new BoundingBoxHelper(this.gl);
//     this.popup = new Popup(this.gl, this.utils);
//     this.collisionDetector = new CollisionDetector();
//     this.canvas.enablePointerLock((ndcX, ndcY) => {
//       // const ray = this.raycaster.getRayFromNDC(ndcX, ndcY, proj, view, this.camera.getPosition());
//       const ray = this.raycaster.setFromViewMatrix(this.camera.getViewMatrix());
//       console.log("Camera Pos:", ray.origin);
//       console.log("Ray Dir:", ray.direction);
//       let closest = Infinity;
//       let selected: Planet | null = null;

//       for (const planet of this.entityManager.getEntities()) {
//         if (!(planet instanceof Planet)) continue;
//         const t = this.raycaster.intersectSphere(
//           ray.origin,
//           ray.direction,
//           planet.getModelMatrix(),
//           planet.getRadius()
//         );

//         if (t !== null && t < closest) {
//           closest = t;
//           selected = planet;
//           this.selected = selected;
//           this.popup.setSizeRelativeToPlanet(selected.getRadius());
//         }
//       }
//       if (selected) {
//         selected.setSelected(!selected.isSelected());
//         console.log("SELECTED ", selected);
//       }
//     });

//     this.canvas.onPointerLockChange((locked) => {
//       if (!locked) {
//         this.input.disableInputs();
//         this.input.clear();
//       } else {
//         this.input.enableMouseInputs((dragging, e) => {
//           if (!dragging) this.camera.cameraMouseHandler(e);
//         });
//         this.input.enableKeyboardInputs();
//       }
//     });
//   }

//   private update(time: number) {
//     this.camera.cameraKeyboardHandler(this.input.getKeys(), () => {
//       this.collisionDetector.updateEntities(
//         this.entityManager.getEntities().map((entity) => ({
//           name: (entity as Planet).getName(),
//           obb: {
//             max: (entity as Planet).getBoundingInfo().obbMax,
//             min: (entity as Planet).getBoundingInfo().obbMin,
//             modelMatrix: (entity as Planet).getModelMatrix(),
//           },
//         }))
//       );
//       this.camera.setPosition(
//         this.collisionDetector.handleCameraCollisions({
//           position: this.camera.getPosition(),
//           radius: 1,
//         })
//       );
//     });
//     this.entityManager.update(time);
//   }

//   render(time: number) {
//     this.update(time);
//     this.canvas.resizeToDisplaySize();
//     this.orbitSystem.update(time * 100000);
//     this.gl.enable(this.gl.DEPTH_TEST);
//     this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
//     this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

//     const view = this.camera.getViewMatrix();
//     const proj = this.canvas.getProjectionMatrix();

//     this.orbitSystem.render(view, proj);

//     if (this.skySphere.isReady()) {
//       this.skySphere.render(view, proj);
//     }

//     this.entityManager.getEntities().forEach((entity) => {
//       if (!(entity instanceof Planet)) return;
//       entity.updateRotation(time);
//       const { modelMatrix } = entity.getBoundingInfo();
//       this.boundingBoxHelper.render(modelMatrix, view, proj);
//     });

//     this.entityManager.render(
//       view,
//       proj,
//       this.sun.getPosition(),
//       this.camera.getPosition()
//     );

//     if (this.sun.isReady()) {
//       this.sun.render(view, proj);
//     }

//     if (this.selected) {
//       console.log("POPUP UPDATED AND RENDERED");
//       this.popup.update(time);
//       this.popup.updatePopupPosition(
//         this.selected.getPosition(),
//         this.selected.getRadius()
//       );
//       this.popup.draw(proj, view, this.camera.getPosition());
//     }
//   }
// }

import { vec3 } from "gl-matrix";
import { Renderer } from "../engine/command/Renderer";
import { Registry } from "../engine/ecs/Registry";
import { EntitySelectionSystem } from "../engine/ecs/systems/EntitySelectionSystem";
import { ModelUpdateSystem } from "../engine/ecs/systems/ModelUpdateSystem";
import { OrbitSystem } from "../engine/ecs/systems/OrbitSystem";
import { PlanetRenderSystem } from "../engine/ecs/systems/PlanetRenderSystem";
import { SelectionGlowRenderSystem } from "../engine/ecs/systems/SelectionGlowRenderSystem";
import { SkyRenderSystem } from "../engine/ecs/systems/SkyRenderSystem";
import { SunRenderSystem } from "../engine/ecs/systems/SunRenderSystem";
import { TextureLoaderSystem } from "../engine/ecs/systems/TextureLoaderSystem";
import { PlanetFactory } from "../factory/PlanetFactory";
import { SkyFactory } from "../factory/SkyFactory";
import { SunFactory } from "../factory/SunFactory";
import { GLUtils } from "../utils/GLUtils";
import { Raycaster } from "../utils/Raycaster";
import { Camera } from "./Camera";
import { Canvas } from "./Canvas";
import { IO } from "./IO";
import { SelectionTagSystem } from "../engine/ecs/systems/SelectionTagSystem";
import { CCDSystem } from "../engine/ecs/systems/CCDSystem";
import { BBPlotRenderSystem } from "../engine/ecs/systems/BBPlotRenderSystem";
import { OrbitPathRenderSystem } from "../engine/ecs/systems/OrbitPathRenderSystem";
import { SETTINGS } from "../config/settings";

export class Scene {
  private readonly gl: WebGL2RenderingContext;
  private readonly utils: GLUtils;
  private readonly canvas: Canvas;
  private readonly camera: Camera;
  private readonly input: IO;

  private registry = new Registry();
  private textureSystem: TextureLoaderSystem;
  private renderer: Renderer;
  private skyRender: SkyRenderSystem;
  private skyFactory: SkyFactory;
  private sunRender: SunRenderSystem;
  private sunFactory: SunFactory;
  private planetRender: PlanetRenderSystem;
  private modelUpdate: ModelUpdateSystem;
  private planetFactory: PlanetFactory;
  private orbitSystem: OrbitSystem;
  private entitySelectionSystem: EntitySelectionSystem;
  private rayCaster: Raycaster;
  private selectionGlowRender: SelectionGlowRenderSystem;
  private selectionTagRender: SelectionTagSystem;
  private ccdSystem: CCDSystem;
  private bbpRenderSystem: BBPlotRenderSystem;
  private orbitTracer: OrbitPathRenderSystem;

  constructor(canvasId: string) {
    this.canvas = new Canvas(canvasId);
    this.camera = new Camera();
    this.input = new IO(this.canvas.canvas);

    this.gl = this.canvas.gl;
    this.utils = new GLUtils(this.gl);

    this.renderer = new Renderer();
    this.skyRender = new SkyRenderSystem(
      this.renderer,
      this.registry,
      this.utils
    );

    this.rayCaster = new Raycaster();
    this.entitySelectionSystem = new EntitySelectionSystem(
      this.rayCaster,
      this.camera,
      this.registry,
      this.utils
    );
    this.selectionGlowRender = new SelectionGlowRenderSystem(
      this.renderer,
      this.registry,
      this.utils
    );
    this.textureSystem = new TextureLoaderSystem(this.registry, this.utils);
    this.selectionTagRender = new SelectionTagSystem(
      this.renderer,
      this.registry,
      this.utils
    );
    this.ccdSystem = new CCDSystem(this.camera, this.registry, this.utils);

    this.skyFactory = new SkyFactory(this.utils, this.registry);
    this.sunRender = new SunRenderSystem(
      this.renderer,
      this.registry,
      this.utils
    );
    this.sunFactory = new SunFactory(this.utils, this.registry);
    this.planetFactory = new PlanetFactory(this.utils, this.registry);
    this.planetRender = new PlanetRenderSystem(
      this.renderer,
      this.registry,
      this.utils
    );
    this.modelUpdate = new ModelUpdateSystem(this.registry, this.utils);
    this.orbitSystem = new OrbitSystem(this.registry, this.utils);
    this.bbpRenderSystem = new BBPlotRenderSystem(
      this.renderer,
      this.registry,
      this.utils
    );
    this.orbitTracer = new OrbitPathRenderSystem(
      this.renderer,
      this.registry,
      this.utils
    );

    this.canvas.enablePointerLock((x, y) => {
      this.entitySelectionSystem.update(0);
    });
    this.canvas.onPointerLockChange((locked) => {
      if (!locked) {
        this.input.disableInputs();
        this.input.clear();
      } else {
        this.input.enableMouseInputs(
          (dragging, e) => {
            if (!dragging) this.camera.cameraMouseHandler(e);
          },
          (lagrangePoint: vec3) => {
            debugger;
            // When user scrolls wheel to cycle lagrange points:
            this.camera.startLookAtSunThenMove(lagrangePoint);

          }
        );
        this.input.enableKeyboardInputs();
      }
    });
  }

  initialize() {
    this.skyFactory.create("textures/milkyway.png");
    this.sunFactory.create("textures/lensFlare.png");

    this.planetFactory.create({
      name: "Earth",
      radius: 6371,
      tiltAngle: 23.44,
      siderealDay: 23.9,
      surfaceURL: "textures/8k_earth_daymap.jpg",
      normalURL: "textures/8k_earth_normal_map.png",
      specularURL: "textures/8k_earth_specular_map.png",
      atmosphereURL: "textures/8k_earth_clouds.jpg",
      nightURL: "textures/8k_earth_nightmap.jpg",
      orbitData: {
        semiMajorAxis: 149_600_000, // in km (1 AU)
        eccentricity: 0.01671022, // nearly circular
        inclination: 0.00005, // degrees, very close to 0
        longitudeOfAscendingNode: -11.26064, // Ω in degrees
        argumentOfPeriapsis: 114.20783, // ω in degrees
        meanAnomalyAtEpoch: 358.617, // degrees (at J2000)
        orbitalPeriod: 365.256, // days (sidereal year)
      },
    });

    this.planetFactory.create({
      name: "Jupiter",
      radius: 69911, // radius in km
      tiltAngle: 3.13, // axial tilt in degrees
      surfaceURL: "textures/4k_jupiter.jpg", // surface texture
      siderealDay: 9.9,
      orbitData: {
        semiMajorAxis: 778_340_821, // in km (~5.2 AU)
        eccentricity: 0.0489,
        inclination: 1.305, // degrees
        longitudeOfAscendingNode: 100.492,
        argumentOfPeriapsis: 273.867,
        meanAnomalyAtEpoch: 19.65, // degrees at J2000
        orbitalPeriod: 4332.59, // in days (~11.86 Earth years)
      },
    });

    this.planetFactory.create({
      name: "Mercury",
      radius: 2439.7,
      tiltAngle: 0.034,
      siderealDay: 1407.6,
      surfaceURL: "textures/2k_mercury.jpg",
      orbitData: {
        semiMajorAxis: 57_909_227,
        eccentricity: 0.2056,
        inclination: 7.005,
        longitudeOfAscendingNode: 48.331,
        argumentOfPeriapsis: 29.124,
        meanAnomalyAtEpoch: 174.796,
        orbitalPeriod: 87.969,
      },
    });

    this.planetFactory.create({
      name: "Venus",
      radius: 6051.8,
      tiltAngle: 177.36, // retrograde rotation
      siderealDay: 5832.5,
      surfaceURL: "textures/2k_venus.jpg",
      // atmosphereURL: "textures/4k_venus_atmosphere.jpg",
      orbitData: {
        semiMajorAxis: 108_209_475,
        eccentricity: 0.0067,
        inclination: 3.394,
        longitudeOfAscendingNode: 76.68,
        argumentOfPeriapsis: 54.884,
        meanAnomalyAtEpoch: 50.115,
        orbitalPeriod: 224.701,
      },
    });

    this.planetFactory.create({
      name: "Mars",
      radius: 3389.5, // radius in km
      tiltAngle: 25.19, // axial tilt in degrees
      siderealDay: 24.6,
      surfaceURL: "textures/2k_mars_surface.jpg",
      normalURL: "textures/2k_mars_normal.png",
      orbitData: {
        semiMajorAxis: 227_939_200, // in km (~1.52 AU)
        eccentricity: 0.0935,
        inclination: 1.85,
        longitudeOfAscendingNode: 49.558,
        argumentOfPeriapsis: 286.502,
        meanAnomalyAtEpoch: 19.412, // degrees at J2000
        orbitalPeriod: 686.971, // in days (~1.88 Earth years)
      },
    });

    this.planetFactory.create({
      name: "Saturn",
      radius: 58232,
      tiltAngle: 26.73,
      siderealDay: 10.7,
      surfaceURL: "textures/2k_saturn.jpg",
      orbitData: {
        semiMajorAxis: 1_433_449_370,
        eccentricity: 0.0565,
        inclination: 2.485,
        longitudeOfAscendingNode: 113.665,
        argumentOfPeriapsis: 339.392,
        meanAnomalyAtEpoch: 317.021,
        orbitalPeriod: 10_759.22,
      },
    });

    this.planetFactory.create({
      name: "Uranus",
      radius: 25362,
      tiltAngle: 7.77, // Tilt ~98°, use low value + flipped axis
      axis: [0, -1, 0], // Retrograde
      siderealDay: 17.24,
      surfaceURL: "textures/2k_uranus.jpg",
      orbitData: {
        semiMajorAxis: 2_872_466_000,
        eccentricity: 0.0457,
        inclination: 0.769,
        longitudeOfAscendingNode: 74.006,
        argumentOfPeriapsis: 96.998,
        meanAnomalyAtEpoch: 142.239,
        orbitalPeriod: 30_688.5,
      },
    });
    // Load other planets similarly...
    this.textureSystem.update(0);
  }

  update(deltaTime: number) {
    this.camera.cameraKeyboardHandler(this.input.getKeys());
    const viewMatrix = this.camera.getViewMatrix();
    const projectionMatrix = this.canvas.getProjectionMatrix();
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.skyRender.update(deltaTime);

    this.planetRender.update(deltaTime);
    this.modelUpdate.update(deltaTime);
    this.orbitSystem.update(deltaTime);
    this.orbitTracer.update(deltaTime);

    this.ccdSystem.update(deltaTime);
    this.bbpRenderSystem.update(deltaTime);
    this.selectionGlowRender.update(deltaTime);
    this.selectionTagRender.update(deltaTime);

    this.sunRender.update(deltaTime);

    this.camera.update(deltaTime/1000);
    this.renderer.flush(this.gl, {
      viewMatrix,
      projectionMatrix,
      lightPos: vec3.fromValues(0, 0, 0),
      cameraPos: this.camera.getPosition(),
      canvasHeight: this.canvas.canvas.height,
      canvasWidth: this.canvas.canvas.width,
    }); // flush all queued RenderCommands
  }
}
