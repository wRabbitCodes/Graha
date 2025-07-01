import { mat3, mat4, quat, vec3 } from "gl-matrix";
import { SETTINGS } from "../config/settings";

export class Camera {
  private position: vec3 = vec3.fromValues(0, 0, -80);
  private front: vec3 = vec3.fromValues(0, 0, -1);
  private up: vec3 = vec3.fromValues(0, 1, 0);
  private right: vec3 = vec3.create();
  private worldUp: vec3 = vec3.fromValues(0, 1, 0);
  private viewMatrix: mat4 = mat4.create();
  private radius = 5;
  private orientation: quat = quat.create();

  constructor() {
    quat.identity(this.orientation);
    this.updateVectorsFromQuat();
    this.updateViewMatrix();
  }

  update(deltaTime: number) {
    this.updateVectorsFromQuat();
    this.updateViewMatrix();
  }

  cameraMouseHandler(e: MouseEvent) {
    const sensitivity = SETTINGS.MOUSE_SENSITIVITY;
    const yawQuat = quat.setAxisAngle(quat.create(), this.worldUp, -e.movementX * sensitivity);
    const right = vec3.transformQuat(vec3.create(), [1, 0, 0], this.orientation);
    const pitchQuat = quat.setAxisAngle(quat.create(), right, -e.movementY * sensitivity);

    quat.mul(this.orientation, yawQuat, this.orientation);
    quat.mul(this.orientation, pitchQuat, this.orientation);

    this.updateVectorsFromQuat();
  }

  cameraKeyboardHandler(keys: Set<string>, processPipeline: (() => void) | null = null) {
    // Movement controls
    if (keys.has("w")) vec3.scaleAndAdd(this.position, this.position, this.front, SETTINGS.CAMERA_SPEED);
    if (keys.has("s")) vec3.scaleAndAdd(this.position, this.position, this.front, -SETTINGS.CAMERA_SPEED);
    if (keys.has("a")) vec3.scaleAndAdd(this.position, this.position, this.right, -SETTINGS.CAMERA_SPEED);
    if (keys.has("d")) vec3.scaleAndAdd(this.position, this.position, this.right, SETTINGS.CAMERA_SPEED);

    this.updateVectorsFromQuat();
    if (processPipeline) processPipeline();
  }

  setPosition(newPosition: vec3) {
    vec3.copy(this.position, newPosition);
  }

  getViewMatrix(): mat4 {
    return this.viewMatrix;
  }

  getPosition(): vec3 {
    return this.position;
  }

  getRadius(): number {
    return this.radius;
  }

  private updateVectorsFromQuat() {
    vec3.transformQuat(this.front, [0, 0, -1], this.orientation);
    vec3.normalize(this.front, this.front);

    vec3.transformQuat(this.right, [1, 0, 0], this.orientation);
    vec3.normalize(this.right, this.right);

    vec3.cross(this.up, this.right, this.front);
    vec3.normalize(this.up, this.up);
  }

  private updateViewMatrix() {
    const center = vec3.add(vec3.create(), this.position, this.front);
    mat4.lookAt(this.viewMatrix, this.position, center, this.up);
  }

  private lookRotation(forward: vec3, up: vec3): quat {
    // Use forward directly as the z-axis to align camera's negative z-axis (forward) with target
    const zAxis = vec3.normalize(vec3.create(), forward);

    let r = vec3.cross(vec3.create(), up, zAxis);
    if (vec3.length(r) < 0.0001) {
      const altUp = Math.abs(zAxis[1]) < 0.999 ? vec3.fromValues(0, 1, 0) : vec3.fromValues(1, 0, 0);
      r = vec3.cross(vec3.create(), altUp, zAxis);
    }
    vec3.normalize(r, r);

    const u = vec3.cross(vec3.create(), zAxis, r);
    // Create rotation matrix with right, up, and forward as z-axis
    const m = mat3.fromValues(r[0], u[0], zAxis[0], r[1], u[1], zAxis[1], r[2], u[2], zAxis[2]);
    const q = quat.fromMat3(quat.create(), m);
    quat.normalize(q, q);
    return q;
  }
}