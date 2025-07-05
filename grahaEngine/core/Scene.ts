import { vec3 } from "gl-matrix";
import { Renderer } from "../engine/command/Renderer";
import { Registry } from "../engine/ecs/Registry";
import { EntitySelectionSystem } from "../engine/ecs/systems/EntitySelectionSystem";
import { ModelUpdateSystem } from "../engine/ecs/systems/ModelUpdateSystem";
import { OrbitSystem } from "../engine/ecs/systems/OrbitSystem";
import { PlanetRenderSystem } from "../engine/ecs/systems/PlanetRenderSystem";
import { SelectionGlowRenderSystem } from "../engine/ecs/systems/SelectionGlowRenderSystem";
import { SkyRenderSystem } from "../engine/ecs/systems/SkyRenderSystem";
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
import { SunRenderSystem } from "../engine/ecs/systems/SunRenderSystem";
import { AssetsLoader } from "./AssetsLoader";

export class Scene {
  setSimulationParams(params: { speed: number; paused: boolean }) {
    this.simSpeed = params.speed;
    this.paused = params.paused;
  }
  private readonly gl: WebGL2RenderingContext;
  private readonly utils: GLUtils;
  private readonly canvas: Canvas;
  private readonly camera: Camera;
  private readonly input: IO;
  readonly assetsLoader: AssetsLoader;
  private simSpeed!: number;
  private paused!: boolean;

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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = new Canvas(canvas);
    this.camera = new Camera();
    this.input = new IO(this.canvas.canvas);
    this.gl = this.canvas.gl;
    this.utils = new GLUtils(this.gl);
    this.assetsLoader = new AssetsLoader(this.utils);
    this.renderer = new Renderer();

    this.skyRender = new SkyRenderSystem(this.renderer, this.assetsLoader, this.registry, this.utils);
    this.sunRender = new SunRenderSystem(this.renderer, this.assetsLoader, this.registry, this.utils);
    this.planetRender = new PlanetRenderSystem(this.renderer, this.assetsLoader, this.registry, this.utils);

    this.modelUpdate = new ModelUpdateSystem(this.registry, this.utils);
    this.orbitSystem = new OrbitSystem(this.registry, this.utils);
    this.bbpRenderSystem = new BBPlotRenderSystem(this.renderer, this.registry, this.utils);
    this.orbitTracer = new OrbitPathRenderSystem(this.renderer, this.registry, this.utils);
    this.frustumCuller = new FrustumCullingSystem(this.camera, this.canvas, this.registry, this.utils);
    this.cameraLatchSystem = new CameraLatchSystem(this.camera, this.registry, this.utils);

    this.skyFactory = new SkyFactory(this.utils, this.registry);
    this.sunFactory = new SunFactory(this.utils, this.registry);
    this.planetFactory = new EntityFactory(this.utils, this.registry);

    this.rayCaster = new Raycaster();
    this.entitySelectionSystem = new EntitySelectionSystem(this.rayCaster, this.camera, this.registry, this.utils);
    this.selectionGlowRender = new SelectionGlowRenderSystem(this.renderer, this.registry, this.utils);
    this.selectionTagRender = new SelectionTagSystem(this.renderer, this.registry, this.utils);
    this.ccdSystem = new CCDSystem(this.camera, this.registry, this.utils);
  }

  initialize() {
    if (this.registry.getAllEntities().length > 0) return; // Prevent re-init
    this.skyFactory.create();
    this.sunFactory.create();
    this.createPlanets();

    this.canvas.enablePointerLock(() => this.entitySelectionSystem.update(0));
    this.canvas.onPointerLockChange((locked) => {
      if (!locked) {
        this.input.disableInputs();
        this.input.clear();
      } else {
        this.input.enableMouseInputs(
          (e) => this.camera.freeLookMouseHandler(e),
          (e) => this.camera.latchedWheelMouseHandler(e),
          (e) => this.camera.latchedLookMouseHandler(e)
        );
        this.input.enableKeyboardInputs();
      }
    });
  }

  private createPlanets() {
    const scale = SETTINGS.DISTANCE_SCALE;
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
        semiMajorAxis: 149_600_000 * scale,
        eccentricity: 0.0167,
        inclination: 0.00005,
        longitudeOfAscendingNode: -11.26,
        argumentOfPeriapsis: 114.2,
        meanAnomalyAtEpoch: 358.6,
        orbitalPeriod: 365.25,
      },
    });

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
        semiMajorAxis: 384_400 * scale / 8,
        eccentricity: 0.0549,
        inclination: 5.145,
        argumentOfPeriapsis: 318.15,
        longitudeOfAscendingNode: 125.08,
        orbitalPeriod: 27.3217,
      },
    });

    this.planetFactory.create({
      type: ENTITY_TYPE.PLANET,
      name: "Mars",
      radius: 3389.5,
      tiltAngle: 25.19,
      siderealDay: 24.6,
      surfaceURL: "textures/2k_mars_surface.jpg",
      normalURL: "textures/2k_mars_normal.png",
      orbitData: {
        semiMajorAxis: 227_939_200 * scale,
        eccentricity: 0.0935,
        inclination: 1.85,
        longitudeOfAscendingNode: 49.558,
        argumentOfPeriapsis: 286.502,
        meanAnomalyAtEpoch: 19.412,
        orbitalPeriod: 686.971,
      },
    });
  }

  update(deltaTime: number) {
    const progress = this.assetsLoader.getProgress();
    if (progress < 1) {
      console.log("Loading assets...", progress);
      return;
    }

    this.camera.cameraKeyboardHandler(this.input.getKeys());
    const viewMatrix = this.camera.getViewMatrix();
    const projectionMatrix = this.canvas.getProjectionMatrix();

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.skyRender.update(deltaTime);
    this.modelUpdate.update(deltaTime);
    this.orbitSystem.update(deltaTime);
    this.ccdSystem.update(deltaTime);
    this.camera.update(deltaTime / 1000);
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
    });
  }
}
