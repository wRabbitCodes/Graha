#version 300 es
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
}