export const pVertexShader = `#version 300 es
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
}`

export const pFragmentShader = `#version 300 es
#pragma vscode_glsllint_stage : frag
precision mediump float;

in vec2 v_uv;
in vec3 v_fragPos;
in vec3 v_normal;
in mat3 v_TBN;

uniform sampler2D u_surfaceTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_specularTexture;
uniform sampler2D u_atmosphereTexture;
uniform sampler2D u_nightTexture;
uniform sampler2D u_shadowMap;

uniform mat4 u_lightMatrix;

uniform bool u_useNormal;
uniform bool u_useSpecular;
uniform bool u_useAtmosphere;
uniform bool u_useNight;
uniform bool u_isMoon;

uniform float u_atmosphereRotation;

uniform vec3 u_lightPos;
uniform vec3 u_viewPos;

out vec4 fragColor;

void main() {
vec3 fallbackColor = vec3(0.4, 0.7, 1.0);
vec3 surfaceColor = texture(u_surfaceTexture, v_uv).rgb;
if (length(surfaceColor) < 0.01) surfaceColor = fallbackColor;

vec3 normal = normalize(v_normal);
if (u_useNormal) {
    vec3 sampledNormal = texture(u_normalTexture, v_uv).rgb;
    sampledNormal = normalize(sampledNormal * 2.0 - 1.0);
    normal = normalize(v_TBN * sampledNormal);
}

vec3 lightDir = normalize(u_lightPos - v_fragPos);
vec3 viewDir = normalize(u_viewPos - v_fragPos);
vec3 reflectDir = reflect(-lightDir, normal);
float diff = max(dot(normal, lightDir), 0.0);

float dayFactor = smoothstep(0.05, 0.25, diff);  // soft transition
float nightFactor = clamp(1.0 - diff, 0.0, 1.0); 
nightFactor = pow(nightFactor, 3.0);

// --- NIGHT COLOR ---
vec3 nightColor = vec3(0.0);
if (u_useNight) {
    nightColor = texture(u_nightTexture, v_uv).rgb;
}

// --- DAY LIGHTING ---
vec3 lightColor = vec3(1.0, 1.0, 0.9);
vec3 ambient = 0.05 * lightColor;
vec3 diffuse = diff * lightColor;

// SHADOW
if (u_isMoon) {
    vec4 fragPosLightSpace = u_lightMatrix * vec4(v_fragPos, 1.0);
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;
    float shadowFactor = 1.0;
    if (projCoords.x >= 0.0 && projCoords.x <= 1.0 &&
    projCoords.y >= 0.0 && projCoords.y <= 1.0 &&
    projCoords.z >= 0.0 && projCoords.z <= 1.0) {
        float closestDepth = texture(u_shadowMap, projCoords.xy).r;
        float bias = 0.001;
        shadowFactor = projCoords.z - bias > closestDepth ? 0.3 : 1.0;
    }
}


float spec = 0.0;
if (u_useSpecular && dayFactor > 0.0) {
    float specStrength = texture(u_specularTexture, v_uv).r;
    spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * specStrength * 0.8;
}

// --- DAY LIGHTED COLOR ---
vec3 dayLitColor = (ambient + diffuse) * surfaceColor + vec3(spec);

// --- FINAL BLENDING ---
vec3 finalColor = mix(nightColor, dayLitColor, dayFactor);

fragColor = vec4(finalColor, 1.0);
}`