import { IComponent, COMPONENT_STATE } from "../Component";
import { vec3 } from "gl-matrix";

export class AsteroidModelComponent implements IComponent {
  state = COMPONENT_STATE.UNINITIALIZED;
  positions: Float32Array = new Float32Array(); // 3N
  rotationSpeeds: Float32Array = new Float32Array(); // N
  center: vec3 = vec3.create();
  instanceCount = 0; // added for instancing
  scales: Float32Array = new Float32Array();
}