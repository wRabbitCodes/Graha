import { mat4, quat, vec3 } from "gl-matrix";
import { SETTINGS } from "../config/settings";

export class Camera {
  private position: vec3 = vec3.fromValues(0, 0, -80);
  private front: vec3 = vec3.fromValues(0, 0, -1);
  private up: vec3 = vec3.fromValues(0, 1, 0);
  private right: vec3 = vec3.create();
  private worldUp: vec3 = vec3.fromValues(0, 1, 0);
  private viewMatrix: mat4 = mat4.create();
  private minLatchRadius = 1;
  private orientation: quat = quat.create();

  private isLatched = false;
  private latchedTarget: vec3 = vec3.create(); // where camera looks at
  private latchedEntityRadius = 5;
  private azimuth = 0; // θ
  private elevation = 0.4; // φ

  constructor() {
    quat.identity(this.orientation);
    this.updateVectorsFromQuat();
    this.updateViewMatrix();
  }

  update(deltaTime: number) {
    if (this.isLatched) {
      const x =
        this.latchedEntityRadius *
        Math.cos(this.elevation) *
        Math.sin(this.azimuth);
      const y = this.latchedEntityRadius * Math.sin(this.elevation);
      const z =
        this.latchedEntityRadius *
        Math.cos(this.elevation) *
        Math.cos(this.azimuth);
      const offset = vec3.fromValues(x, y, z);
      vec3.add(this.position, this.latchedTarget, offset);
      mat4.lookAt(
        this.viewMatrix,
        this.position,
        this.latchedTarget,
        this.worldUp
      );
      return;
    }
    this.updateVectorsFromQuat();
    this.updateViewMatrix();
  }

  // Enable latch mode to view around an entity
  enableLatchMode(target: vec3, radius: number) {
    this.isLatched = true;
    this.minLatchRadius = radius;
    this.latchedEntityRadius = radius * 1.728; //DONT ASK HOW I GOT THIS NUMBER (A LOT OF TRIAL AND ERROR)
    vec3.copy(this.latchedTarget, target);

    // Calculate orbit angles ONCE
    const offset = vec3.subtract(vec3.create(), this.position, target);
    this.azimuth = Math.atan2(offset[0], offset[2]);
    this.elevation = Math.asin(offset[1] / vec3.length(offset));
  }

  // Exit latch mode
  disableLatchMode() {
    this.isLatched = false;

    // Recompute front vector from current position and target
    const direction = vec3.sub(
      vec3.create(),
      this.latchedTarget,
      this.position
    );
    vec3.normalize(direction, direction);

    // Build a rotation quaternion from the look direction
    const worldForward = vec3.fromValues(0, 0, -1);
    const rotationAxis = vec3.cross(vec3.create(), worldForward, direction);
    const dot = vec3.dot(worldForward, direction);

    if (vec3.length(rotationAxis) < 0.0001) {
      // looking in same or opposite direction
      if (dot > 0.9999) {
        quat.identity(this.orientation); // same direction
      } else {
        quat.setAxisAngle(this.orientation, [0, 1, 0], Math.PI); // opposite
      }
    } else {
      vec3.normalize(rotationAxis, rotationAxis);
      const angle = Math.acos(Math.min(Math.max(dot, -1), 1)); // Clamp for safety
      quat.setAxisAngle(this.orientation, rotationAxis, angle);
    }

    // Sync camera vectors with new orientation
    this.updateVectorsFromQuat();

    // Optional: recenter viewMatrix
    this.updateViewMatrix();
  }

  lookInDirection(direction: vec3) {
    // direction is normalized look vector from position

    // Compute target point from position + direction
    const target = vec3.create();
    vec3.add(target, this.position, direction);

    // Update view matrix to look from position to target
    mat4.lookAt(this.viewMatrix, this.position, target, this.worldUp);

    // Update front vector as well so getFront() stays correct
    vec3.copy(this.front, direction);
  }

  lookAtTarget(target: vec3) {
    const up = vec3.fromValues(0, 1, 0); // or this.worldUp if you're tracking it
    mat4.lookAt(this.viewMatrix, this.position, target, up);
  }

  latchedLookMouseHandler(e: MouseEvent) {
    if (this.isLatched) {
      const sensitivity = SETTINGS.MOUSE_SENSITIVITY;
      this.azimuth -= e.movementX * sensitivity;
      this.elevation -= e.movementY * sensitivity;
      this.elevation = Math.max(
        Math.min(this.elevation, Math.PI / 2 - 0.01),
        -Math.PI / 2 + 0.01
      );
      return; // bypass FPS orientation
    }
  }

  latchedWheelMouseHandler(e: WheelEvent) {
    if (!this.isLatched) return;
    const zoomSpeed = 1.2;
    const maxRadius = SETTINGS.MAX_LATCHED_RADIUS;
    // e.deltaY > 0 means zoom out, < 0 means zoom in
    const zoomFactor = e.deltaY > 0 ? zoomSpeed : 1 / zoomSpeed;
    this.latchedEntityRadius *= zoomFactor;
    this.latchedEntityRadius = Math.max(
      this.minLatchRadius,
      Math.min(this.latchedEntityRadius, maxRadius)
    );
  }

  freeLookMouseHandler(e: MouseEvent) {
    const sensitivity = SETTINGS.MOUSE_SENSITIVITY;
    const yawQuat = quat.setAxisAngle(
      quat.create(),
      this.worldUp,
      -e.movementX * sensitivity
    );
    const right = vec3.transformQuat(
      vec3.create(),
      [1, 0, 0],
      this.orientation
    );
    const pitchQuat = quat.setAxisAngle(
      quat.create(),
      right,
      -e.movementY * sensitivity
    );

    quat.mul(this.orientation, yawQuat, this.orientation);
    quat.mul(this.orientation, pitchQuat, this.orientation);
  }

  cameraKeyboardHandler(
    keys: Set<string>,
    processPipeline: (() => void) | null = null
  ) {
    if (this.isLatched) return;
    // Movement controls
    if (keys.has("w"))
      vec3.scaleAndAdd(
        this.position,
        this.position,
        this.front,
        SETTINGS.CAMERA_SPEED
      );
    if (keys.has("s"))
      vec3.scaleAndAdd(
        this.position,
        this.position,
        this.front,
        -SETTINGS.CAMERA_SPEED
      );
    if (keys.has("a"))
      vec3.scaleAndAdd(
        this.position,
        this.position,
        this.right,
        -SETTINGS.CAMERA_SPEED
      );
    if (keys.has("d"))
      vec3.scaleAndAdd(
        this.position,
        this.position,
        this.right,
        SETTINGS.CAMERA_SPEED
      );
  }

  setPosition(newPosition: vec3) {
    vec3.copy(this.position, newPosition);
  }

  getFront() {
    return this.front;
  }

  getViewMatrix(): mat4 {
    return this.viewMatrix;
  }

  getPosition(): vec3 {
    return this.position;
  }

  updateLatchedTarget(newTarget: vec3) {
    vec3.copy(this.latchedTarget, newTarget);
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
