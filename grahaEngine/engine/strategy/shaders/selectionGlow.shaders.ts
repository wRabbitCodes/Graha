export const sVertexShader = `#version 300 es
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

export const sFragmentShader = `#version 300 es
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