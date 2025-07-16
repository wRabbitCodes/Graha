import { mat4, quat, vec3 } from "gl-matrix";
import { CameraFreeLookState } from "./cameraStates/CameraFreeLookState";
import { CameraLatchedState } from "./cameraStates/CameraLatchedState";

export interface ICameraState {
  update(camera: Camera, deltaTime: number): void;
  handleNormalMouseMove(camera: Camera, e: MouseEvent): void;
  handleClickAndDrag(camera: Camera, e: MouseEvent): void;
  handleMouseWheel(camera: Camera, e: WheelEvent): void;
  handleKeyboard(camera: Camera, keys: Set<string>): void;
}

export class Camera {
  position: vec3 = vec3.fromValues(0, 0, -80);
  front: vec3 = vec3.fromValues(0, 0, -1);
  up: vec3 = vec3.fromValues(0, 1, 0);
  right: vec3 = vec3.create();
  viewMatrix: mat4 = mat4.create();
  minLatchRadius = 1;
  orientation: quat = quat.create();
  worldUp: vec3 = vec3.fromValues(0,1,0)

  latchedTarget: vec3 = vec3.create(); // where camera looks at
  latchedEntityRadius = 5;
  azimuth = 0; // θ
  elevation = 0.4; // φ
  state: ICameraState;

  constructor() {
    // Start in free look mode
    this.state = new CameraFreeLookState();
    this.updateVectorsFromQuat();
    this.updateViewMatrix();
  }

  update(deltaTime: number) {
    this.state.update!(this, deltaTime);
  }

  // Enable latch mode to view around an entity
  enableLatchMode(target: vec3, radius: number) {
    this.state = new CameraLatchedState();
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
    this.state = new CameraFreeLookState();
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

  updateVectorsFromQuat() {
    vec3.transformQuat(this.front, [0, 0, -1], this.orientation);
    vec3.normalize(this.front, this.front);

    vec3.transformQuat(this.right, [1, 0, 0], this.orientation);
    vec3.normalize(this.right, this.right);

    vec3.cross(this.up, this.right, this.front);
    vec3.normalize(this.up, this.up);
  }

  updateViewMatrix() {
    const cameraFront = this.front;
    const center = vec3.add(vec3.create(), vec3.fromValues(0, 0, 0), cameraFront); // [0,0,0] + front
    mat4.lookAt(this.viewMatrix, vec3.fromValues(0, 0, 0), center, this.up);
  }

  lookInDirection(direction: vec3) {
    // direction is normalized look vector from position

    // Compute target point from position + direction
    const target = vec3.create();
    vec3.add(target, this.position, direction);

    // Update view matrix to look from position to target
    mat4.lookAt(
      this.viewMatrix,
      this.position,
      target,
      this.worldUp,
    );

    // Update front vector as well so getFront() stays correct
    vec3.copy(this.front, direction);
  }

  lookAtTarget(target: vec3) {
    mat4.lookAt(this.viewMatrix, this.position, target, this.worldUp);
  }
}
