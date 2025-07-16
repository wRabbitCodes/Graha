import { mat4, vec3 } from "gl-matrix";
import { COMPONENT_STATE } from "../Component";
import { CCDComponent, SphereCollider } from "../components/CCDComponent";
import { ModelComponent } from "../components/ModelComponent";
import { System } from "../System";
import { Registry } from "../Registry";
import { GLUtils } from "../../../utils/GLUtils";
import { Camera } from "../../../core/Camera"

// CCD => Camera Collision Detection
export class CCDSystem extends System {
  constructor(private camera: Camera, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(CCDComponent)) {
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if (modelComp.state !== COMPONENT_STATE.READY) continue;

      const ccdComp = this.registry.getComponent(entity, CCDComponent);
      if (ccdComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(ccdComp);

      if (ccdComp.state !== COMPONENT_STATE.READY) continue;

      this.camera.position = this.handleCameraCollisions(modelComp);
    }
  }

  private initialize(ccdComp: CCDComponent) {
    ccdComp.state = COMPONENT_STATE.LOADING;
    ccdComp.state = COMPONENT_STATE.READY;
  }

  private handleCameraCollisions(modelComp: ModelComponent) {
    const pos = this.camera.position;
    const alpha = 0.2;

    const radius = Math.max(...modelComp.scale!) * modelComp.boundingBoxScale;

    const translator = vec3.create();
    mat4.getTranslation(translator, modelComp.modelMatrix);

    const sphereCollider = {
      radius,
      center: translator,
    };
    const correctedPos = vec3.clone(pos);

    if (this.pointInSphere(pos, sphereCollider)) {
      const target = this.resolvePushSphere(pos, sphereCollider);
      vec3.lerp(correctedPos, pos, target, alpha); // smooth interpolation
    }
    return correctedPos;
  }

  private pointInSphere(p: vec3, s: SphereCollider) {
    const d2 = vec3.squaredDistance(p, s.center!);
    return d2 < (s.radius!) * (s.radius!);
  }

  private resolvePushSphere(p: vec3, s: SphereCollider) {
    const dir = vec3.subtract(vec3.create(), p, s.center!);
    vec3.normalize(dir, dir);
    vec3.scale(dir, dir, s.radius!);
    return vec3.add(vec3.create(), s.center!, dir); // returns new vec3, no mutation
  }
}
