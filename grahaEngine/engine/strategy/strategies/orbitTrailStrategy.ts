import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { mat4 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { OrbitTrailComponent } from "../../ecs/components/OrbitTrialComponent";
import { otFragmentShader, otVertexShader} from "../shaders/orbitTrail.shader";

export class OrbitTrailStrategy {
  private program: WebGLProgram | null = null;

  constructor(private utils: GLUtils) { }

  initialize(): void {
    this.program = this.utils.createProgram(otVertexShader, otFragmentShader);
    if (!this.program) {
      console.error('Failed to create orbit trail program');
    } else {
      console.log('Orbit trail program created successfully');
    }
  }

  getProgram(): WebGLProgram | null {
    return this.program;
  }

  setBindings(gl: WebGL2RenderingContext, ctx: Partial<RenderContext>, components: {
    trailComp: OrbitTrailComponent,
    headProgress: number
  }): void {
    if (!this.program) return;

    const { trailComp, headProgress } = components;
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, ctx.projectionMatrix!, ctx.viewMatrix!);

    const mvpLoc = gl.getUniformLocation(this.program, 'u_mvpMatrix');
    const colorLoc = gl.getUniformLocation(this.program, 'u_color');
    const isMoonLoc = gl.getUniformLocation(this.program, 'u_isMoon');
    const parentPosLoc = gl.getUniformLocation(this.program, 'u_parentPosition');
    const headLoc = gl.getUniformLocation(this.program, 'u_headProgress');

    gl.uniformMatrix4fv(mvpLoc, false, mvpMatrix);
    gl.uniform3fv(colorLoc, trailComp.getColorAsVec3());
    gl.uniform1i(isMoonLoc, trailComp.parentPosition ? 1 : 0);
    gl.uniform3fv(parentPosLoc, trailComp.parentPosition || [0, 0, 0]);
    gl.uniform1f(headLoc, headProgress);
  }
}