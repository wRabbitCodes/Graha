export const shadowVertexShader = `#version 300 es
  #pragma vscode_glsllint_stage: vert

  layout(location=0) in vec3 aPosition;

  uniform mat4 u_model;
  uniform mat4 u_lightViewProjection;

  void main() {
      gl_Position = u_lightViewProjection * u_model * vec4(aPosition, 1.0);
  }`;

export const shadowFragmentShader = `#version 300 es
  #pragma vscode_glsllint_stage: frag
  precision mediump float;

  void main() {
      // No color output needed, depth is written automatically
  }`;