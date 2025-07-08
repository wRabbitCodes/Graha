import { mat4 } from "gl-matrix";

export class ShadowMap {
  framebuffer: WebGLFramebuffer;
  depthTexture: WebGLTexture;
  size: number = 1024;
  lightViewProj: mat4 = mat4.create();

  constructor(gl: WebGL2RenderingContext) {
    this.depthTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT24,
      this.size,
      this.size,
      0,
      gl.DEPTH_COMPONENT,
      gl.UNSIGNED_INT,
      null
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      this.depthTexture,
      0
    );

    // Don't render color
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);

    const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (fbStatus !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Shadow framebuffer incomplete.");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  bindForWriting() {
    const gl = this.getGL();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.size, this.size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
  }

  private getGL(): WebGL2RenderingContext {
    // You can replace this with your GLUtils reference instead if preferred
    return (document.querySelector("canvas") as HTMLCanvasElement)
      .getContext("webgl2")!;
  }
}
