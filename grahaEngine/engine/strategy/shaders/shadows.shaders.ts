export const shadowVertexShader = `#version 300 es
precision highp float;

in vec3 a_position;
uniform mat4 u_model;
uniform mat4 u_lightViewProjection;

void main() {
  vec4 scaledPos = vec4(a_position * 1e-9, 1.0); // Scale down to avoid precision issues
  gl_Position = u_lightViewProjection * u_model * scaledPos;
}`;

export const shadowFragmentShader = `#version 300 es
void main() {}
`;