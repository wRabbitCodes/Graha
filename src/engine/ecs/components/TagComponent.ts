import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class TagComponent implements IComponent, IState {
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
