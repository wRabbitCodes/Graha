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

export class SunRenderComponent extends RenderComponent { }

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
  state: COMPONENT_STATE = COMPONENT_STATE.UNINITIALIZED;
  size: vec2 = vec2.fromValues(5, 2.5);
  center: vec3 = vec3.create();
  color: vec4 = [0.2, 1.0, 0.8, 0.8];
  modelMatrix: mat4 = mat4.create();
  texCanvas?: HTMLCanvasElement;
  time = 0;
  flickerOffset = Math.random() * 100;
  blinkTimer = 0;
  isBlinking = false;
  pulseStrength = 0;
  pulseDecayRate = 1.5; // seconds
  isReady = false;
  texture?:WebGLTexture;
  readonly popupQuad = new Float32Array([
    // x, y,    u, v
    -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, -0.5, 0.5, 0, 1, 0.5, 0.5, 1, 1,
  ]);

  vertShader = `#version 300 es
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
    }`;
  fragShader = `#version 300 es
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
    }`;
}
