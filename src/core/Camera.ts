import { vec3, mat4 } from "gl-matrix";

export class Camera {
  private position: vec3 = vec3.fromValues(0, 0, 10);
  private front: vec3 = vec3.fromValues(0, 0, -1);
  private up: vec3 = vec3.fromValues(0, 1, 0);
  private right: vec3 = vec3.create();
  private worldUp: vec3 = vec3.fromValues(0, 1, 0);
  private viewMatrix: mat4 = mat4.create();

  private yaw: number = -90;
  private pitch: number = 0;
  private speed: number = 0.1;
  private sensitivity: number = 0.1;

  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor() {
    this.updateVectors();
  }

  cameraKeyboardHandler(keys: Set<string>) {
    if (keys.has("w")) vec3.scaleAndAdd(this.position, this.position, this.front, this.speed);
    if (keys.has("s")) vec3.scaleAndAdd(this.position, this.position, this.front, -this.speed);
    if (keys.has("a")) vec3.scaleAndAdd(this.position, this.position, this.right, -this.speed);
    if (keys.has("d")) vec3.scaleAndAdd(this.position, this.position, this.right, this.speed);
    this.updateViewMatrix();
  }
  
  private updateVectors() {
    const front = vec3.create();
    front[0] = Math.cos(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
    front[1] = Math.sin(this.pitch * Math.PI / 180);
    front[2] = Math.sin(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
    vec3.normalize(this.front, front);
    vec3.cross(this.right, this.front, this.worldUp);
    vec3.normalize(this.right, this.right);
    vec3.cross(this.up, this.right, this.front);
    vec3.normalize(this.up, this.up);
    this.updateViewMatrix();
  }

  private updateViewMatrix() {
    const center = vec3.create();
    vec3.add(center, this.position, this.front);
    mat4.lookAt(this.viewMatrix, this.position, center, this.up);
  }

  cameraMouseHandler(e: MouseEvent) {
    debugger;
    const offsetX = e.clientX - this.lastMouseX;
    const offsetY = this.lastMouseY - e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.yaw += offsetX * this.sensitivity;
    this.pitch += offsetY * this.sensitivity;

    // Clamp pitch to avoid gimbal lock
    this.pitch = Math.max(-89.0, Math.min(89.0, this.pitch));

    this.updateVectors(); // Must update front, right, up
  }

  getViewMatrix(): mat4 {
    return this.viewMatrix;
  }

  getPosition(): vec3 {
    return this.position;
  }
}
