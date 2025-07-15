import { RenderContext, IRenderCommand } from "./IRenderCommands.new";

export enum RenderPass {
  OPAQUE = 0,
  TRANSPARENT = 1,
  SHADOW = 2,
}

export class Renderer {
  private gl: WebGL2RenderingContext;
  private commands: IRenderCommand[] = [];
  private context: Partial<RenderContext> = {};
  private framebuffer: WebGLFramebuffer | null = null;
  private colorTexture: WebGLTexture | null = null;
  private depthTexture: WebGLTexture | null = null;
  private shadowFramebuffer: WebGLFramebuffer | null = null;
  private shadowDepthTexture: WebGLTexture | null = null;
  private shadowWidth: number = 2048;
  private shadowHeight: number = 2048;
  private width: number = 0;
  private height: number = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.initializeFramebuffer();
    this.initializeShadowFramebuffer();
  }

  private checkGLError(operation: string) {
    const gl = this.gl;
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      console.error(`WebGL Error during ${operation}: ${this.getErrorString(error)}`);
    }
  }

  private getErrorString(error: number): string {
    switch (error) {
      case this.gl.INVALID_ENUM: return "INVALID_ENUM";
      case this.gl.INVALID_VALUE: return "INVALID_VALUE";
      case this.gl.INVALID_OPERATION: return "INVALID_OPERATION";
      case this.gl.INVALID_FRAMEBUFFER_OPERATION: return "INVALID_FRAMEBUFFER_OPERATION";
      case this.gl.OUT_OF_MEMORY: return "OUT_OF_MEMORY";
      case this.gl.CONTEXT_LOST_WEBGL: return "CONTEXT_LOST_WEBGL";
      default: return `Unknown error (${error})`;
    }
  }

  private getFramebufferStatusString(status: number): string {
    switch (status) {
      case this.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: return "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
      case this.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: return "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
      case this.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: return "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
      case this.gl.FRAMEBUFFER_UNSUPPORTED: return "FRAMEBUFFER_UNSUPPORTED";
      default: return `Unknown status (${status})`;
    }
  }

  private initializeFramebuffer() {
    const gl = this.gl;
    this.width = gl.canvas.width;
    this.height = gl.canvas.height;
    console.log("Initializing framebuffer with size:", this.width, this.height); // Debug
    if (this.width <= 0 || this.height <= 0) {
      console.error("Invalid canvas size:", this.width, this.height);
      return;
    }

    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    this.colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);
    this.checkGLError("color texture setup");

    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    this.checkGLError("depth texture setup");

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`Main framebuffer is not complete: ${this.getFramebufferStatusString(status)}`);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.checkGLError("framebuffer initialization");
  }

  private initializeShadowFramebuffer() {
    const gl = this.gl;
    this.shadowFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);

    this.shadowDepthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowDepthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.shadowWidth, this.shadowHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowDepthTexture, 0);
    this.checkGLError("shadow depth texture setup");

    gl.drawBuffers([]);
    gl.readBuffer(gl.NONE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`Shadow framebuffer is not complete: ${this.getFramebufferStatusString(status)}`);
    }
    this.checkGLError("shadow framebuffer initialization");
  }

  public setRenderContext(context: Partial<RenderContext>) {
    this.context = { ...this.context, ...context };
    this.checkGLError("setRenderContext");
  }

  public enqueue(command: IRenderCommand) {
    this.commands.push(command);
  }

  public flush() {
    const gl = this.gl;
    console.log("Flushing", this.commands.length, "commands"); // Debug
    this.commands.sort((a, b) => a.priority - b.priority);

    // Shadow pass (ignored for now)
    const shadowCommands = this.commands.filter(cmd => cmd.priority === RenderPass.SHADOW);
    if (shadowCommands.length > 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
      gl.viewport(0, 0, this.shadowWidth, this.shadowHeight);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      for (const cmd of shadowCommands) {
        if (cmd.validate(gl)) {
          cmd.execute(gl, this.context as RenderContext);
          this.checkGLError(`shadow command execution (priority ${cmd.priority})`);
        } else {
          console.warn(`Shadow command validation failed`);
        }
      }
    }

    // Main pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`Main framebuffer is not complete before rendering: ${this.getFramebufferStatusString(status)}`);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return;
    }
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    console.log("Depth test enabled:", gl.getParameter(gl.DEPTH_TEST)); // Debug
    console.log("Clear color:", gl.getParameter(gl.COLOR_CLEAR_VALUE)); // Debug
    this.checkGLError("main pass setup");

    const mainCommands = this.commands.filter(cmd => cmd.priority !== RenderPass.SHADOW);
    for (const cmd of mainCommands) {
      if (cmd.validate(gl)) {
        console.log(`Executing command with priority ${cmd.priority}`); // Debug
        cmd.execute(gl, { ...this.context, shadowDepthTexture: this.shadowDepthTexture ?? undefined });
        this.checkGLError(`main command execution (priority ${cmd.priority})`);
      } else {
        console.warn(`Main command validation failed (priority ${cmd.priority})`);
      }
    }

    // Blit to screen
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebuffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    const blitStatus = gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER);
    if (blitStatus !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`Main framebuffer is not complete before blit: ${this.getFramebufferStatusString(blitStatus)}`);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return;
    }
    console.log("Blitting framebuffer to screen"); // Debug
    gl.blitFramebuffer(0, 0, this.width, this.height, 0, 0, this.width, this.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    this.checkGLError("blit framebuffer");
    console.log("Blit complete"); // Debug
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.commands = this.commands.filter(cmd => cmd.persistent);
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (this.width <= 0 || this.height <= 0) {
      console.error("Invalid resize dimensions:", this.width, this.height);
      return;
    }
    this.gl.viewport(0, 0, width, height);
    this.checkGLError("viewport resize");

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    this.checkGLError("color texture resize");

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
    this.checkGLError("depth texture resize");

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  public getDepthTexture(): WebGLTexture | null {
    return this.depthTexture;
  }

  public getShadowDepthTexture(): WebGLTexture | null {
    return this.shadowDepthTexture;
  }
}