import { SETTINGS } from "@/grahaEngine/config/settings";
import { quat, vec3 } from "gl-matrix";
import { ICameraState, Camera } from "./Camera";

export class CameraFreeLookState implements ICameraState {
  handleClickAndDrag(camera: Camera, e: MouseEvent): void {
        return;
  }
  
  update(camera: Camera, deltaTime: number): void {
    camera.updateVectorsFromQuat();
    camera.updateViewMatrix();
  }

  handleNormalMouseMove(camera: Camera, e: MouseEvent) {
    const sensitivity = SETTINGS.MOUSE_SENSITIVITY;
    const yawQuat = quat.setAxisAngle(
      quat.create(),
      camera.worldUp,
      -e.movementX * sensitivity
    );
    const right = vec3.transformQuat(
      vec3.create(),
      [1, 0, 0],
      camera.orientation
    );
    const pitchQuat = quat.setAxisAngle(
      quat.create(),
      right,
      -e.movementY * sensitivity
    );

    quat.mul(camera.orientation, yawQuat, camera.orientation);
    quat.mul(camera.orientation, pitchQuat, camera.orientation);
  }

  handleMouseWheel(camera: Camera, e: WheelEvent) {
    // Optional: Add zoom functionality
  }

  handleKeyboard(camera: Camera, keys: Set<string>) {
    const pos = camera.position;
    const front = camera.front;
    const right = camera.right;

    if (keys.has("w")) vec3.scaleAndAdd(pos, pos, front, SETTINGS.CAMERA_SPEED);
    if (keys.has("s"))
      vec3.scaleAndAdd(pos, pos, front, -SETTINGS.CAMERA_SPEED);
    if (keys.has("a"))
      vec3.scaleAndAdd(pos, pos, right, -SETTINGS.CAMERA_SPEED);
    if (keys.has("d")) vec3.scaleAndAdd(pos, pos, right, SETTINGS.CAMERA_SPEED);

    camera.position = pos;
  }
}
