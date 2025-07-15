export const sunVertexShader = `#version 300 es
    #pragma vscode_glsllint_stage : vert

    precision mediump float;
    layout(location = 0) in vec2 a_position;

    uniform mat4 u_view;
    uniform mat4 u_proj;
    uniform vec3 u_worldPos;
    uniform float u_size;

    out vec2 v_uv;

    void main() {
      // Billboard vectors from view matrix
      vec3 right = vec3(u_view[0][0], u_view[1][0], u_view[2][0]);
      vec3 up    = vec3(u_view[0][1], u_view[1][1], u_view[2][1]);

      vec3 offset = a_position.x * right * u_size + a_position.y * up * u_size;
      vec3 worldPos = u_worldPos + offset;

      gl_Position = u_proj * u_view * vec4(worldPos, 1.0);

      v_uv = a_position * 0.5 + 0.5; // Map from [-1,1] to [0,1]
    }

`;
export const sunFragmentShader = `#version 300 es
  #pragma vscode_glsllint_stage : frag

  precision mediump float;
  uniform sampler2D u_lensflare;
  out vec4 fragColor;

  in vec2 v_uv;

  void main() {
    fragColor = texture(u_lensflare, v_uv);
  }
`;