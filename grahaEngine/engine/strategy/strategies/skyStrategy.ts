import { mat4 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { IComponent } from "../../ecs/Component";
import { BaseShaderStrategy } from "../shaderStrategy";
import { Shaders } from "../shaders/shaders";

export class SkyStrategy extends BaseShaderStrategy {
    
    initialize(): void {
        this.program = this.utils.createProgram(Shaders.sky.vert, Shaders.sky.frag);
        if (!this.program) throw new Error('Skysphere shader program not found');
        const gl = this.utils.gl;
        this.uniformLocations = {
            view: gl.getUniformLocation(this.program, "u_view"),
            projection: gl.getUniformLocation(this.program, "u_proj"),
            texture: gl.getUniformLocation(this.program, "u_texture"),
        };
    }

    setBindings(gl: WebGL2RenderingContext, ctx: Partial<RenderContext>, components: { [key: string]: IComponent; }, textures: { [key: string]: WebGLTexture; }): void {
        const viewNoTranslation = mat4.clone(ctx.viewMatrix!);
        viewNoTranslation[12] =
        viewNoTranslation[13] =
        viewNoTranslation[14] =
            0;

        gl.useProgram(this.program);
        gl.uniformMatrix4fv(
            this.uniformLocations.view,
            false,
            viewNoTranslation
        );
        gl.uniformMatrix4fv(
            this.uniformLocations.projection,
            false,
            ctx.projectionMatrix!
        );
        gl.activeTexture(gl.TEXTURE0 + 20);
        gl.bindTexture(gl.TEXTURE_2D, textures.texture);
        gl.uniform1i(this.uniformLocations.texture, 20);
    }

}