import { vec3, mat4 } from "gl-matrix";

export class Camera {
  private position: vec3 = vec3.fromValues(0, 0, 10);
  private front: vec3 = vec3.fromValues(0, 0, -1);
  private up: vec3 = vec3.fromValues(0, 1, 0);
  private right: vec3 = vec3.create();
  private worldUp: vec3 = vec3.fromValues(0, 1, 0);
  private viewMatrix: mat4 = mat4.identity(mat4.create());

  private yaw: number = -90;
  private pitch: number = 0;
  private speed: number = 0.1;
  private sensitivity: number = 0.1;

  constructor() {
    this.updateVectors();
    this.updateViewMatrix();
  }

  cameraKeyboardHandler(keys: Set<string>) {
    if (keys.has("w")) vec3.scaleAndAdd(this.position, this.position, this.front, this.speed);
    if (keys.has("s")) vec3.scaleAndAdd(this.position, this.position, this.front, -this.speed);
    if (keys.has("a")) vec3.scaleAndAdd(this.position, this.position, this.right, -this.speed);
    if (keys.has("d")) vec3.scaleAndAdd(this.position, this.position, this.right, this.speed);
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
  }

  private updateViewMatrix() {
    const center = vec3.create();
    vec3.add(center, this.position, this.front);
    mat4.lookAt(this.viewMatrix, this.position, center, this.up);
  }

  cameraMouseHandler(e: MouseEvent) {
    console.log('MOUSE MOVED | NO DRAG')
    const offsetX = e.movementX;
    const offsetY = -e.movementY; // reverse Y if needed for intuition

    this.yaw += offsetX * this.sensitivity;
    this.pitch += offsetY * this.sensitivity;

    // Clamp pitch 
    this.pitch = Math.max(-89.0, Math.min(89.0, this.pitch));

    this.updateVectors(); // Must update front, right, up
  }

  getViewMatrix(): mat4 {
    this.updateViewMatrix();
    return this.viewMatrix;
  }

  getPosition(): vec3 {
    return this.position;
  }
}
