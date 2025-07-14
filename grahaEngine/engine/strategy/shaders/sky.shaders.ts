export const vertexShader = `#version 300 es
#pragma vscode_glsllint_stage : vert
precision mediump float;
in vec3 a_position;
in vec2 a_uv;
out vec2 v_uv;
uniform mat4 u_view;
uniform mat4 u_proj;
void main() {
    v_uv = a_uv;
    vec4 pos = u_proj * u_view * vec4(a_position, 1.0);
    gl_Position = pos.xyww;
}`

export const fragmentShader = `#version 300 es
#pragma vscode_glsllint_stage : frag
precision mediump float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_texture;
void main() {
    vec3 skyColor = texture(u_texture, v_uv).rgb * 0.3; // REDUCE SKYSPHERE BRIGHTNESS
    outColor = vec4(skyColor, 1.0);
}`