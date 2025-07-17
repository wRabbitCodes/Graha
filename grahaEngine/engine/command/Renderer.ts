import { RenderContext, IRenderCommand } from "./IRenderCommands";
import { mat4 } from "gl-matrix";

export enum RenderPass {
  OPAQUE = 0,
  TRANSPARENT = 1,
  SHADOW = 2,
}

export class Renderer {
  private gl: WebGL2RenderingContext;
  private commands: IRenderCommand[] = [];
  private context: Partial<RenderContext> = {};
  private fboMSAA: WebGLFramebuffer | null = null;
  private colorRenderbufferMSAA: WebGLRenderbuffer | null = null;
  private depthRenderbufferMSAA: WebGLRenderbuffer | null = null;
  private fbo: WebGLFramebuffer | null = null;
  private colorTexture: WebGLTexture | null = null;
  private width: number = 0;
  private height: number = 0;
  private samples: number = 0;
  private quadProgram: WebGLProgram | null = null;
  private quadVAO: WebGLVertexArrayObject | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
    // console.log("Max samples:", this.samples);
    gl.getExtension("EXT_color_buffer_float");
    this.initializeFramebuffer();
    this.initializeQuadProgram();
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
      case this.gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: return "FRAMEBUFFER_INCOMPLETE_MULTISAMPLE";
      default: return `Unknown status (${status})`;
    }
  }

  private initializeFramebuffer() {
    const gl = this.gl;
    this.width = gl.canvas.width;
    this.height = gl.canvas.height;
    // console.log("Initializing framebuffer with size:", this.width, this.height, "samples:", this.samples);
    if (this.width <= 0 || this.height <= 0) {
      console.error("Invalid canvas size:", this.width, this.height);
      return;
    }

    // Multisampled framebuffer
    this.fboMSAA = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboMSAA);

    this.colorRenderbufferMSAA = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.colorRenderbufferMSAA);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, this.width, this.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.colorRenderbufferMSAA);
    this.checkGLError("color renderbuffer MSAA setup");

    this.depthRenderbufferMSAA = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRenderbufferMSAA);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, this.width, this.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRenderbufferMSAA);
    this.checkGLError("depth renderbuffer MSAA setup");

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    const msaaStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (msaaStatus !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`MSAA framebuffer is not complete: ${this.getFramebufferStatusString(msaaStatus)}`);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    // Non-multisampled framebuffer
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

    this.colorTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, this.width, this.height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);
    this.checkGLError("color texture setup");

    const fboStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (fboStatus !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`FBO is not complete: ${this.getFramebufferStatusString(fboStatus)}`);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.checkGLError("framebuffer initialization");
  }

  private initializeQuadProgram() {
    const gl = this.gl;

    const vertexShaderSource = `#version 300 es
      #pragma vscode_glsllint_stage: vert
      layout(location=0) in vec4 aPosition;
      layout(location=1) in vec2 aTexCoord;
      out vec2 vTexCoord;
      void main() {
        gl_Position = aPosition;
        vTexCoord = aTexCoord;
      }
    `;

    const fragmentShaderSource = `#version 300 es
      #pragma vscode_glsllint_stage: frag
      precision mediump float;
      uniform sampler2D colorSampler;
      in vec2 vTexCoord;
      out vec4 fragColor;
      void main() {
        fragColor = texture(colorSampler, vTexCoord);
      }
    `;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error("Vertex shader compilation failed:", gl.getShaderInfoLog(vertexShader));
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error("Fragment shader compilation failed:", gl.getShaderInfoLog(fragmentShader));
    }

    this.quadProgram = gl.createProgram()!;
    gl.attachShader(this.quadProgram, vertexShader);
    gl.attachShader(this.quadProgram, fragmentShader);
    gl.linkProgram(this.quadProgram);
    if (!gl.getProgramParameter(this.quadProgram, gl.LINK_STATUS)) {
      console.error("Quad program linking failed:", gl.getProgramInfoLog(this.quadProgram));
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // Setup quad geometry
    const quadData = new Float32Array([
      -1,  1,  0, 1,
      -1, -1,  0, 0,
       1,  1,  1, 1,
       1, -1,  1, 0,
    ]);
    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Set texture uniforms
    gl.useProgram(this.quadProgram);
    gl.uniform1i(gl.getUniformLocation(this.quadProgram, "colorSampler"), 0);
    gl.useProgram(null);
    this.checkGLError("quad program initialization");
  }

  public setRenderContext(context: Partial<RenderContext>) {
    this.context = { ...this.context, ...context };
    this.checkGLError("setRenderContext");
  }

  public getRenderContext() {
    return this.context;
  }

  public enqueue(command: IRenderCommand) {
    this.commands.push(command);
  }

  public flush() {
    const gl = this.gl;
    // console.log("Flushing", this.commands.length, "commands");
    this.commands.sort((a, b) => a.priority - b.priority);

    // Main pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboMSAA);
    const msaaStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (msaaStatus !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`MSAA framebuffer is not complete: ${this.getFramebufferStatusString(msaaStatus)}`);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return;
    }
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    // console.log("Depth test enabled:", gl.getParameter(gl.DEPTH_TEST));
    // console.log("Clear color:", gl.getParameter(gl.COLOR_CLEAR_VALUE));
    this.checkGLError("main pass setup");

    // Future: Add Shadow Mapping

    const mainCommands = this.commands.filter(cmd => cmd.priority !== RenderPass.SHADOW);
    for (const cmd of mainCommands) {
      if (cmd.validate(gl)) {
        // console.log(`Executing command with priority ${cmd.priority}`);
        cmd.execute(gl, { ...this.context});
        this.checkGLError(`main command execution (priority ${cmd.priority})`);
      } else {
        console.warn(`Main command validation failed (priority ${cmd.priority})`);
      }
    }

    // Blit to non-multisampled framebuffer
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fboMSAA);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo);
    const fboStatus = gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);
    if (fboStatus !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`FBO is not complete before blit: ${this.getFramebufferStatusString(fboStatus)}`);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return;
    }
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    // console.log("Blitting MSAA framebuffer to FBO");
    gl.blitFramebuffer(0, 0, this.width, this.height, 0, 0, this.width, this.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    this.checkGLError("blit framebuffer");
    // console.log("Blit complete");
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

    // Render quad to default framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.quadProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    this.checkGLError("quad rendering");

    this.commands = this.commands.filter(cmd => cmd.persistent);
  }

  public resize(width: number, height: number) {
    if (width <= 0 || height <= 0) {
        console.error("Invalid resize dimensions:", width, height);
        return;
    }

    this.width = width;
    this.height = height;

    // Set the WebGL viewport
    this.gl.viewport(0, 0, width, height);
    this.checkGLError("viewport resize");

    // Resize multisampled framebuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboMSAA);
    this.checkGLError("bind MSAA framebuffer");

    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.colorRenderbufferMSAA);
    this.gl.renderbufferStorageMultisample(
        this.gl.RENDERBUFFER,
        this.samples,
        this.gl.RGBA8,
        width,
        height
    );
    this.checkGLError("color renderbuffer MSAA resize");

    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthRenderbufferMSAA);
    this.gl.renderbufferStorageMultisample(
        this.gl.RENDERBUFFER,
        this.samples,
        this.gl.DEPTH_COMPONENT24,
        width,
        height
    );
    this.checkGLError("depth renderbuffer MSAA resize");

    // Re-attach renderbuffers to MSAA framebuffer
    this.gl.framebufferRenderbuffer(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.RENDERBUFFER,
        this.colorRenderbufferMSAA
    );
    this.checkGLError("attach color renderbuffer MSAA");

    this.gl.framebufferRenderbuffer(
        this.gl.FRAMEBUFFER,
        this.gl.DEPTH_ATTACHMENT,
        this.gl.RENDERBUFFER,
        this.depthRenderbufferMSAA
    );
    this.checkGLError("attach depth renderbuffer MSAA");

    // Check MSAA framebuffer status
    const msaaStatus = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (msaaStatus !== this.gl.FRAMEBUFFER_COMPLETE) {
        console.error("MSAA framebuffer incomplete:", msaaStatus);
    }

    // Resize non-multisampled framebuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
    this.checkGLError("bind non-MSAA framebuffer");

    // Create a new texture for resizing (since texStorage2D is immutable)
    this.gl.deleteTexture(this.colorTexture); // Delete old texture
    this.colorTexture = this.gl.createTexture();
    if (!this.colorTexture) {
        console.error("Failed to create color texture");
        return;
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorTexture);
    this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA8,
        width,
        height,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        null
    );
    this.checkGLError("color texture resize");

    // Set texture parameters (same as initialization)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.checkGLError("set texture parameters");

    // Attach texture to non-MSAA framebuffer
    this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.TEXTURE_2D,
        this.colorTexture,
        0
    );
    this.checkGLError("attach color texture");

    // Check non-MSAA framebuffer status
    const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
        console.error("Non-MSAA framebuffer incomplete:", status);
    }

    // Unbind framebuffer and renderbuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

  public getColorTexture(): WebGLTexture | null {
    return this.colorTexture;
  }
}