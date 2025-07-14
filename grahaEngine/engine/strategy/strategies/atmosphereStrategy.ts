import { mat4 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { IComponent } from "../../ecs/Component";
import { BaseShaderStrategy } from "../shaderStrategy";
import { ModelComponent } from "../../ecs/components/ModelComponent";
import { Shaders } from "../shaders/shaders";

export class AtmosphereStrategy extends BaseShaderStrategy {
  private atmosphereRotation = 0;
  setBindings(gl: WebGL2RenderingContext, ctx: RenderContext, components: { [key: string]: IComponent; }, textures: { [key: string]: WebGLTexture }): void {
    this.atmosphereRotation += (ctx.deltaTime / 45000) % 1.0;
    const modelComp = components.modelComp as ModelComponent;
    const atmosphereModel = mat4.clone(modelComp.modelMatrix);
    mat4.scale(atmosphereModel, atmosphereModel, [1.02, 1.02, 1.02]);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(
      this.uniformLocations.model,
      false,
      atmosphereModel
    );
    gl.uniformMatrix4fv(
      this.uniformLocations.view,
      false,
      ctx.viewMatrix
    );
    gl.uniformMatrix4fv(
      this.uniformLocations.projection,
      false,
      ctx.projectionMatrix
    );
    gl.uniform1f(
      this.uniformLocations.rotation,
      this.atmosphereRotation,
    );
    gl.uniform1f(
      this.uniformLocations.opacity,
      0.3
    );
    gl.uniform1f(
      this.uniformLocations.time,
      Date.now() / 1000
    );
    gl.uniform1f(
      this.uniformLocations.fogDensity,
      0.03
    );

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, textures.atmosphere);
    gl.uniform1i(
      this.uniformLocations.atmosphere,
      4,
    );
  }

  initialize(): void {
    this.program = this.utils.createProgram(Shaders.atmosphere.vert, Shaders.atmosphere.frag) ?? null;
    if (!this.program) throw new Error('AtmospherePlanet shader program not found');
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
        atmosphere: gl.getUniformLocation(this.program!, "u_atmosphereTexture"),
        useNormal: gl.getUniformLocation(this.program!, "u_useNormal"),
        useSpecular: gl.getUniformLocation(this.program!, "u_useSpecular"),
        useNight: gl.getUniformLocation(this.program!, "u_useNight"),
        useAtmosphere: gl.getUniformLocation(this.program!, "u_useAtmosphere"),
        rotation: gl.getUniformLocation(this.program!, "u_rotation"),
        opacity: gl.getUniformLocation(this.program!, "u_opacity"),
        time: gl.getUniformLocation(this.program!, "u_time"),
        fogDensity: gl.getUniformLocation(this.program!, "u_fogDensity"),
    };
  }
}