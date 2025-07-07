import { IComponent, COMPONENT_STATE } from "../Component";
import { vec3 } from "gl-matrix";

export class AsteroidPointCloudComponent implements IComponent {
  state = COMPONENT_STATE.UNINITIALIZED;
  positions: Float32Array = new Float32Array(); // 3N
  rotationSpeeds: Float32Array = new Float32Array(); // N
  center: vec3 = vec3.create();
}
