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
import { BoundingBoxHelper } from "../models/BoundingBox";
import { Popup } from "../models/PopupPanel";

export class Scene {
  readonly gl: WebGL2RenderingContext;
  readonly utils: GLUtils;
  readonly canvas: Canvas;
  readonly camera: Camera;
  // readonly skybox: Skybox;
  readonly sun: Sun;
  readonly skySphere: SkySphere;
  readonly input: IO;
  readonly entityManager: EntityManager;
  readonly orbitSystem: OrbitSystem;
  readonly raycaster: Raycaster;
  readonly axisHelper: AxisHelper;
  readonly boundingBoxHelper: BoundingBoxHelper;
  readonly popup: Popup;

  private loadPopup = false;
  private selected: Planet | null = null;

  constructor(canvasId: string) {
    this.canvas = new Canvas(canvasId);
    this.gl = this.canvas.gl;

    this.utils = new GLUtils(this.gl);
    this.input = new IO(this.canvas.canvas);
    this.camera = new Camera();
    this.axisHelper = new AxisHelper(this.gl, this.utils);
    this.entityManager = new EntityManager();
    this.sun = new Sun(
      this.gl,
      this.utils,
      this.axisHelper,
      "textures/lensFlare.png"
    );
    this.skySphere = new SkySphere(
      this.gl,
      this.utils,
      "textures/milkyway.png"
    );
    this.orbitSystem = new OrbitSystem(this.gl, this.utils);
    this.raycaster = new Raycaster();
    this.boundingBoxHelper = new BoundingBoxHelper(this.gl);
    this.popup = new Popup(this.gl, this.utils);
    this.canvas.enablePointerLock((ndcX, ndcY) => {
      // const ray = this.raycaster.getRayFromNDC(ndcX, ndcY, proj, view, this.camera.getPosition());
      const ray = this.raycaster.setFromViewMatrix(this.camera.getViewMatrix());
      console.log("Camera Pos:", ray.origin);
      console.log("Ray Dir:", ray.direction);

      // let closestPlanet: Planet | null = null;
      // let minDistance = Infinity;
      // for (const entity of this.entityManager.getEntities()) {
      //   if (!(entity instanceof Planet)) continue;

      //   const t = this.raycaster.intersectSphere(
      //     ray.origin,
      //     ray.direction,
      //     entity.getModelMatrix(),
      //     entity.getRadius(),
      //   );

      //   if (t !== null && t < minDistance) {
      //     minDistance = t;
      //     closestPlanet = entity;
      //   }
      // }
      // closestPlanet?.setSelected(!closestPlanet.isSelected());
      // let closest = Infinity;
      // let selected: Planet | null = null;

      // for (const planet of this.entityManager.getEntities()) {
      //   if (!(planet instanceof Planet)) continue;
      //   const { modelMatrix, aabbMin, aabbMax } = planet.getBoundingInfo();
      //   const t = this.raycaster.intersectRayOBB(ray.origin, ray.direction, modelMatrix, aabbMin, aabbMax);
      //   if (t !== null && t < closest) {
      //     closest = t;
      //     selected = planet;
      //   }
      // }
      let closest = Infinity;
      let selected: Planet | null = null;

      for (const planet of this.entityManager.getEntities()) {
        if (!(planet instanceof Planet)) continue;

        // const { modelMatrix, aabbMin, aabbMax } = planet.getBoundingInfo();
        // const t = this.raycaster.intersectRayOBB(ray.origin, ray.direction, modelMatrix, aabbMin, aabbMax);
        // console.log(`${planet.getName()} intersection t: ${t}`);
        const t = this.raycaster.intersectSphere(
          ray.origin,
          ray.direction,
          planet.getModelMatrix(),
          planet.getRadius()
        );

        if (t !== null && t < closest) {
          closest = t;
          selected = planet;
          this.selected = selected;
          this.popup.setSizeRelativeToPlanet(selected.getRadius())
        } 
      }
      if (selected) {
        selected.setSelected(!selected.isSelected());
        console.log("SELECTED ", selected);
      }
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

    this.entityManager.getEntities().forEach((entity) => {
      if (!(entity instanceof Planet)) return;
      entity.updateRotation(time);
      const { modelMatrix } = entity.getBoundingInfo();
      this.boundingBoxHelper.render(modelMatrix, view, proj);
    });

    this.entityManager.render(
      view,
      proj,
      this.sun.getPosition(),
      this.camera.getPosition()
    );

    if (this.sun.isReady()) {
      this.sun.render(view, proj);
    }

    if (this.selected) {
      console.log('POPUP UPDATED AND RENDERED')
      this.popup.updatePopupPosition(this.selected.getPosition(), this.selected.getRadius());
      this.popup.draw(proj, view, this.camera.getPosition());
    }

  }
}
