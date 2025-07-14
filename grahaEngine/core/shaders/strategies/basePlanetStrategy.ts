import { BaseShaderStrategy } from "./shaderStrategy";

export class BasePlanetShaderStrategy extends BaseShaderStrategy {
 
    initialize(): void {
        this.program = this.shaderLoader.getProgram('basicPlanet') ?? null;
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

    getUniformLocations(): { [key: string]: WebGLUniformLocation | null } {        
        return this.uniformLocations;
    }

    getProgram() {
        return this.program!;
    }
}