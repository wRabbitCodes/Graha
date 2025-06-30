import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { SphereMesh } from "../../../utils/GLUtils";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export abstract class RenderComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  program: WebGLProgram | null = null;
  VAO: WebGLVertexArrayObject | null = null;
}

export class PlanetRenderComponent extends RenderComponent {
  textures?: { [key: string]: WebGLTexture | null };
  uniformLocations: { [key: string]: WebGLUniformLocation | null } = {};
  sphereMesh?: SphereMesh;
  atmosphereProgram?: WebGLProgram;
}

export class SkyRenderComponent extends RenderComponent {
  sphereMesh?: SphereMesh;
}

export class SunRenderComponent extends RenderComponent {
  sphereMesh?: SphereMesh;
  coreVAO: WebGLVertexArrayObject | null = null;
  coreProgram: WebGLProgram | null = null;
}

export class SelectionGlowRenderComponent extends RenderComponent {
  vertShader = `#version 300 es
    #pragma vscode_glsllint_stage : vert
    layout(location = 0) in vec3 a_position;

    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_proj;

    out vec3 v_worldPos;
    out vec3 v_normal;

    void main() {
        vec4 worldPos = u_model * vec4(a_position, 1.0);
        v_worldPos = worldPos.xyz;

        // Normal from model matrix (assuming uniform scale)
        v_normal = mat3(u_model) * a_position;

        gl_Position = u_proj * u_view * worldPos;
  }`;

  fragShader = `#version 300 es
    #pragma vscode_glsllint_stage : frag
    precision mediump float;

    in vec3 v_worldPos;
    in vec3 v_normal;

    uniform vec3 u_cameraPos;

    out vec4 fragColor;

    void main() {
        vec3 viewDir = normalize(u_cameraPos - v_worldPos);
        vec3 normal = normalize(v_normal);

        // Fresnel term (dot gets small at edges)
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.0);

        // Smooth gradient and color
        vec3 glowColor = vec3(0.1, 0.8, 1.0); // Cyan-ish
        fragColor = vec4(glowColor * fresnel, fresnel * 0.8); // Alpha also scales with fresnel
  }`;
}

export class TagRenderComponent extends RenderComponent {
  currentText = "";
  size: vec2 = vec2.fromValues(5, 2.5);
  center: vec3 = vec3.create();
  color: vec4 = [0.2, 1.0, 0.8, 0.8];
  modelMatrix: mat4 = mat4.create();
  textCanvas?: HTMLCanvasElement;
  time = 0;
  flickerOffset = Math.random() * 100;
  // blinkTimer = 0;
  // isBlinking = false;
  // pulseStrength = 0;
  // pulseDecayRate = 1.5; // seconds
  // isReady = false;
  texture?: WebGLTexture;
  readonly popupQuad = new Float32Array([
    // x, y,    u, v
    -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, -0.5, 0.5, 0, 1, 0.5, 0.5, 1, 1,
  ]);

  vertShader = `#version 300 es
    precision mediump float;

    layout(location = 0) in vec2 a_position;
    layout(location = 1) in vec2 a_uv;

    uniform mat4 u_view;
    uniform mat4 u_proj;
    uniform vec3 u_worldPos;
    uniform float u_basePixelSize;
    uniform vec2 u_viewportSize;

    out vec2 v_uv;

    void main() {
        vec3 right = vec3(u_view[0][0], u_view[1][0], u_view[2][0]);
        vec3 up    = vec3(u_view[0][1], u_view[1][1], u_view[2][1]);

        // Estimate distance from camera to label
        vec4 viewPos = u_view * vec4(u_worldPos, 1.0);
        float dist = abs(viewPos.z); // distance in view space

        // Approximate NDC pixel scale factor
        float ndcPixelSize = 2.0 / u_viewportSize.y; // NDC per pixel (height-based)

        float scale = u_basePixelSize * ndcPixelSize * dist;

        vec3 offset = a_position.x * scale * right + a_position.y * scale * up;
        vec3 finalPos = u_worldPos + offset;

        gl_Position = u_proj * u_view * vec4(finalPos, 1.0);
        v_uv = a_uv;
    }
    `;

  fragShader = `#version 300 es
    precision mediump float;

    in vec2 v_uv;
    uniform sampler2D u_text;
    uniform float u_time;

    out vec4 fragColor;

    vec3 hsv2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    void main() {
      vec4 base = texture(u_text, v_uv);
      if (base.a < 0.1) discard;

      float cycleTime = mod(u_time, 4.0);

      float brightness = 0.4; // baseline dim

      // Left to right fill phase (between 0.5 and 2.5 sec)
      if (cycleTime > 0.5 && cycleTime <= 2.5) {
        float fillProgress = (cycleTime - 0.5) / 2.0;
        if (v_uv.x <= fillProgress) {
          brightness = 1.0;
        }
      }

      // Fully lit
      if (cycleTime > 2.5 && cycleTime <= 3.5) {
        brightness = 1.0;
      }

      // Flicker off (short gap at end)
      if (cycleTime > 3.5) {
        brightness = 0.4;
      }

      // Animate hue while glowing
      float hue = mod(u_time * 0.1, 1.0);
      vec3 neonColor = hsv2rgb(vec3(hue, 0.8, 1.0));

      vec3 finalColor = mix(vec3(0.0), neonColor, brightness);
      float finalAlpha = base.a * brightness;

      fragColor = vec4(finalColor, finalAlpha);
    }
    `;
}

export class BBPlotRenderComponent extends RenderComponent {
  vertexShader = `#version 300 es
    precision highp float;
    layout(location = 0) in vec3 a_position;
    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    void main() {
      gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
    }
  `;

  fragmentShader = `#version 300 es
    precision mediump float;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(1.0, 0.0, 0.0, 1.0); // red wireframe
    }
  `;

  sphereMesh?: SphereMesh;
}

export class OrbitPathRenderComponent extends RenderComponent {
  vertSrc = `#version 300 es
    #pragma vscode_glsllint_stage : vert
    precision mediump float;
    layout(location = 0) in vec3 a_position;
    uniform mat4 u_model, u_view, u_proj;
    void main() {
      gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
    }
  `;

  fragSrc = `#version 300 es
    #pragma vscode_glsllint_stage : frag
    precision mediump float;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(1.0, 1.0, 1.0, 0.6); // white translucent orbit
    }
  `;

  pathVertices: number[] = [];
  perihelion = vec3.create();
  aphelion = vec3.create();
}
