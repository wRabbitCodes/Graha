import { vec3, vec4, mat4 } from "gl-matrix";

export class Raycaster {
  public getRayFromScreen(
    ndcX: number,
    ndcY: number,
    proj: mat4,
    view: mat4,
    cameraPos: vec3
  ): { origin: vec3; direction: vec3 } {
    const inverseVP = mat4.create();
    mat4.multiply(inverseVP, proj, view);
    mat4.invert(inverseVP, inverseVP);

    const nearPoint = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
    const farPoint = vec4.fromValues(ndcX, ndcY, 1.0, 1.0);

    vec4.transformMat4(nearPoint, nearPoint, inverseVP);
    vec4.transformMat4(farPoint, farPoint, inverseVP);

    for (const p of [nearPoint, farPoint]) {
      p[0] /= p[3];
      p[1] /= p[3];
      p[2] /= p[3];
      p[3] = 1.0;
    }

    const origin = vec3.fromValues(nearPoint[0], nearPoint[1], nearPoint[2]);
    const far = vec3.fromValues(farPoint[0], farPoint[1], farPoint[2]);
    const direction = vec3.create();
    vec3.subtract(direction, far, origin);
    vec3.normalize(direction, direction);

    return { origin, direction };
  }

  public intersectSphere(rayOrigin: vec3, rayDir: vec3, center: vec3, radius: number): number | null {
    const oc = vec3.create();
    vec3.subtract(oc, rayOrigin, center);
    const a = vec3.dot(rayDir, rayDir);
    const b = 2.0 * vec3.dot(oc, rayDir);
    const c = vec3.dot(oc, oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    return (-b - Math.sqrt(discriminant)) / (2.0 * a);
  }
}
