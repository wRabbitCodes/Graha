// AsteroidComponent.ts
import { mat4, quat, vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";
import { MeshData } from "@/grahaEngine/core/AssetsLoader";

export class AsteroidComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;

  // Mesh data
  mesh?: MeshData;

  // Transform for non-instanced fallback (optional)
  position: vec3 = vec3.create();
  rotation: quat = quat.create();
  scale: vec3 = vec3.fromValues(1, 1, 1);
  modelMatrix: mat4 = mat4.create();

  // WebGL
  vao: WebGLVertexArrayObject | null = null;
  vertexCount: number = 0;

  // Instancing
  instanceCount: number = 0;
  instanceMatrices: Float32Array = new Float32Array();
  instanceVBO: WebGLBuffer | null = null;

  spinAxes: vec3[] = [];
  spinAngles: number[] = [];
}