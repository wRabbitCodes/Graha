import { IComponent } from "../iComponent";
import { RenderCommand } from "../RenderCommand";
import { RenderContext } from "../RenderContext";

export class RenderComponent extends RenderCommand implements IComponent {
  execute(context: RenderContext): void {
    throw new Error("Method not implemented.");
  }
  program: WebGLProgram;
  glowProgram?: WebGLProgram;
  vao: WebGLVertexArrayObject;
  indexCount: number;
  textures: { [key: string]: WebGLTexture | null };
  uniformLocations: { [key: string]: WebGLUniformLocation | null };

  constructor(params: {
    gl: WebGLProgram;
    glowProgram?: WebGLProgram;
    vao: WebGLVertexArrayObject;
    indexCount: number;
    textures: { [key: string]: WebGLTexture | null };
    uniformLocations: { [key: string]: WebGLUniformLocation | null };
  }) {
    super(this.gl);
    this.program = params.program;
    this.glowProgram = params.glowProgram;
    this.vao = params.vao;
    this.indexCount = params.indexCount;
    this.textures = params.textures;
    this.uniformLocations = params.uniformLocations;
  }
  gl: WebGL2RenderingContext;

  

  
}
