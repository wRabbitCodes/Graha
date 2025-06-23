// import { Planet } from "../models/Planet";
// import { Skybox } from "../models/Skybox";
// import { GLUtils } from "../core/GLUtils";
// import { Canvas } from "../core/Canvas";
// import { Camera } from "../core/Camera";
// import { Raycaster } from "./Raycaster";
// import { vec3, mat4, vec4 } from "gl-matrix";

// export class Scene {
//   public readonly gl: WebGL2RenderingContext;
//   public readonly utils: GLUtils;
//   public readonly canvas: HTMLCanvasElement;
//   public readonly camera: Camera;

//   public planets: Planet[] = [];
//   public skybox: Skybox;

//   private projectionMatrix: mat4 = mat4.create();
//   private canvasWrapper: Canvas;
//   private raycaster: Raycaster;
//   private selectedPlanet: Planet | null = null;


//   constructor(canvasId: string) {
//     this.canvasWrapper = new Canvas(canvasId);
//     this.canvas = this.canvasWrapper.getElement();
//     this.gl = this.canvasWrapper.getContext();
//     this.utils = new GLUtils(this.gl);
//     this.camera = new Camera();
//     this.skybox = new Skybox(this.gl, this.utils);
//     this.raycaster = new Raycaster();

//     this.canvasWrapper.setUpCanvasEvents();
//     this.canvasWrapper.onMouseMove((dx, dy) => this.camera.rotateView(dx, dy));

//   }

//   addPlanet(planet: Planet) {
//     this.planets.push(planet);
//   }

//   resize() {
//     this.canvasWrapper.resize();
//     const aspect = this.canvasWrapper.getAspectRatio();
//     mat4.perspective(this.projectionMatrix, Math.PI / 3, aspect, 0.1, 100);
//   }

//   render() {
//     this.resize();
//     this.camera.update(this.canvasWrapper.getKeyState());
//     this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
//     this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
//     this.gl.enable(this.gl.DEPTH_TEST);

//     if (this.skybox.isReady()) {
//       this.skybox.render(this.camera.getViewMatrix(), this.projectionMatrix);
//     }

//     for (const planet of this.planets) {
//       planet.updateRotation(16);
//       planet.render(
//         this.camera.getViewMatrix(),
//         this.projectionMatrix,
//         vec3.fromValues(15, 15, 15),
//         this.camera.getPosition()
//       );
//     }
//   }

//   getCamera(): Camera {
//     return this.camera;
//   }
// }
import { Input } from "./IO";
import { Canvas } from "../core/Canvas";
import { GLUtils } from "../core/GLUtils";
import { Camera } from "../core/Camera";
import { EntityManager } from "./EntityManager";
import { vec3 } from "gl-matrix";
import { Skybox } from "../models/Skybox";

export class Scene {
  public readonly gl: WebGL2RenderingContext;
  public readonly utils: GLUtils;
  public readonly canvas: Canvas;
  public readonly camera: Camera;
  public readonly skybox: Skybox;
  public readonly input: Input;
  public readonly em: EntityManager;

  constructor(canvasId: string) {
    this.canvas = new Canvas(canvasId);
    this.gl = this.canvas.gl;

    this.utils = new GLUtils(this.gl);
    this.input = new Input(this.canvas.canvas);
    this.camera = new Camera();
    this.em = new EntityManager();
    this.skybox = new Skybox(this.gl,this.utils);


    this.canvas.onPointerLockChange((locked) => {
      if (!locked) {
        this.input.clear();
        this.input.disableInputs();
      } else {
        this.input.enableMouseInputs( _=>null, (e) => this.camera.cameraMouseHandler(e))
        this.input.enableKeyboardInputs();
      }
    });
  }

  private update() {
    this.canvas.resizeToDisplaySize();
    this.camera.cameraKeyboardHandler(this.input.getKeys());
  }

  render() {
    this.update();
    const view = this.camera.getViewMatrix();
    const proj = this.canvas.getProjectionMatrix();
    this.skybox.render(view, proj);
    // this.em.render(view, proj, vec3.fromValues(15,15,15), this.camera.getPosition());
  }
}