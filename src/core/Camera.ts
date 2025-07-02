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

  private isLatched = false;
  private latchedTarget: vec3 = vec3.create(); // where camera looks at
  private latchedRadius = 50;
  private azimuth = 0; // θ
  private elevation = 0.4; // φ

  constructor() {
    quat.identity(this.orientation);
    this.updateVectorsFromQuat();
    this.updateViewMatrix();
  }

  update(deltaTime: number) {
    if (this.isLatched) {
      const x = this.latchedRadius * Math.cos(this.elevation) * Math.sin(this.azimuth);
      const y = this.latchedRadius * Math.sin(this.elevation);
      const z = this.latchedRadius * Math.cos(this.elevation) * Math.cos(this.azimuth);

      const offset = vec3.fromValues(x, y, z);
      vec3.add(this.position, this.latchedTarget, offset);

      mat4.lookAt(this.viewMatrix, this.position, this.latchedTarget, this.worldUp);
      return;
    } 
    this.updateVectorsFromQuat();
    this.updateViewMatrix();
    
  }

  // Enable latch mode to view around an entity
  enableLatchMode(target: vec3, radius: number) {
    vec3.copy(this.latchedTarget, target);
    this.latchedRadius = radius;
    this.isLatched = true;

    // Initialize angles from current camera position
    const offset = vec3.subtract(vec3.create(), this.position, target);
    this.latchedRadius = vec3.length(offset);

    // Compute spherical angles from position
    this.azimuth = Math.atan2(offset[0], offset[2]);
    this.elevation = Math.asin(offset[1] / this.latchedRadius);
  }

  // Exit latch mode
  disableLatchMode() {
    this.isLatched = false;
  }

  latchedLookMouseHandler(e: MouseEvent) {
    if (this.isLatched) {
      const sensitivity = SETTINGS.MOUSE_SENSITIVITY;
      this.azimuth   -= e.movementX * sensitivity;
      this.elevation -= e.movementY * sensitivity;
      this.elevation = Math.max(Math.min(this.elevation, Math.PI/2 - 0.01), -Math.PI/2 + 0.01);
      return; // bypass FPS orientation
    }
  }

  freeLookMouseHandler(e: MouseEvent) {
    const sensitivity = SETTINGS.MOUSE_SENSITIVITY;
    const yawQuat = quat.setAxisAngle(quat.create(), this.worldUp, -e.movementX * sensitivity);
    const right = vec3.transformQuat(vec3.create(), [1, 0, 0], this.orientation);
    const pitchQuat = quat.setAxisAngle(quat.create(), right, -e.movementY * sensitivity);

    quat.mul(this.orientation, yawQuat, this.orientation);
    quat.mul(this.orientation, pitchQuat, this.orientation);

  }

  cameraKeyboardHandler(keys: Set<string>, processPipeline: (() => void) | null = null) {
    if (this.isLatched) return;
    // Movement controls
    if (keys.has("w")) vec3.scaleAndAdd(this.position, this.position, this.front, SETTINGS.CAMERA_SPEED);
    if (keys.has("s")) vec3.scaleAndAdd(this.position, this.position, this.front, -SETTINGS.CAMERA_SPEED);
    if (keys.has("a")) vec3.scaleAndAdd(this.position, this.position, this.right, -SETTINGS.CAMERA_SPEED);
    if (keys.has("d")) vec3.scaleAndAdd(this.position, this.position, this.right, SETTINGS.CAMERA_SPEED);
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
  
}