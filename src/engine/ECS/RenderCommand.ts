// export class RenderCommand {
//   program: WebGLProgram;
//   vao: WebGLVertexArrayObject;
//   indexCount: number;

//   uniforms: { [name: string]: any };  // e.g. { u_model: mat4, u_view: mat4, ... }
//   textures: { [uniformName: string]: WebGLTexture };
//   blend?: boolean;
//   cullFace?: GLenum;

//   constructor(
//     program: WebGLProgram,
//     vao: WebGLVertexArrayObject,
//     indexCount: number,
//     uniforms: { [name: string]: any },
//     textures: { [uniformName: string]: WebGLTexture },
//     blend = false,
//     cullFace?: GLenum
//   ) {
//     this.program = program;
//     this.vao = vao;
//     this.indexCount = indexCount;
//     this.uniforms = uniforms;
//     this.textures = textures;
//     this.blend = blend;
//     this.cullFace = cullFace;
//   }
// }
import { mat4, mat3 } from "gl-matrix";
import { RenderContext } from "./RenderContext";

type RenderParams = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  indexCount: number;
  modelMatrix?: mat4;
  normalMatrix?: mat3;
  textures?: { [key: string]: WebGLTexture | null };
  uniformLocations?: { [key: string]: WebGLUniformLocation | null };
}

export abstract class RenderCommand {
  constructor(params: RenderParams) {}

  abstract execute(context: RenderContext): void;
}

//  class RenderCommand {
//   constructor(
//     private params: {
  //     gl: WebGL2RenderingContext;
  // program: WebGLProgram;
  // vao: WebGLVertexArrayObject;
  // indexCount: number;
  // modelMatrix?: mat4;
  // normalMatrix?: mat3;
  // textures?: { [key: string]: WebGLTexture | null };
  // uniformLocations?: { [key: string]: WebGLUniformLocation | null };
//     }
  // ) {}

  // execute(context: RenderContext) {
  //   const {
  //     gl,
  //     program,
  //     vao,
  //     indexCount,
  //     modelMatrix,
  //     normalMatrix,
  //     textures,
  //     uniformLocations,
  //   } = this.params;

  //   const { viewMatrix, projMatrix, cameraPos, lightPos } = context;

  //   gl.useProgram(program);
  //   gl.bindVertexArray(vao);

  //   gl.uniformMatrix4fv(uniformLocations!["u_model"], false, modelMatrix!);
  //   gl.uniformMatrix3fv(
  //     uniformLocations!["u_normalMatrix"],
  //     false,
  //     normalMatrix!
  //   );
  //   gl.uniformMatrix4fv(uniformLocations!["u_view"], false, viewMatrix);
  //   gl.uniformMatrix4fv(uniformLocations!["u_proj"], false, projMatrix);
  //   gl.uniform3fv(uniformLocations!["u_lightPos"], lightPos);
  //   gl.uniform3fv(uniformLocations!["u_viewPos"], cameraPos);

  //   let texUnit = 0;
  //   for (const [key, tex] of Object.entries(textures!)) {
  //     if (tex && uniformLocations![key]) {
  //       gl.activeTexture(gl.TEXTURE0 + texUnit);
  //       gl.bindTexture(gl.TEXTURE_2D, tex);
  //       gl.uniform1i(uniformLocations![key]!, texUnit);
  //       texUnit++;
  //     }
  //   }

  //   gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  //   gl.bindVertexArray(null);
  // 
// }
