import { vec3, vec4, mat4, mat3 } from "gl-matrix";

export class Raycaster {
  getRayFromNDC(
    ndcX: number,
    ndcY: number,
    proj: mat4,
    view: mat4,
    cameraPos: vec3
  ): { origin: vec3; direction: vec3 } {
    const inverseVP = mat4.create();
    const viewProj = mat4.create();
    mat4.multiply(viewProj, proj, view); // VP = P * V
    mat4.invert(inverseVP, viewProj); // inv(VP)

    const fromClipSpace = (z: number): vec3 => {
      const point = vec4.fromValues(ndcX, ndcY, z, 1.0);
      vec4.transformMat4(point, point, inverseVP);
      vec3.scale(point as vec3, point as vec3, 1 / point[3]);
      return point as vec3;
    };

    const nearPoint = fromClipSpace(-1);
    const farPoint = fromClipSpace(1);

    const direction = vec3.create();
    vec3.subtract(direction, farPoint, nearPoint);
    vec3.normalize(direction, direction);

    return { origin: cameraPos, direction };
  }

  intersectSphere(
    rayOrigin: vec3,
    rayDir: vec3,
    modelMatrix: mat4,
    radius: number
  ) {
    const center = vec3.create();
    mat4.getTranslation(center, modelMatrix);
    const oc = vec3.create();
    vec3.subtract(oc, rayOrigin, center);
    const a = vec3.dot(rayDir, rayDir);
    const b = 2.0 * vec3.dot(oc, rayDir);
    const c = vec3.dot(oc, oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2.0 * a);
    const t2 = (-b + sqrtDisc) / (2.0 * a);

    // Use the nearest *positive* t value
    if (t1 > 0) return t1;
    if (t2 > 0) return t2;
    return null;
  }

  intersectRayOBB(
  rayOrigin: vec3,
  rayDir: vec3,
  modelMatrix: mat4,
  aabbMin: vec3,
  aabbMax: vec3
  ): number | null {
    const invModel = mat4.invert(mat4.create(), modelMatrix);
    if (!invModel) return null;

    const localOrigin = vec3.transformMat4(vec3.create(), rayOrigin, invModel);
    const localDir = vec3.transformMat3(vec3.create(), rayDir, mat3.fromMat4(mat3.create(), invModel));
    vec3.normalize(localDir, localDir);  // 🔥 must do this!

    let tmin = (aabbMin[0] - localOrigin[0]) / localDir[0];
    let tmax = (aabbMax[0] - localOrigin[0]) / localDir[0];
    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

    let tymin = (aabbMin[1] - localOrigin[1]) / localDir[1];
    let tymax = (aabbMax[1] - localOrigin[1]) / localDir[1];
    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

    if ((tmin > tymax) || (tymin > tmax)) return null;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (aabbMin[2] - localOrigin[2]) / localDir[2];
    let tzmax = (aabbMax[2] - localOrigin[2]) / localDir[2];
    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

    if ((tmin > tzmax) || (tzmin > tmax)) return null;
    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;

    return tmin >= 0 ? tmin : tmax >= 0 ? tmax : null;
  }

  extractCameraPosition(viewMatrix: mat4): vec3 {
  const viewInv = mat4.invert(mat4.create(), viewMatrix);
  return vec3.fromValues(viewInv[12], viewInv[13], viewInv[14]);
}

 rayOrigin = vec3.create();
  rayDir = vec3.create();

extractForwardVector(viewMatrix: mat4): vec3 {
  const invView = mat4.invert(mat4.create(), viewMatrix);
  const forward = vec3.transformMat4(vec3.create(), [0, 0, -1], invView);
  const position = vec3.fromValues(invView[12], invView[13], invView[14]);
  vec3.subtract(forward, forward, position); // direction = forward - cameraPos
  vec3.normalize(forward, forward);
  return forward;
}
 setFromViewMatrix(viewMatrix: mat4) {
    vec3.copy(this.rayOrigin, this.extractCameraPosition(viewMatrix));
    vec3.copy(this.rayDir, this.extractForwardVector(viewMatrix));
    return {origin: this.rayOrigin, direction: this.rayDir};
  }

}
