import { mat3 } from "gl-matrix";
import { BaseShaderStrategy } from "../shaderStrategy";
import { IComponent } from "../../ecs/Component";
import { ModelComponent } from "../../ecs/components/ModelComponent";
import { RenderContext } from "../../command/IRenderCommands.new";
import { Shaders } from "../shaders/shaders";

export class BasePlanetStrategy extends BaseShaderStrategy {
 
    initialize(): void {
        this.program = this.utils.createProgram(Shaders.planet.vert, Shaders.planet.frag);
        if (!this.program) throw new Error('BasicPlanet shader program not found');
        const gl = this.utils.gl;
        this.uniformLocations = {
            model: gl.getUniformLocation(this.program!, "u_model"),
            view: gl.getUniformLocation(this.program!, "u_view"),
            projection: gl.getUniformLocation(this.program!, "u_proj"),
            normalMatrix: gl.getUniformLocation(this.program!, "u_normalMatrix"),
            lightPos: gl.getUniformLocation(this.program!, "u_lightPos"),
            viewPos: gl.getUniformLocation(this.program!, "u_viewPos"),
            surface: gl.getUniformLocation(this.program!, "u_surfaceTexture"),
            normal: gl.getUniformLocation(this.program!, "u_normalTexture"),
            specular: gl.getUniformLocation(this.program!, "u_specularTexture"),
            night: gl.getUniformLocation(this.program!, "u_nightTexture"),
            useNormal: gl.getUniformLocation(this.program!, "u_useNormal"),
            useSpecular: gl.getUniformLocation(this.program!, "u_useSpecular"),
            useNight: gl.getUniformLocation(this.program!, "u_useNight"),
        };
    }

    setBindings(gl: WebGL2RenderingContext, ctx: Partial<RenderContext>, components: {[key: string]: IComponent}, textures: {[key:string]: WebGLTexture | undefined}): void {
        const modelComp = components.modelComp as ModelComponent;
        gl.useProgram(this.program);
        gl.uniformMatrix3fv(
            this.uniformLocations.normalMatrix,
            false,
            mat3.normalFromMat4(mat3.create(), modelComp.modelMatrix)
        );
        gl.uniformMatrix4fv(
            this.uniformLocations.model,
            false,
            modelComp.modelMatrix
        );
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
        gl.uniform3fv(this.uniformLocations.lightPos, ctx.lightPos!);
        gl.uniform3fv(this.uniformLocations.viewPos, ctx.cameraPos!);

        gl.uniform1i(
            this.uniformLocations.useNormal,
            textures.normal ? 1 : 0
        );
        gl.uniform1i(
            this.uniformLocations.useSpecular,
            textures.specular ? 1 : 0
        );
        gl.uniform1i(
            this.uniformLocations.useAtmosphere,
            textures.atmosphere ? 1 : 0
        );
        gl.uniform1i(
            this.uniformLocations.useNight,
            textures.night ? 1 : 0
        );

        this.bindTextures(textures);

    }

    private bindTextures(
        texComp: { [key: string]: WebGLTexture | undefined }
    ) {
        const gl = this.utils.gl;
        let idx = 0;
        Object.entries(texComp).forEach(([key, value]) => {
        if (value instanceof WebGLTexture) {
            gl.activeTexture(gl.TEXTURE0 + idx);
            gl.bindTexture(gl.TEXTURE_2D, value);
            gl.uniform1i(this.uniformLocations[key], idx);
            idx++;
        }
    });
  }
}