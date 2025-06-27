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


import { mat4, vec3 } from "gl-matrix";
import { Registry } from "../engine/ecs/Registry";
import { PlanetRenderSystem } from "../engine/ecs/systems/PlanetRenderSystem";
import { TextureLoadSystem } from "../engine/ecs/systems/TextureLoadSystem";
import { RenderContext } from "../engine/renderer/IRenderCommands";
import { Renderer } from "../engine/renderer/Renderer";
import { GLUtils } from "../engine/utils/GLUtils";
import { PlanetFactory } from "../factory/PlanetFactory";
import { OrbitSystem } from "../systems/OrbitManager";
import { Canvas } from "./Canvas";
import { Camera } from "./Camera";

export class Scene {
  readonly gl: WebGL2RenderingContext;
  readonly utils: GLUtils;
  readonly canvas: Canvas
  readonly camera: Camera;
  private registry = new Registry();
  private orbitSystem: OrbitSystem;
  private renderSystem: PlanetRenderSystem;
  private textureSystem: TextureLoadSystem;
  private renderer: Renderer;
  private planetFactory: PlanetFactory;

  constructor(canvasId: string) {
    this.canvas = new Canvas(canvasId);
    this.gl = this.canvas.gl;
    this.utils = new GLUtils(this.gl);

    this.camera = new Camera();
    this.renderer = new Renderer();
    this.orbitSystem = new OrbitSystem(this.gl, this.utils);
    this.renderSystem = new PlanetRenderSystem(this.renderer, this.utils, this.registry);
    this.textureSystem = new TextureLoadSystem(this.registry, this.utils);
    this.planetFactory = new PlanetFactory(this.gl, this.utils, this.registry);
  }

  initialize() {
    // const sun = this.planetFactory.createPlanet({
    //   name: "Sun",
    //   position: vec3.fromValues(0, 0, 0),
    //   scale: vec3.fromValues(2, 2, 2),
    //   surfaceURL: "textures/sun.jpg",
    // });

    this.planetFactory.createPlanet({
      name: "Earth",
      position: vec3.fromValues(0, 0, -10),
      scale: vec3.fromValues(2, 2, 2),
      surfaceURL: "textures/4k_earth_surface.jpg",
      normalURL: "textures/4k_earth_normal.jpg",
      atmosphereURL: "4k_earth_atmosphere.png",
      specularURL: "textures/earth_spec.jpg",
      orbitData: {
        semiMajorAxis: 8,
        eccentricity: 0.0167,
        inclination: 0,
        orbitalPeriod: 365,
        meanAnomalyAtEpoch: 0,
      },
    });

    // Load other planets similarly...
  }

  update(deltaTime: number) {
    this.textureSystem.update(deltaTime);
    this.orbitSystem.update(deltaTime);

    const context: RenderContext = {
      viewMatrix: this.camera.getViewMatrix(),
      projectionMatrix: this.canvas.getProjectionMatrix(),
      lightPos: vec3.fromValues(0,0,0),
      cameraPos: this.camera.getPosition(),
    };
    this.renderSystem.update(deltaTime);
    this.renderer.flush(this.gl, context); // flush all queued RenderCommands
  }
}
