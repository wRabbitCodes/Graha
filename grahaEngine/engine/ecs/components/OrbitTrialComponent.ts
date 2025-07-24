import { vec3 } from 'gl-matrix';
import { IComponent, COMPONENT_STATE } from '../Component';

export class OrbitTrailComponent implements IComponent {
  state = COMPONENT_STATE.UNINITIALIZED;
  vao: WebGLVertexArrayObject | null = null;
  positionBuffer: WebGLBuffer | null = null;
  opacityBuffer: WebGLBuffer | null = null;
  program: WebGLProgram | null = null;
  color= "#FFFFFF" // Default white
  pointCount: number = 180; // Number of points in the trail
  orbitPoints: number[] = [];
  parentPosition?: vec3;

  getColorAsVec3(): vec3 {
    const hex = this.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return vec3.fromValues(r, g, b);
  }
}