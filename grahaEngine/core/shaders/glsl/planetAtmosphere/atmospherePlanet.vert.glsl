#version 300 es
precision mediump float;

layout(location = 0)in vec3 a_position;
layout(location = 2)in vec2 a_uv;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;

out vec2 v_uv;
out vec3 v_worldPos;

void main() {
    v_uv = a_uv;
    vec4 worldPos = u_model * vec4(a_position, 1.0);
    v_worldPos = worldPos.xyz;
    gl_Position = u_proj * u_view * worldPos;
}