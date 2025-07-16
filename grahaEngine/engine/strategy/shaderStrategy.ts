import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { RenderContext } from "../command/IRenderCommands";
import { IComponent } from "../ecs/Component";

export abstract class BaseShaderStrategy {
    protected program: WebGLProgram | null;
    protected uniformLocations: { [key: string]: WebGLUniformLocation | null };
    protected buffers: { [key:string]: WebGLBuffer | null };
    
    constructor(protected utils: GLUtils) {
        this.program = null;
        this.uniformLocations = {};
        this.buffers = {};
    }
    
    abstract initialize(): void;
    abstract setBindings(gl: WebGL2RenderingContext, ctx: Partial<RenderContext>,components: {[key: string]: IComponent}, textures: {[key:string]: WebGLTexture}): void;

    getProgram(): WebGLProgram {
        return this.program!;
    };
}