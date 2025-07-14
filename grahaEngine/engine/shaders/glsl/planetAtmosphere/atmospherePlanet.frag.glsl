#version 300 es
#pragma vscode_glsllint_stage : frag
precision mediump float;

in vec2 v_uv;
in vec3 v_worldPos;

uniform sampler2D u_atmosphereTexture;
uniform float u_rotation;       // horizontal scroll for cloud motion
uniform float u_opacity;        // base opacity of atmosphere
uniform float u_time;           // time for animation
uniform float u_fogDensity;     // controls fog thickness (e.g. 0.015)
uniform vec3 u_cameraPos;       // for depth/distance-based fog

out vec4 fragColor;

float hash(vec2 p) {
return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D pseudo-noise
float noise(vec2 uv) {
vec2 i = floor(uv);
vec2 f = fract(uv);
vec2 u = f * f * (3.0 - 2.0 * f);
return mix(
    mix(hash(i + vec2(0, 0)), hash(i + vec2(1, 0)), u.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
    u.y
);
}
void main() {
// --- Base UV rotation for clouds
vec2 rotatedUV = vec2(mod(v_uv.x + u_rotation, 1.0), v_uv.y);

// --- Add turbulence noise to UVs
float turbulence = noise(rotatedUV * 8.0 + u_time * 0.1);
vec2 distortedUV = rotatedUV + 0.01 * vec2(turbulence, turbulence);

// --- Sample cloud texture
vec3 atmosphereColor = texture(u_atmosphereTexture, distortedUV).rgb;

// --- Distance from camera (fog based on depth)
float dist = length(u_cameraPos - v_worldPos);
float fogFactor = 1.0 - exp(-pow(dist * u_fogDensity, 1.2)); // smoothstep fog
fogFactor = clamp(fogFactor, 0.0, 1.0);

// --- Fade out atmosphere based on fog and vertical latitude (optional)
float lat = abs(v_uv.y - 0.5) * 2.0;
float latFade = smoothstep(1.0, 0.6, lat); // fade near poles
float alpha = u_opacity * latFade * fogFactor;

fragColor = vec4(atmosphereColor, alpha);
}