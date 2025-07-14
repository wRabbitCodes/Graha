import { mat4, vec3 } from "gl-matrix";
import { IRenderCommand, RenderContext } from "./IRenderCommands.new";

export enum RenderPass {
  OPAQUE = 0,
  TRANSPARENT = 1,
  OVERLAY = 2,
}

type RenderQueue = {
  [pass in RenderPass]: IRenderCommand[];
};

export class Renderer {
  private queues: Map<WebGLProgram, RenderQueue> = new Map();
  private context: RenderContext = {
    viewMatrix: mat4.create(),
    projectionMatrix: mat4.create(),
    cameraPos: vec3.create(),
    lightPos: vec3.create(),
    deltaTime: 0,
  };

  constructor(private gl: WebGL2RenderingContext) {}

  setRenderContext(partial: Partial<RenderContext>): void {
    Object.assign(this.context, partial);
  }

  enqueue(command: IRenderCommand): void {
    if (!command.shaderProgram) return;

    const program = command.shaderProgram;
    if (!this.queues.has(program)) {
      this.queues.set(program, {
        [RenderPass.OPAQUE]: [],
        [RenderPass.TRANSPARENT]: [],
        [RenderPass.OVERLAY]: [],
      });
    }

    const queue = this.queues.get(program)!;
    queue[command.priority as RenderPass].push(command);
  }

  flush(): void {
    const gl = this.gl;

    for (const [program, queue] of this.queues) {
      gl.useProgram(program);

      this.runPass(queue[RenderPass.OPAQUE], this.runOpaquePass.bind(this));
      this.runPass(queue[RenderPass.TRANSPARENT], this.runTransparentPass.bind(this));
      this.runPass(queue[RenderPass.OVERLAY], this.runOverlayPass.bind(this));
    }

    // Remove non-persistent commands and clear empty programs
    for (const [program, queue] of this.queues) {
      for (const pass of Object.values(RenderPass).filter(v => typeof v === "number")) {
        const key = pass as RenderPass;
        queue[key] = queue[key]?.filter(c => c.persistent) ?? [];
      }
      const allEmpty = Object.values(queue).every(q => q.length === 0);
      if (allEmpty) {
        this.queues.delete(program);
      }
    }
  }

  private runPass(commands: IRenderCommand[], handler: (command: IRenderCommand) => void): void {
    for (const cmd of commands) {
      if (cmd.validate(this.gl)) {
        handler(cmd);
      }
    }
  }

  private runOpaquePass(cmd: IRenderCommand): void {
    // Configure opaque state if needed
    // this.gl.enable(this.gl.DEPTH_TEST);
    cmd.execute(this.gl, this.context);
  }

  private runTransparentPass(cmd: IRenderCommand): void {
    // Setup blending, disable depth write
    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    cmd.execute(gl, this.context);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  private runOverlayPass(cmd: IRenderCommand): void {
    // Similar logic for overlays (e.g. disable depth test)
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    cmd.execute(gl, this.context);
    gl.enable(gl.DEPTH_TEST);
  }
}
