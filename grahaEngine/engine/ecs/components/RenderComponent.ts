import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { SphereMesh } from "../../../utils/GLUtils";
import { COMPONENT_STATE, IComponent, IState } from "../Component";
import { MeshData } from "@/grahaEngine/core/AssetsLoader";

export abstract class RenderComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  program: WebGLProgram | null = null;
  VAO: WebGLVertexArrayObject | null = null;
  VBO: WebGLBuffer | null = null;
}

export class PlanetRenderComponent extends RenderComponent {
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

export class AsteroidPointCloudRenderComponent extends RenderComponent {
 vertShader = `#version 300 es
    layout(location = 0) in vec3 a_position;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    void main() {
      gl_Position = u_proj * u_view * vec4(a_position, 1.0);
      gl_PointSize = 0.01; // screen-space size
    }
  `;

  fragShader = `#version 300 es
    precision mediump float;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(0.85, 0.85, 0.85, 0.95); // dusty rock color
    }
  `;
}

export class AsteroidModelRenderComponent extends RenderComponent {
  vertShader = `#version 300 es
    precision highp float;

    layout(location = 0) in vec3 a_position;
    layout(location = 1) in vec3 a_normal;
    layout(location = 2) in vec3 a_instancePos;
    layout(location = 3) in vec2 a_uv;
    layout(location = 4) in float a_instanceScale;

    uniform mat4 u_view;
    uniform mat4 u_proj;

    out vec3 v_normal;
    out vec2 v_uv;
    out vec3 v_worldPos;

    void main() {
      vec3 worldPos = a_position * a_instanceScale + a_instancePos;
      v_worldPos = worldPos;
      gl_Position = u_proj * u_view * vec4(worldPos, 1.0);

      v_normal = a_normal;
      v_uv = a_uv;
    }`;

  fragShader = `#version 300 es
    precision highp float;

    in vec3 v_normal;
    in vec2 v_uv;
    in vec3 v_worldPos;

    uniform sampler2D u_diffuse;

    out vec4 fragColor;

    void main() {
      vec3 lightDir = normalize(vec3(0.0) - v_worldPos); // from fragment to origin
      float diff = max(dot(normalize(v_normal), lightDir), 0.0);

      vec3 texColor = texture(u_diffuse, v_uv).rgb;
      vec3 color = texColor * diff + 0.1; // lighting + ambient

      fragColor = vec4(color, 1.0);
    }`;
  mesh?: Partial<MeshData>
}
