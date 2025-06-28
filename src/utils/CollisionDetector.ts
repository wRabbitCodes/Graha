// CollisionDetector.ts
import { vec3, mat4, mat3 } from "gl-matrix";
import { Raycaster } from "./Raycaster"; // your existing class

export interface SphereCollider {
  center: vec3; // world-space center
  radius: number;
}

export interface OBB {
  modelMatrix: mat4;  // world transform
  min: vec3;          // local-space box min
  max: vec3;          // local-space box max
}

export interface CameraParams {
  position: vec3;
  radius: number;
}

export interface SceneEntity {
  name: string;
  sphere?: SphereCollider;
  obb?: OBB;
}

export class CollisionDetector {
  private entities: SceneEntity[] = [];
  private raycaster = new Raycaster();

  public updateEntities(entities: SceneEntity[]) {
    this.entities = entities;
  }

  public handleCameraCollisions(camera: CameraParams) {
    const pos = camera.position;
    const r = camera.radius;
    const alpha = 0.2; // smoothing factor
    let correctedPos = vec3.clone(camera.position);
    for (const e of this.entities) {
      if (e.sphere) {
        if (this.pointInSphere(pos, e.sphere, r)) {
          this.resolvePushSphere(pos, e.sphere, r);
        }
      }
      if (e.obb) {
        if (this.pointInOBB(pos, e.obb, r)) {
          const target = this.resolvePushOBB(pos, e.obb, r);
          vec3.lerp(correctedPos, correctedPos, target, alpha); 
        }
      }
    }

    return correctedPos;
  }

  // --- Tests ---

  private pointInSphere(p: vec3, s: SphereCollider, r: number) {
    const d2 = vec3.squaredDistance(p, s.center);
    return d2 < (s.radius + r) * (s.radius + r);
  }

  private pointInOBB(p: vec3, obb: OBB, r: number): boolean {
    const inv = mat4.invert(mat4.create(), obb.modelMatrix)!;
    const local = vec3.transformMat4(vec3.create(), p, inv);

    const min = obb.min, max = obb.max;
    const d = vec3.create();

    for (let i = 0; i < 3; i++) {
      let v = local[i];
      if (v < min[i]) d[i] = min[i] - v;
      else if (v > max[i]) d[i] = v - max[i];
      else d[i] = 0;
    }
    const dist2 = d[0]*d[0] + d[1]*d[1] + d[2]*d[2];
    return dist2 < r * r;
  }

  // --- Resolve ---

  private resolvePushSphere(p: vec3, s: SphereCollider, r: number) {
    const dir = vec3.subtract(vec3.create(), p, s.center);
    vec3.normalize(dir, dir);
    vec3.scale(dir, dir, s.radius + r);
    vec3.add(p, s.center, dir);
  }

  private resolvePushOBB(p: vec3, obb: OBB, r: number) {
    const inv = mat4.invert(mat4.create(), obb.modelMatrix)!;
    const local = vec3.transformMat4(vec3.create(), p, inv);
    for (let i = 0; i < 3; i++) {
      if (local[i] < obb.min[i]) local[i] = obb.min[i] - r;
      if (local[i] > obb.max[i]) local[i] = obb.max[i] + r;
    }
    return vec3.transformMat4(vec3.create(), local, obb.modelMatrix);
  }

}
