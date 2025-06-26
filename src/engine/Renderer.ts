import { RenderCommand } from "./ECS/RenderCommand";

export class Renderer {
  private commandQueue: RenderCommand[] = [];
  private gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  enqueueCommand(command: RenderCommand) {
    this.commandQueue.push(command);
  }

  flush() {
    const gl = this.gl;

    for (const cmd of this.commandQueue) {
      gl.useProgram(cmd.program);
      gl.bindVertexArray(cmd.vao);

      // Set uniforms (assume only mat4, vec3, int for simplicity here)
      for (const [name, value] of Object.entries(cmd.uniforms)) {
        const loc = gl.getUniformLocation(cmd.program, name);
        if (!loc) continue;
        if (value instanceof Float32Array) {
          if (value.length === 16) gl.uniformMatrix4fv(loc, false, value);
          else if (value.length === 9) gl.uniformMatrix3fv(loc, false, value);
          else if (value.length === 3) gl.uniform3fv(loc, value);
        } else if (typeof value === "number") {
          gl.uniform1i(loc, value);
        }
      }

      // Bind textures
      let texUnit = 0;
      for (const [uniformName, texture] of Object.entries(cmd.textures)) {
        gl.activeTexture(gl.TEXTURE0 + texUnit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const loc = gl.getUniformLocation(cmd.program, uniformName);
        if (loc) gl.uniform1i(loc, texUnit);
        texUnit++;
      }

      // Setup blending & culling
      if (cmd.blend) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.disable(gl.BLEND);
      }

      if (cmd.cullFace !== undefined) {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(cmd.cullFace);
      } else {
        gl.disable(gl.CULL_FACE);
      }

      // Draw call
      gl.drawElements(gl.TRIANGLES, cmd.indexCount, gl.UNSIGNED_SHORT, 0);

      gl.bindVertexArray(null);
    }

    this.commandQueue.length = 0; // clear commands after flush
  }
}
