import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { ShaderLoader } from "../shaderLoader";

export abstract class BaseShaderStrategy {
    protected program: WebGLProgram | null;
    protected uniformLocations: { [key: string]: WebGLUniformLocation | null };
    protected buffers: { [key:string]: WebGLBuffer | null };
    
    constructor(protected shaderLoader: ShaderLoader, protected utils: GLUtils) {
        this.program = null;
        this.uniformLocations = {};
        this.buffers = {};
    }
    
    abstract initialize(): void;
    abstract getProgram(): WebGLProgram;
}