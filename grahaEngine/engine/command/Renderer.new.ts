import { mat4, vec3 } from "gl-matrix";
import { IRenderCommand, RenderContext } from "./IRenderCommands.new";


// Before introduction of renderpass , we manaually set and cleared certain webgl2 flags
// like gl.enable(gl.BLEND) ... use render pass to group all such commands by renderpass
// will be useful to efficently set shadows later
export enum RenderPass {
  OPAQUE = 0,      // For solid objects like planets
  TRANSPARENT = 1, // For effects like atmospheres or selection glow
  OVERLAY = 2,     // For UI elements, tags, etc.
}


export class Renderer {
  private gl: WebGL2RenderingContext;
  private commandQueue: Map<WebGLProgram, Map<RenderPass, IRenderCommand[]>> = new Map();
  private context: RenderContext = {
    viewMatrix: mat4.create(),
    projectionMatrix: mat4.create(),
    cameraPos: vec3.create(),
    lightPos: vec3.create(),
    deltaTime: 0,
  };

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.configureWebGL();
  }

  private configureWebGL(): void {
    const gl = this.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearDepth(1.0);
  }

  public setRenderContext(context: Partial<RenderContext>): void {
    this.context = { ...this.context, ...context };
  }

  public enqueue(command: IRenderCommand): void {
    const shaderProgram = command.shaderProgram;
    if (!shaderProgram) return;

    if (!this.commandQueue.has(shaderProgram)) {
      this.commandQueue.set(shaderProgram, new Map([
        [RenderPass.OPAQUE, []],
        [RenderPass.TRANSPARENT, []],
        [RenderPass.OVERLAY, []]
      ]));
    }

    const passQueue = this.commandQueue.get(shaderProgram)!.get(command.priority as RenderPass) || [];
    passQueue.push(command);
    this.commandQueue.get(shaderProgram)!.set(command.priority as RenderPass, passQueue);
  }

  public flush(): void {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render passes in order: OPAQUE, TRANSPARENT, OVERLAY
    for (const [shaderProgram, passMap] of this.commandQueue) {
      for (const pass of [RenderPass.OPAQUE, RenderPass.TRANSPARENT, RenderPass.OVERLAY]) {
        const commands = passMap.get(pass) || [];
        if (commands.length === 0) continue;

        for (const command of commands) {
          if (command.validate(gl)) {
            command.execute(gl, this.context);
            if (!command.persistent) {
              commands.splice(commands.indexOf(command), 1);
            }
          }
        }
      }
    }

    // Clear non-persistent commands
    for (const [shaderProgram, passMap] of this.commandQueue) {
      for (const pass of [RenderPass.OPAQUE, RenderPass.TRANSPARENT, RenderPass.OVERLAY]) {
        passMap.set(pass, passMap.get(pass)!.filter(cmd => cmd.persistent));
      }
      if ([...passMap.values()].every(queue => queue.length === 0)) {
        this.commandQueue.delete(shaderProgram);
      }
    }
  }
}