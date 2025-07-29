// Vertex shader for the orbit trail
export const otVertexShader = `#version 300 es
  precision mediump float;

  in vec3 a_position;
  in float a_progress;

  uniform mat4 u_mvpMatrix;
  uniform bool u_isMoon;
  uniform vec3 u_parentPosition;

  out float v_progress;

  void main() {
    vec3 worldPosition = a_position;
    if (u_isMoon) {
      worldPosition += u_parentPosition;
    }

    gl_Position = u_mvpMatrix * vec4(worldPosition, 1.0);
    v_progress = a_progress;
  }`;

// Fragment shader with fading effect
export const otFragmentShader = `#version 300 es
  precision mediump float;

  in float v_progress;
  uniform vec3 u_color;
  uniform float u_headProgress;

  out vec4 outColor;

  void main() {
    // Trail progress is now "behind" the planet's current position
    float trailProgress = mod(u_headProgress - v_progress + 1.0, 1.0) * 2.0;

    float opacity = 0.0;
    if (trailProgress < 0.25) {
      opacity = 1.0;
    } else if (trailProgress < 0.5) {
      opacity = 1.0 - (trailProgress - 0.25) / 0.25;
    } else {
      discard;
    }

    outColor = vec4(u_color, opacity);
  }`;
