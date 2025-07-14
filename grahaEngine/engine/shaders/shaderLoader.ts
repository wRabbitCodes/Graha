import { GLUtils } from "../../utils/GLUtils";
import { SHADERS } from "../../data/urls";

export class ShaderLoader {
  private programs: Map<string, WebGLProgram> = new Map();
  private basePath: string = './shaders/';
  private utils: GLUtils;
  private pending: Promise<void>[] = [];

  constructor(utils: GLUtils) {
    this.utils = utils;
    this.loadAllShaders();
  }

  private loadAllShaders(): void {
    for (const [name, shader] of Object.entries(SHADERS)) {
      this.pending.push(
        Promise.all([
          fetch(`${this.basePath}${shader.vertex}`).then(res => res.text()),
          fetch(`${this.basePath}${shader.fragment}`).then(res => res.text())
        ])
          .then(([vertex, fragment]) => {
            const program = this.utils.createProgram(vertex, fragment);
            if (!program) throw new Error(`Failed to compile shader: ${name}`);
            this.programs.set(name, program);
          })
          .catch(err => console.error(`Failed to load shader ${name}:`, err))
      );
    }
  }

  public async loadAll(): Promise<void> {
    await Promise.all(this.pending);
    this.pending = [];
  }

  public getProgram(name: string): WebGLProgram | undefined {
    return this.programs.get(name);
  }
}