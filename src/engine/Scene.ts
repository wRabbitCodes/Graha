import { IO } from "./IO";
import { Canvas } from "../core/Canvas";
import { GLUtils } from "../core/GLUtils";
import { Camera } from "../core/Camera";
import { EntityManager } from "./EntityManager";
import { vec3 } from "gl-matrix";
import { SkySphere } from "../models/SkySphere";
import { Sun } from "../models/Sun";
import { AxisHelper } from "../models/AxisHelper";
import { OrbitSystem } from "../systems/OrbitSystems";
import { Raycaster } from "./Raycaster";
import { Planet } from "../models/Planet";

export class Scene {
  public readonly gl: WebGL2RenderingContext;
  public readonly utils: GLUtils;
  public readonly canvas: Canvas;
  public readonly camera: Camera;
  // public readonly skybox: Skybox;
  public readonly sun: Sun;
  public readonly skySphere: SkySphere;
  public readonly input: IO;
  public readonly entityManager: EntityManager;
  public readonly orbitSystem: OrbitSystem;
  public readonly raycaster: Raycaster;
  public readonly axisHelper: AxisHelper;

  constructor(canvasId: string) {
    this.canvas = new Canvas(canvasId);
    this.gl = this.canvas.gl;

    this.utils = new GLUtils(this.gl);
    this.input = new IO(this.canvas.canvas);
    this.camera = new Camera();
    this.axisHelper = new AxisHelper(this.gl, this.utils);
    this.entityManager = new EntityManager();
    this.sun = new Sun(this.gl, this.utils, this.axisHelper, "textures/lensFlare.png");
    this.skySphere = new SkySphere(
      this.gl,
      this.utils,
      "textures/milkyway.png"
    );
    this.orbitSystem = new OrbitSystem(this.gl, this.utils);
    this.raycaster = new Raycaster();

    this.canvas.enablePointerLock((ndcX, ndcY) => {
      const proj = this.canvas.getProjectionMatrix();
      const view = this.camera.getViewMatrix();

      const ray = this.raycaster.getRayFromNDC(ndcX, ndcY, proj, view, this.camera.getPosition());

      let closestPlanet: Planet | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const entity of this.entityManager.getEntities()) {
        if (!(entity instanceof Planet)) continue;
        entity.setSelected(false);

        const t = this.raycaster.intersectSphere(
          ray.origin,
          ray.direction,
          entity.getPosition(),
          entity.getRadius()
        );

        if (t !== null && t < closestDistance) {
          closestPlanet = entity;
          closestDistance = t;
        }
      }

      closestPlanet?.setSelected(true);
    });

    this.canvas.onPointerLockChange((locked) => {
      if (!locked) {
        this.input.disableInputs();
        this.input.clear();
      } else {
        this.input.enableMouseInputs((dragging, e) => {
          if (!dragging) this.camera.cameraMouseHandler(e);
        });
        this.input.enableKeyboardInputs();
      }
    });
  }

  private update(time: number) {
    this.camera.cameraKeyboardHandler(this.input.getKeys());
    this.entityManager.update(time);
  }

  render(time: number) {
    this.update(time);
    this.canvas.resizeToDisplaySize();
    this.orbitSystem.update(time * 100000);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    const view = this.camera.getViewMatrix();
    const proj = this.canvas.getProjectionMatrix();

    
    this.orbitSystem.render(view, proj);

    if (this.skySphere.isReady()) {
      this.skySphere.render(view, proj);
    }

    this.entityManager.render(
      view,
      proj,
      this.sun.getPosition(),
      this.camera.getPosition()
    );

    if (this.sun.isReady()) {
      this.sun.render(view, proj);
    }

  }
}
