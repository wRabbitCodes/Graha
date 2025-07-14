#version 300 es
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
}