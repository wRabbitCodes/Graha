import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { SphereMesh } from "../../../utils/GLUtils";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export abstract class RenderComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  program: WebGLProgram | null = null;
  VAO: WebGLVertexArrayObject | null = null;
  VBO: WebGLBuffer | null = null;
}

export class PlanetRenderComponent extends RenderComponent {
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
  pathSegmentCount = 180;

  vertSrc = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in float a_index;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;

uniform float u_totalVerts;
uniform float u_pulseStart;
uniform float u_pulseEnd;

out float v_alpha;
out float v_colorT;

void main() {
  float idx = mod(a_index, u_totalVerts);
  float pulseLength = mod(u_pulseEnd - u_pulseStart + u_totalVerts, u_totalVerts);

  // Distance from head (pulseStart) in the looped space
  float distFromStart = mod(idx - u_pulseStart + u_totalVerts, u_totalVerts);

  // Normalized distance in pulse [0.0, 1.0], outside range if not in pulse
  float t = distFromStart / pulseLength;

  // Smooth fade-in and fade-out (symmetric)
  float fade = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.9, 1.0, t));
  float inPulse = step(0.0, pulseLength - distFromStart); // 1 if inside, else 0

  v_alpha = inPulse * fade;
  v_colorT = t;

  gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
}
`;

  fragSrc = `#version 300 es
precision mediump float;

in float v_alpha;
in float v_colorT;

out vec4 fragColor;

vec3 hue(float t) {
  float r = abs(t * 6.0 - 3.0) - 1.0;
  float g = 2.0 - abs(t * 6.0 - 2.0);
  float b = 2.0 - abs(t * 6.0 - 4.0);
  return clamp(vec3(r, g, b), 0.0, 1.0);
}

void main() {
  if (v_alpha < 0.01) discard;
  vec3 color = hue(v_colorT);
  fragColor = vec4(color, v_alpha);
}
`;

  baseVertShader = `#version 300 es
layout(location = 0) in vec3 a_position;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;

uniform float u_segmentCount;
uniform float u_planetIndex;  // planet's position index in path
uniform float u_fadeSpan;     // controls how many segments before/after will fade

out float v_alpha;

void main() {
  float index = float(gl_VertexID);
  float dist = abs(index - u_planetIndex);
  dist = min(dist, u_segmentCount - dist); // loop around

  float fade = smoothstep(0.0, u_fadeSpan, dist); // fade near planet

  v_alpha = fade;
  gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
}
`;

  baseFragShader = `#version 300 es
precision mediump float;

in float v_alpha;
out vec4 fragColor;

void main() {
  fragColor = vec4(1.0, 1.0, 1.0, v_alpha * 0.15); // white with soft alpha
}
`;

  baseProgram?: WebGLProgram;
}

export class AsteroidRenderComponent extends RenderComponent {
  vertShader = `#version 300 es
precision mediump float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;
layout(location = 3) in mat4 a_instanceModel;

uniform mat4 u_view;
uniform mat4 u_proj;

out vec3 v_normal;
out vec3 v_worldPos;
out vec2 v_uv;

void main() {
  vec4 worldPos = a_instanceModel * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  v_normal = mat3(a_instanceModel) * a_normal;
  v_uv = a_uv;
  gl_Position = u_proj * u_view * worldPos;
}
`;

  fragShader = `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec3 v_worldPos;
in vec2 v_uv;

uniform vec3 u_lightPos;
uniform bool u_hasTexture;
uniform sampler2D u_diffuse;

out vec4 outColor;

void main() {
  vec3 normal = normalize(v_normal);
  vec3 lightDir = normalize(u_lightPos - v_worldPos);
  float diff = max(dot(normal, lightDir), 0.2);

  vec3 baseColor = vec3(0.4, 0.4, 0.4);
  if (u_hasTexture) {
    baseColor = texture(u_diffuse, v_uv).rgb;
  }

  outColor = vec4(baseColor * diff, 1.0);
}
`;
}
