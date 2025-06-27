// import { IRenderCommand } from "./IRenderCommands";

import { IRenderCommand, RenderContext } from "./IRenderCommands";

export class Renderer {
  private queue: IRenderCommand[] = [];

  enqueue(cmd: IRenderCommand) {
    this.queue.push(cmd);
  }

  flush(gl: WebGL2RenderingContext, context: RenderContext) {
    debugger;
    for (const cmd of this.queue) {
      cmd.execute(gl, context);
    }
    this.queue = [];
  }
}
