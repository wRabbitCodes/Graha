#version 300 es
#pragma vscode_glsllint_stage : vert
precision mediump float;

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in vec3 a_tangent;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;
uniform mat3 u_normalMatrix;

out vec3 v_fragPos;
out vec3 v_normal;
out vec2 v_uv;
out mat3 v_TBN;

void main() {
    vec3 T = normalize(u_normalMatrix * a_tangent);  // Placeholder tangent
    vec3 N = normalize(u_normalMatrix * a_normal);  // Placeholder bitangent
    vec3 B = normalize(cross(N,T));

    v_TBN = mat3(T, B, N);
    v_uv = a_uv;
    vec4 worldPos = u_model * vec4(a_position, 1.0);
    v_fragPos = worldPos.xyz;
    v_normal = normalize(u_normalMatrix * a_normal);
    gl_Position = u_proj * u_view * worldPos;
}