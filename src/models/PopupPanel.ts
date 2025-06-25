import { mat4, vec3, vec2, vec4 } from "gl-matrix";
import { GLUtils } from "../core/GLUtils";

export class Popup {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private utils: GLUtils;
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private texture?: WebGLTexture;

  private size: vec2 = vec2.fromValues(5, 2.5);
  private center: vec3 = vec3.create();
  private color: vec4 = [0.2, 1.0, 0.8, 0.8];
  private modelMatrix: mat4 = mat4.create();
  private texCanvas?: HTMLCanvasElement;
  private time = 0;
  private flickerOffset = Math.random() * 100;
  private blinkTimer = 0;
  private isBlinking = false;
  private pulseStrength = 0;
  private pulseDecayRate = 1.5; // seconds
  private isReady = false;

  private static readonly popupQuad = new Float32Array([
    // x, y,    u, v
    -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, -0.5, 0.5, 0, 1, 0.5, 0.5, 1, 1,
  ]);

  async loadLocalFont(fontName: string, url: string) {
    const font = new FontFace(fontName, `url("${url}")`);
    await font.load();
    (document as any).fonts.add(font);
  }

  constructor(gl: WebGL2RenderingContext, utils: GLUtils) {
    this.gl = gl;
    this.utils = utils;

    this.program = utils.createProgram(
      `#version 300 es
      precision mediump float;
      layout(location = 0) in vec2 a_position;
      layout(location = 1) in vec2 a_uv;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_proj;

      out vec2 v_uv;

      void main() {
        v_uv = a_uv;
        vec4 world = u_model * vec4(a_position, 0.0, 1.0);
        gl_Position = u_proj * u_view * world;
      }`,

      `#version 300 es
precision mediump float;

in vec2 v_uv;
uniform sampler2D u_text;
uniform float u_time;
uniform float u_offset;
uniform float u_pulse;
uniform int u_blinking;

out vec4 fragColor;

vec3 hsv2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

void main() {
  vec4 base = texture(u_text, v_uv);
  if (base.a < 0.1) discard;

  float t = u_time + u_offset;

  // Color hue cycling
  float hue = mod(t * 0.1 + v_uv.x * 0.1, 1.0);
  vec3 glowColor = hsv2rgb(vec3(hue, 0.8, 1.0));

  // Radial halo
  float dist = length(v_uv - vec2(0.5));
  float halo = smoothstep(0.45, 0.0, dist);

  // Flicker base using sin
  float flicker = 0.85 + 0.15 * sin(t * 6.0 + sin(t * 1.2));

  // Blink override
  float intensity = (u_blinking == 1) ? 0.0 : flicker;

  // Pulse boost
  intensity += u_pulse * 0.5;

  vec3 finalColor = mix(base.rgb, glowColor, 0.5) * intensity;
  float alpha = base.a * intensity + halo * 0.4;

  fragColor = vec4(finalColor, alpha);
}


    `
    );

    this.vao = gl.createVertexArray()!;
    this.buffer = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, Popup.popupQuad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    this.createTextTexture("Hello Planet").then(() => (this.isReady = true));
  }

 async createTextTexture(text: string) {
    const canvas = document.createElement("canvas");
    this.texCanvas = canvas;
    canvas.width = 512;
    canvas.height = 128;

    // Load the local font
    await this.loadLocalFont("NeonSans", `fonts/NeonSans.ttf`);

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background fill
    ctx.fillStyle = "rgba(10, 10, 30, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // === Text Settings ===
    const fontSize = 48;
    ctx.font = `bold ${fontSize}px NeonSans`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const textX = canvas.width / 2;
    const textY = canvas.height / 2;

    // === Glow-only outline ===
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "transparent"; // no fill for base text
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.strokeText(text, textX, textY); // glow from stroke

    // === Black border behind fill ===
    ctx.shadowBlur = 0; // disable shadow temporarily
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeText(text, textX, textY); // black outline

    // === Fill with neon cyan ===
    ctx.fillStyle = "#00ffff";
    ctx.fillText(text, textX, textY); // filled core

    // === Border frame around canvas (optional) ===
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 12;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // === Upload to GPU ===
    const tex = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.texture = tex;
  }

  setSizeRelativeToPlanet(radius: number) {
    const widthRatio = 6; // Width is 1.5× radius
    const heightRatio = 3; // Height is 0.75× radius
    vec2.set(this.size, radius * widthRatio, radius * heightRatio);
  }

  // Trigger a click pulse
  triggerPulse() {
    this.pulseStrength = 1.0;
  }

  // Update each frame
  update(dt: number) {
    this.time += dt / 1000;

    // === Random Hard Blinks ===
    this.blinkTimer -= dt / 10;
    if (this.blinkTimer <= 0) {
      // 5% chance every 1.5s to blink
      if (Math.random() < 0.05) {
        this.isBlinking = true;
        this.blinkTimer = 3; // off for 50ms
      } else {
        this.isBlinking = false;
        this.blinkTimer = 1.5;
      }
    }
    this.triggerPulse();
    // === Pulse fade out ===
    if (this.pulseStrength > 0) {
      this.pulseStrength -= (dt / 1000) * this.pulseDecayRate;
      this.pulseStrength = Math.max(this.pulseStrength, 0);
    }
  }

  updatePopupPosition(planetPosition: vec3, offsetY = 3.0) {
    const popupPos = vec3.create();
    vec3.set(
      popupPos,
      planetPosition[0],
      planetPosition[1] + offsetY + this.texCanvas?.height!,
      planetPosition[2]
    );
    mat4.fromTranslation(this.modelMatrix, popupPos);
  }

  draw(proj: mat4, view: mat4, cameraPos: vec3) {
    if (!this.isReady || !this.texture) return;

    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST); // Optional: to render over planets

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Billboard logic — rotate to face camera
    const billboard = mat4.create();
    const viewInverse = mat4.invert(mat4.create(), view)!;

    // Use only rotation part (upper-left 3x3)
    for (let i = 0; i < 3; ++i)
      for (let j = 0; j < 3; ++j) billboard[i * 4 + j] = viewInverse[i * 4 + j];

    // Combine translation (from modelMatrix) + billboard rotation
    const finalModel = mat4.create();
    mat4.multiply(finalModel, this.modelMatrix, billboard); // T * R
    mat4.scale(finalModel, finalModel, [this.size[0], this.size[1], 1]); // apply size

    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_model"),
      false,
      finalModel
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_view"),
      false,
      view
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_proj"),
      false,
      proj
    );

    gl.uniform1f(gl.getUniformLocation(this.program, "u_time"), this.time);
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_offset"),
      this.flickerOffset
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_pulse"),
      this.pulseStrength
    );
    gl.uniform1i(
      gl.getUniformLocation(this.program, "u_blinking"),
      this.isBlinking ? 1 : 0
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_text"), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }
}
