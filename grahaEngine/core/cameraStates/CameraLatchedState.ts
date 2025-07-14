import { SETTINGS } from "@/grahaEngine/config/settings";
import { mat4, vec3 } from "gl-matrix";
import { ICameraState, Camera } from "../Camera";

export class CameraLatchedState implements ICameraState {
  handleNormalMouseMove(camera: Camera, e: MouseEvent): void {
    return
  }
  handleKeyboard(camera: Camera, keys: Set<string>): void {
    return
  }
  private lookAtTarget(position: vec3, target: vec3): mat4{
    return mat4.lookAt(mat4.create(), position, target, vec3.fromValues(0, 1, 0));
  }

  update(camera: Camera, deltaTime: number) {
    const x = camera.latchedEntityRadius * Math.cos(camera.elevation) * Math.sin(camera.azimuth);
    const y = camera.latchedEntityRadius * Math.sin(camera.elevation);
    const z = camera.latchedEntityRadius * Math.cos(camera.elevation) * Math.cos(camera.azimuth);
    const offset = vec3.fromValues(x, y, z);
    const pos = vec3.add(vec3.create(), camera.latchedTarget, offset);
    camera.position = pos;
    camera.viewMatrix = this.lookAtTarget(camera.position, camera.latchedTarget);
  }

  handleClickAndDrag(camera: Camera, e: MouseEvent) {
    const sensitivity = SETTINGS.MOUSE_SENSITIVITY;
    camera.azimuth -= e.movementX * sensitivity;
    camera.elevation -= e.movementY * sensitivity;
    camera.elevation = Math.max(
      Math.min(camera.elevation, Math.PI / 2 - 0.01),
      -Math.PI / 2 + 0.01
    );
  }

  handleMouseWheel(camera: Camera, e: WheelEvent) {
    const zoomSpeed = 1.2;
    const maxRadius = SETTINGS.MAX_LATCHED_RADIUS;
    const zoomFactor = e.deltaY > 0 ? zoomSpeed : 1 / zoomSpeed;

    camera.latchedEntityRadius = Math.max(
      camera.minLatchRadius,
      Math.min(camera.latchedEntityRadius * zoomFactor, maxRadius)
    );
    
  }
}