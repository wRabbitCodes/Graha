import { vec3 } from "gl-matrix";
import { Renderer } from "../engine/command/Renderer";
import { Registry } from "../engine/ecs/Registry";
import { SystemManager } from "../engine/ecs/System";
import { AsteroidModelRenderSystem } from "../engine/ecs/systems/AsteroidModelRenderSystem";
import { AsteroidModelSystem } from "../engine/ecs/systems/AsteroidModelSystem";
import { AsteroidPointCloudRenderSystem } from "../engine/ecs/systems/AsteroidPointCloudRenderSystem";
import { AsteroidPointCloudSystem } from "../engine/ecs/systems/AsteroidPointCloudSystem";
import { BBPlotRenderSystem } from "../engine/ecs/systems/BBPlotRenderSystem";
import { CameraLatchSystem } from "../engine/ecs/systems/CameraLatchSystem";
import { CCDSystem } from "../engine/ecs/systems/CCDSystem";
import { EntitySelectionSystem } from "../engine/ecs/systems/EntitySelectionSystem";
import { FrustumCullingSystem } from "../engine/ecs/systems/FrustumCuller";
import { HTMLTagSystem } from "../engine/ecs/systems/HTMLTagSystem";
import { ModelUpdateSystem } from "../engine/ecs/systems/ModelUpdateSystem";
import { OrbitPathRenderSystem } from "../engine/ecs/systems/OrbitPathRenderSystem";
import { OrbitSystem } from "../engine/ecs/systems/OrbitSystem";
import { PlanetRenderSystem } from "../engine/ecs/systems/PlanetRenderSystem";
import { SelectionGlowRenderSystem } from "../engine/ecs/systems/SelectionGlowRenderSystem";
import { SelectionTagSystem } from "../engine/ecs/systems/SelectionTagSystem";
import { SkyRenderSystem } from "../engine/ecs/systems/SkyRenderSystem";
import { SunRenderSystem } from "../engine/ecs/systems/SunRenderSystem";
import { AsteroidFactory } from "../factory/AsteroidFactory";
import { PlanetaryFactory } from "../factory/PlanetaryFactory";
import { SkyFactory } from "../factory/SkyFactory";
import { SunFactory } from "../factory/SunFactory";
import { GLUtils } from "../utils/GLUtils";
import { Raycaster } from "../utils/Raycaster";
import { AssetsLoader } from "./AssetsLoader";
import { Camera } from "./Camera";
import { Canvas } from "./Canvas";
import { IO } from "./IO";

export interface SettingsState {
  globalSceneScale: number;
  cameraSpeed: number;
  mouseSensitivity: number;
  boundingBox: boolean;
  highlightOrbit: boolean;
  latchedEntityID?: number;
  entityMap?: Map<number, string>;
  enableAsteroidDustCloud: boolean;
  enableAsteroidModels: boolean;
  showEntityLabel: boolean;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export class Scene {
  readonly canvas: Canvas;
  readonly gl: WebGL2RenderingContext;
  readonly utils: GLUtils;
  readonly camera: Camera;
  readonly input: IO;
  readonly assetsLoader: AssetsLoader;
  readonly renderer: Renderer;
  readonly registry: Registry;
  readonly systemManager: SystemManager;
  readonly rayCaster: Raycaster;

  private sunFactory: SunFactory;
  private skyFactory: SkyFactory;
  private planetaryFactory: PlanetaryFactory;
  private asteroidFactory: AsteroidFactory;

  private settings!: SettingsState;
  private paused = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = new Canvas(canvas);
    this.gl = this.canvas.gl;
    this.utils = new GLUtils(this.gl);
    this.camera = new Camera();
    this.input = new IO(this.canvas.canvas);
    this.assetsLoader = new AssetsLoader(this.utils);
    this.renderer = new Renderer(this.gl);
    this.registry = new Registry();
    this.systemManager = new SystemManager();
    this.rayCaster = new Raycaster();

    this.sunFactory = new SunFactory(this.registry);
    this.skyFactory = new SkyFactory(this.registry);
    this.planetaryFactory = new PlanetaryFactory(this.registry);
    this.asteroidFactory = new AsteroidFactory(this.registry);


    this.setupSystems();
    this.setupInput();
  }

  initialize() {
    this.skyFactory.create();
    this.sunFactory.create();
    this.planetaryFactory.reinitializeEntities(this.assetsLoader.getJSON("planetaryData")!);
    this.asteroidFactory.create();
  }

  private setupSystems() {
    this.systemManager.registerSystem(new SkyRenderSystem(this.renderer, this.assetsLoader, this.registry, this.utils));
    this.systemManager.registerSystem(new PlanetRenderSystem(this.renderer, this.assetsLoader, this.registry, this.utils));
    this.systemManager.registerSystem(new ModelUpdateSystem(this.camera, this.registry, this.utils));
    this.systemManager.registerSystem(new OrbitSystem(this.registry, this.utils));
    this.systemManager.registerSystem(new SelectionGlowRenderSystem(this.renderer, this.registry, this.utils));
    this.systemManager.registerSystem(new CCDSystem(this.camera, this.registry, this.utils));
    // this.systemManager.registerSystem(new FrustumCullingSystem(this.camera, this.canvas, this.registry, this.utils));
    this.systemManager.registerSystem(new SunRenderSystem(this.renderer, this.assetsLoader, this.registry, this.utils));
    this.systemManager.registerSystem(new HTMLTagSystem(this.renderer, this.registry, this.utils), undefined, false);
    this.systemManager.registerSystem(new CameraLatchSystem(this.camera, this.registry, this.utils), undefined, false);
    this.systemManager.registerSystem(new EntitySelectionSystem(this.rayCaster, this.camera, this.registry, this.utils), undefined, false);
    // Conditional systems
    this.systemManager.registerSystem(
      new AsteroidPointCloudSystem(this.registry, this.utils),
      (s) => s.enableAsteroidDustCloud
    );
    this.systemManager.registerSystem(
      new AsteroidPointCloudRenderSystem(this.renderer, this.registry, this.utils),
      (s) => s.enableAsteroidDustCloud
    );
    this.systemManager.registerSystem(
      new AsteroidModelSystem(this.registry, this.utils),
      (s) => s.enableAsteroidModels
    );
    this.systemManager.registerSystem(
      new AsteroidModelRenderSystem(this.assetsLoader, this.renderer, this.registry, this.utils),
      (s) => s.enableAsteroidModels
    );
    this.systemManager.registerSystem(
      new OrbitPathRenderSystem(this.renderer, this.registry, this.utils),
      (s) => s.highlightOrbit
    );
    this.systemManager.registerSystem(
      new SelectionTagSystem(this.renderer, this.registry, this.utils),
      (s) => !s.showEntityLabel
    );
    this.systemManager.registerSystem(
      new BBPlotRenderSystem(this.renderer, this.registry, this.utils),
      (s) => s.boundingBox
    );
  }

  private setupInput() {
    this.canvas.enableResizeHandler(()=>{
      this.canvas.resizeToDisplaySize();
      this.renderer.resize(this.canvas.canvas.width, this.canvas.canvas.height);
    })
    this.canvas.enablePointerLock(() => (this.systemManager.getUnmanagedSystem(EntitySelectionSystem) as EntitySelectionSystem)?.update(0));
    this.canvas.onPointerLockChange((locked) => {
      if (!locked) {
        this.input.disableInputs();
        this.input.clear();
      } else {
        this.input.enableMouseInputs(
          (e) => this.camera.state.handleNormalMouseMove!(this.camera, e),
          (e) => this.camera.state.handleMouseWheel!(this.camera, e),
          (e) => this.camera.state.handleClickAndDrag!(this.camera, e)
        );
        this.input.enableKeyboardInputs();
      }
    });
  }

  getNamedEntities() {
    return this.registry.getEntityIDToNameMap();
  }

  updateSettings(settings: SettingsState) {
    this.settings = { ...settings };
  }

  update(deltaTime: number) {
    if (this.assetsLoader.getProgress() < 1) {
      // console.log("Loading assets...", this.assetsLoader.getProgress());
      return;
    }

    this.camera.state.handleKeyboard(this.camera, this.input.getKeys());
    this.camera.update(deltaTime / 1000);
    
    this.systemManager.update(deltaTime, this.settings);
    const cameraLatchSystem = this.systemManager.getUnmanagedSystem(CameraLatchSystem)! as CameraLatchSystem;
    if (this.settings.latchedEntityID) {
      cameraLatchSystem.setLatchEntity(this.registry.getEntityByID(this.settings.latchedEntityID)!);
      cameraLatchSystem.update(deltaTime);
    } else {
      cameraLatchSystem.clearLatch();
    }

  
    

    const viewMatrix = this.camera.viewMatrix;
    const projectionMatrix = this.canvas.getProjectionMatrix();
    this.renderer.setRenderContext({
      viewMatrix,
      projectionMatrix,
      lightPos: vec3.fromValues(0, 0, 0),
      cameraPos: this.camera.position,
      canvasHeight: this.canvas.canvas.height,
      canvasWidth: this.canvas.canvas.width,
      deltaTime,
    });
    this.renderer.flush();
    if (this.settings.showEntityLabel)
    {
      const htmlTagSystem = this.systemManager.getUnmanagedSystem(HTMLTagSystem) as HTMLTagSystem;
      htmlTagSystem?.enableTags();
      htmlTagSystem?.update(deltaTime);
    } else {
      (this.systemManager.getUnmanagedSystem(HTMLTagSystem) as HTMLTagSystem)?.disableTags();
    }

  }
}