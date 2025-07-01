import { vec3, mat4, quat, mat3 } from "gl-matrix";
import { SETTINGS } from "../config/settings";

export class Camera {
  private position: vec3 = vec3.fromValues(0, 0, -80);
  private front: vec3 = vec3.fromValues(0, 0, -1);
  private up: vec3 = vec3.fromValues(0, 1, 0);
  private right: vec3 = vec3.create();
  private worldUp: vec3 = vec3.fromValues(0, 1, 0);
  private viewMatrix: mat4 = mat4.identity(mat4.create());
  private radius = 1;

  private overrideLookAt: boolean = false;
  private lookTarget: vec3 = vec3.fromValues(0, 0, 0);

  private yaw: number = -90;
  private pitch: number = 0;

  private rotationQuat: quat = quat.create();

  // Animation state
  private animPhase: "idle" | "rotating" | "moving" = "idle";
  private animTime = 0;
  private animDurationRotate = 4.0; // seconds
  private animDurationMove = 8.0; // seconds
  private startQuat: quat = quat.create();
  private targetQuat: quat = quat.create();
  private startPos: vec3 = vec3.create();
  private targetPos: vec3 = vec3.create();

  private lockedOnSun: boolean = false;

  constructor() {
    this.updateVectors();
    this.updateViewMatrix();
    quat.identity(this.rotationQuat);
  }

  // Call to start smooth animation: rotate to look at sun, then move to targetPos
  startLookAtSunThenMove(targetPosition: vec3) {
    this.animPhase = "rotating";
    this.animTime = 0;
    this.lockedOnSun = true;
    vec3.copy(this.targetPos, targetPosition);
    vec3.copy(this.startPos, this.position);

    quat.copy(this.startQuat, this.getOrientationQuat());

    const toSunDir = vec3.create();
    vec3.subtract(toSunDir, this.position, this.lookTarget);
    vec3.normalize(toSunDir, toSunDir);

    this.targetQuat = this.lookRotation(toSunDir, this.worldUp);
  }

  getOrientationQuat(): quat {
    const z = vec3.create();
    vec3.scale(z, this.front, -1);
    const x = vec3.create();
    vec3.cross(x, this.up, z);
    vec3.normalize(x, x);
    const y = vec3.create();
    vec3.cross(y, z, x);

    const mat = mat3.fromValues(
      x[0], y[0], z[0],
      x[1], y[1], z[1],
      x[2], y[2], z[2]
    );

    const q = quat.create();
    quat.fromMat3(q, mat);
    return q;
  }

  lookRotation(forward: vec3, up: vec3): quat {
    const f = vec3.create();
    vec3.normalize(f, forward);

    const r = vec3.create();
    vec3.cross(r, up, f);
    if (vec3.length(r) < 0.0001) {
      // forward and up are parallel, choose another up
      if (Math.abs(f[1]) < 0.999) {
        vec3.cross(r, vec3.fromValues(0, 1, 0), f);
      } else {
        vec3.cross(r, vec3.fromValues(1, 0, 0), f);
      }
    }
    vec3.normalize(r, r);

    const u = vec3.create();
    vec3.cross(u, f, r);

    const m = mat3.fromValues(
      r[0], u[0], f[0],
      r[1], u[1], f[1],
      r[2], u[2], f[2]
    );

    const q = quat.create();
    quat.fromMat3(q, m);
    quat.normalize(q, q);
    return q;
  }

  update(deltaTime: number) {
    if (this.animPhase === 'rotating') {
      this.animTime += deltaTime;
      const t = Math.min(this.animTime / this.animDurationRotate, 1.0);
      quat.slerp(this.rotationQuat, this.startQuat, this.targetQuat, t);
      this.updateFrontFromQuat(this.rotationQuat);

      if (t === 1.0) {
        this.animPhase = 'moving';
        this.animTime = 0;
      }
    } else if (this.animPhase === 'moving') {
      this.animTime += deltaTime;
      const t = Math.min(this.animTime / this.animDurationMove, 1.0);
      vec3.lerp(this.position, this.startPos, this.targetPos, t);

      // Keep looking at sun (fixed front)
      this.updateFrontFromQuat(this.targetQuat);

      if (t === 1.0) {
        this.animPhase = 'idle';
        this.lockedOnSun = false; // free mouse look from now on
      }
    } else {
      if (!this.lockedOnSun) {
        // only allow mouse look if not locked on sun (no animation)
        this.updateVectors();
      }
    }

    this.updateViewMatrix();
  }


  updateFrontFromQuat(q: quat) {
    const front = vec3.fromValues(0, 0, -1);
    vec3.transformQuat(front, front, q);
    vec3.normalize(this.front, front);

    const right = vec3.fromValues(1, 0, 0);
    vec3.transformQuat(right, right, q);
    vec3.normalize(this.right, right);

    vec3.cross(this.up, this.right, this.front);
    vec3.normalize(this.up, this.up);
  }

  private updateViewMatrix() {
    if (this.overrideLookAt) {
      mat4.lookAt(this.viewMatrix, this.position, this.lookTarget, this.up);
    } else {
      const center = vec3.create();
      vec3.add(center, this.position, this.front);
      mat4.lookAt(this.viewMatrix, this.position, center, this.up);
    }
  }

  updateVectors() {
    const front = vec3.create();
    front[0] = Math.cos((this.yaw * Math.PI) / 180) * Math.cos((this.pitch * Math.PI) / 180);
    front[1] = Math.sin((this.pitch * Math.PI) / 180);
    front[2] = Math.sin((this.yaw * Math.PI) / 180) * Math.cos((this.pitch * Math.PI) / 180);
    vec3.normalize(this.front, front);

    vec3.cross(this.right, this.front, this.worldUp);
    vec3.normalize(this.right, this.right);

    vec3.cross(this.up, this.right, this.front);
    vec3.normalize(this.up, this.up);
  }

  cameraMouseHandler(e: MouseEvent) {
     if (this.lockedOnSun) return; // disable mouse look during animation
    const offsetX = e.movementX;
    const offsetY = -e.movementY; // reverse Y for natural feel

    this.yaw += offsetX * SETTINGS.MOUSE_SENSITIVITY;
    this.pitch += offsetY * SETTINGS.MOUSE_SENSITIVITY;

    this.pitch = Math.max(-89, Math.min(89, this.pitch));
    this.updateVectors();
  }

  cameraKeyboardHandler(keys: Set<string>, processPipeline: (() => void) | null = null) {
    if (this.lockedOnSun) return;

    if (keys.has("w")) vec3.scaleAndAdd(this.position, this.position, this.front, SETTINGS.CAMERA_SPEED);
    if (keys.has("s")) vec3.scaleAndAdd(this.position, this.position, this.front, -SETTINGS.CAMERA_SPEED);
    if (keys.has("a")) vec3.scaleAndAdd(this.position, this.position, this.right, -SETTINGS.CAMERA_SPEED);
    if (keys.has("d")) vec3.scaleAndAdd(this.position, this.position, this.right, SETTINGS.CAMERA_SPEED);

    this.updateVectors();
    if (processPipeline) processPipeline();
  }

  setPosition(newPosition: vec3) {
    vec3.copy(this.position, newPosition);
  }

  getViewMatrix(): mat4 {
    this.updateViewMatrix();
    return this.viewMatrix;
  }

  getPosition(): vec3 {
    return this.position;
  }

  getRadius() {
    return this.radius;
  }
}
