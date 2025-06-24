import { vec3, vec4, mat4 } from "gl-matrix";

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
    center: vec3,
    radius: number
  ): number | null {
    const oc = vec3.create();
    vec3.subtract(oc, rayOrigin, center);
    const a = vec3.dot(rayDir, rayDir);
    const b = 2.0 * vec3.dot(oc, rayDir);
    const c = vec3.dot(oc, oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) return null;

    const sqrtD = Math.sqrt(discriminant);
    const t1 = (-b - sqrtD) / (2.0 * a);
    const t2 = (-b + sqrtD) / (2.0 * a);

    const t = t1 > 0 ? t1 : t2 > 0 ? t2 : null;
    return t;
  }
}
