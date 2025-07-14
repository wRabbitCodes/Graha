import { BaseShaderStrategy } from "./shaderStrategy";

export class AtmospherePlanetShaderStrategy extends BaseShaderStrategy {

  initialize(): void {
    this.program = this.shaderLoader.getProgram('atmospherePlanet') ?? null;
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

  getProgram(): WebGLProgram {
    return this.program!;
  }
}