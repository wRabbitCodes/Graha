import { vec3 } from "gl-matrix";
import { Renderer } from "../engine/command/Renderer";
import { Registry } from "../engine/ecs/Registry";
import { EntitySelectionSystem } from "../engine/ecs/systems/EntitySelectionSystem";
import { ModelUpdateSystem } from "../engine/ecs/systems/ModelUpdateSystem";
import { OrbitSystem } from "../engine/ecs/systems/OrbitSystem";
import { PlanetRenderSystem } from "../engine/ecs/systems/PlanetRenderSystem";
import { SelectionGlowRenderSystem } from "../engine/ecs/systems/SelectionGlowRenderSystem";
import { SkyRenderSystem } from "../engine/ecs/systems/SkyRenderSystem";
// import { TextureLoaderSystem } from "../engine/ecs/systems/TextureLoaderSystem";
import { EntityFactory } from "../factory/EntityFactory";
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
import { CameraLatchSystem } from "../engine/ecs/systems/CameraLatchSystem";
import { ENTITY_TYPE } from "../engine/ecs/components/ModelComponent";
import { FrustumCullingSystem } from "../engine/ecs/systems/FrustumCuller";
import { FONTS, TEXTURES } from "../data/assetsData";
import { SunRenderSystem } from "../engine/ecs/systems/SunRenderSystem";
import { AssetsLoader } from "./AssetsLoader";


export class Scene {
  private readonly gl: WebGL2RenderingContext;
  private readonly utils: GLUtils;
  private readonly canvas: Canvas;
  private readonly camera: Camera;
  private readonly input: IO;
  private readonly assetsLoader: AssetsLoader;

  private registry = new Registry();
  private renderer: Renderer;
  private skyRender: SkyRenderSystem;
  private skyFactory: SkyFactory;
  private sunRender: SunRenderSystem;
  private sunFactory: SunFactory;
  private planetRender: PlanetRenderSystem;
  private modelUpdate: ModelUpdateSystem;
  private planetFactory: EntityFactory;
  private orbitSystem: OrbitSystem;
  private entitySelectionSystem: EntitySelectionSystem;
  private rayCaster: Raycaster;
  private selectionGlowRender: SelectionGlowRenderSystem;
  private selectionTagRender: SelectionTagSystem;
  private cameraLatchSystem: CameraLatchSystem;
  private ccdSystem: CCDSystem;
  private bbpRenderSystem: BBPlotRenderSystem;
  private orbitTracer: OrbitPathRenderSystem;
  private frustumCuller: FrustumCullingSystem;

  constructor(canvasId: string) {
    this.canvas = new Canvas(canvasId);
    this.camera = new Camera();
    this.input = new IO(this.canvas.canvas);

    this.gl = this.canvas.gl;
    this.utils = new GLUtils(this.gl);

    this.assetsLoader = new AssetsLoader(this.utils);
    this.renderer = new Renderer();
    this.skyRender = new SkyRenderSystem(
      this.renderer,
      this.assetsLoader,
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
    this.selectionTagRender = new SelectionTagSystem(
      this.renderer,
      this.registry,
      this.utils
    );
    this.ccdSystem = new CCDSystem(this.camera, this.registry, this.utils);

    this.skyFactory = new SkyFactory(this.utils, this.registry);
    this.sunRender = new SunRenderSystem(
      this.renderer,
      this.assetsLoader,
      this.registry,
      this.utils
    );
    this.sunFactory = new SunFactory(this.utils, this.registry);
    this.planetFactory = new EntityFactory(this.utils, this.registry);
    this.planetRender = new PlanetRenderSystem(
      this.renderer,
      this.assetsLoader,
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

    this.frustumCuller = new FrustumCullingSystem(this.camera, this.canvas, this.registry, this.utils);
    this.cameraLatchSystem = new CameraLatchSystem(this.camera, this.registry, this.utils);
    this.canvas.enablePointerLock((x, y) => {
      this.entitySelectionSystem.update(0);
    });
    this.canvas.onPointerLockChange((locked) => {
      if (!locked) {
        this.input.disableInputs();
        this.input.clear();
      } else {
        this.input.enableMouseInputs(
          (e) => this.camera.freeLookMouseHandler(e),
          (e)=>this.camera.latchedWheelMouseHandler(e),
          (e) => this.camera.latchedLookMouseHandler(e),
        );
        this.input.enableKeyboardInputs();
      }
    });
  }
  async load(): Promise<void> {
    await this.assetsLoader.loadAll({
      textures: TEXTURES,
      fonts: FONTS,
      models: {}, // in future
    });
  }
  initialize() {
    
    this.skyFactory.create();
    this.sunFactory.create();

    const earth = this.planetFactory.create({
      type: ENTITY_TYPE.PLANET,
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
    // this.planetFactory.create({
    //   name: "Jupiter",
    //   radius: 69911, // radius in km
    //   tiltAngle: 3.13, // axial tilt in degrees
    //   surfaceURL: "textures/4k_jupiter.jpg", // surface texture
    //   siderealDay: 9.9,
    //   orbitData: {
    //     semiMajorAxis: 778_340_821, // in km (~5.2 AU)
    //     eccentricity: 0.0489,
    //     inclination: 1.305, // degrees
    //     longitudeOfAscendingNode: 100.492,
    //     argumentOfPeriapsis: 273.867,
    //     meanAnomalyAtEpoch: 19.65, // degrees at J2000
    //     orbitalPeriod: 4332.59, // in days (~11.86 Earth years)
    //   },
    // });
    this.planetFactory.create({
      type: ENTITY_TYPE.MOON,
      parent: earth,
      name: "Moon",
      radius: 1737.4,
      tiltAngle: 6.68,
      siderealDay: 27.3,
      surfaceURL: "textures/4k_moon_surface.jpg",
      normalURL: "textures/4k_moon_normal.jpg",
      orbitData: {
        semiMajorAxis : 384_400 * SETTINGS.GLOBAL_SCENE_SCALE/8,
        eccentricity : 0.0549,
        inclination : 5.145,
        argumentOfPeriapsis : 318.15,
        longitudeOfAscendingNode : 125.08,
        orbitalPeriod : 27.3217,
      }
    });

    this.planetFactory.create({
      type: ENTITY_TYPE.PLANET,
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

    // this.planetFactory.create({
    //   name: "Venus",
    //   radius: 6051.8,
    //   tiltAngle: 177.36, // retrograde rotation
    //   siderealDay: 5832.5,
    //   surfaceURL: "textures/2k_venus.jpg",
    //   // atmosphereURL: "textures/4k_venus_atmosphere.jpg",
    //   orbitData: {
    //     semiMajorAxis: 108_209_475,
    //     eccentricity: 0.0067,
    //     inclination: 3.394,
    //     longitudeOfAscendingNode: 76.68,
    //     argumentOfPeriapsis: 54.884,
    //     meanAnomalyAtEpoch: 50.115,
    //     orbitalPeriod: 224.701,
    //   },
    // });
    this.planetFactory.create({
      type: ENTITY_TYPE.PLANET,
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
      type: ENTITY_TYPE.PLANET,
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

    // this.planetFactory.create({
    //   name: "Saturn",
    //   radius: 58232,
    //   tiltAngle: 26.73,
    //   siderealDay: 10.7,
    //   surfaceURL: "textures/2k_saturn.jpg",
    //   orbitData: {
    //     semiMajorAxis: 1_433_449_370,
    //     eccentricity: 0.0565,
    //     inclination: 2.485,
    //     longitudeOfAscendingNode: 113.665,
    //     argumentOfPeriapsis: 339.392,
    //     meanAnomalyAtEpoch: 317.021,
    //     orbitalPeriod: 10_759.22,
    //   },
    // });

    // this.planetFactory.create({
    //   name: "Uranus",
    //   radius: 25362,
    //   tiltAngle: 7.77, // Tilt ~98°, use low value + flipped axis
    //   axis: [0, -1, 0], // Retrograde
    //   siderealDay: 17.24,
    //   surfaceURL: "textures/2k_uranus.jpg",
    //   orbitData: {
    //     semiMajorAxis: 2_872_466_000,
    //     eccentricity: 0.0457,
    //     inclination: 0.769,
    //     longitudeOfAscendingNode: 74.006,
    //     argumentOfPeriapsis: 96.998,
    //     meanAnomalyAtEpoch: 142.239,
    //     orbitalPeriod: 30_688.5,
    //   },
    // });
    this.planetFactory.create({
      type: ENTITY_TYPE.PLANET,
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
      type: ENTITY_TYPE.PLANET,
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
      type: ENTITY_TYPE.PLANET,
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
  }

  update(deltaTime: number) {
    if (this.assetsLoader.getProgress() < 1) return;
    this.camera.cameraKeyboardHandler(this.input.getKeys());
    const viewMatrix = this.camera.getViewMatrix();
    const projectionMatrix = this.canvas.getProjectionMatrix();
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.skyRender.update(deltaTime);

    this.modelUpdate.update(deltaTime);
    this.orbitSystem.update(deltaTime);

    this.ccdSystem.update(deltaTime);
    this.camera.update(deltaTime/1000);
    this.cameraLatchSystem.update(deltaTime);
    this.frustumCuller.update(deltaTime);

    this.planetRender.update(deltaTime);
    this.orbitTracer.update(deltaTime);
    this.bbpRenderSystem.update(deltaTime);
    this.selectionGlowRender.update(deltaTime);
    this.selectionTagRender.update(deltaTime);


    this.sunRender.update(deltaTime);

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
