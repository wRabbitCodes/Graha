import { GLUtils } from "../../utils/GLUtils";

export interface ShaderSource {
  vertex: string;
  fragment: string;
}

export class ShaderLoader {
  private programs: Map<string, WebGLProgram> = new Map();
  private basePath: string = './glsl/';
  private utils: GLUtils;
  private pending: Promise<void>[] = [];

  constructor(utils: GLUtils) {
    this.utils = utils;
  }

  public loadShader(name: string, vertexPath: string, fragmentPath: string): void {
    this.pending.push(
      Promise.all([
        fetch(`${this.basePath}${vertexPath}`).then(res => res.text()),
        fetch(`${this.basePath}${fragmentPath}`).then(res => res.text())
      ])
        .then(([vertex, fragment]) => {
          const program = this.utils.createProgram(vertex, fragment);
          if (!program) throw new Error(`Failed to compile shader: ${name}`);
          this.programs.set(name, program);
        })
        .catch(err => console.error(`Failed to load shader ${name}:`, err))
    );
  }

  public async loadAll(): Promise<void> {
    await Promise.all(this.pending);
    this.pending = [];
  }

  public getProgram(name: string): WebGLProgram | undefined {
    return this.programs.get(name);
  }
}