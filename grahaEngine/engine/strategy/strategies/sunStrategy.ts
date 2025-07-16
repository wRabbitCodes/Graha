import { SETTINGS } from "@/grahaEngine/config/settings";
import { RenderContext } from "../../command/IRenderCommands";
import { IComponent } from "../../ecs/Component";
import { Shaders } from "../shaders/shaders";
import { BaseShaderStrategy } from "../shaderStrategy";

export class SunStrategy extends BaseShaderStrategy {
  initialize(): void {
    this.program = this.utils.createProgram(Shaders.sun.vert, Shaders.sun.frag);
    if (!this.program) throw new Error('Skysphere shader program not found');
    const gl = this.utils.gl;
    this.uniformLocations = {
        view: gl.getUniformLocation(this.program, "u_view"),
        projection: gl.getUniformLocation(this.program, "u_proj"),
        worldPos: gl.getUniformLocation(this.program, "u_worldPos"),
        size: gl.getUniformLocation(this.program, "u_size"),
        lensFlare: gl.getUniformLocation(this.program, "u_lensflare"),
    };
  }
  setBindings(gl: WebGL2RenderingContext, ctx: Partial<RenderContext>, components: { [key: string]: IComponent; }, textures: { [key: string]: WebGLTexture; }): void {
    const texture = textures.sunTexture as WebGLTexture;
    gl.useProgram(this.program)
    gl.uniformMatrix4fv(
      this.uniformLocations.view,
      false,
      ctx.viewMatrix!
    );
    gl.uniformMatrix4fv(
      this.uniformLocations.projection,
      false,
      ctx.projectionMatrix!
    );
    gl.uniform3fv(
      this.uniformLocations.worldPos,
      ctx.lightPos!
    ); // Sun at origin
    gl.uniform1f(
      this.uniformLocations.size,
      SETTINGS.SUN_SIZE,
    ); // Scale of flare in world units

    gl.activeTexture(gl.TEXTURE0 + 15);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(
      this.uniformLocations.lensFlare,
      15
    );
  }

}