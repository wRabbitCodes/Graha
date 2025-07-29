export const oVertexShader = `#version 300 es
    layout(location = 0) in vec3 a_position;
    layout(location = 1) in float a_index;

    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_proj;

    uniform float u_totalVerts;
    uniform float u_pulseStart;
    uniform float u_pulseEnd;

    out float v_alpha;
    out float v_colorT;

    void main() {
      float idx = mod(a_index, u_totalVerts);
      float pulseLength = mod(u_pulseEnd - u_pulseStart + u_totalVerts, u_totalVerts);

      // Distance from head (pulseStart) in the looped space
      float distFromStart = mod(idx - u_pulseStart + u_totalVerts, u_totalVerts);

      // Normalized distance in pulse [0.0, 1.0], outside range if not in pulse
      float t = distFromStart / pulseLength;

      // Smooth fade-in and fade-out (symmetric)
      float fade = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.9, 1.0, t));
      float inPulse = step(0.0, pulseLength - distFromStart); // 1 if inside, else 0

      v_alpha = inPulse * fade;
      v_colorT = t;

      gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
    }`;

export const  oFragmentShader = `#version 300 es
    precision mediump float;

    in float v_alpha;
    in float v_colorT;

    out vec4 fragColor;

    vec3 hue(float t) {
      float r = abs(t * 6.0 - 3.0) - 1.0;
      float g = 2.0 - abs(t * 6.0 - 2.0);
      float b = 2.0 - abs(t * 6.0 - 4.0);
      return clamp(vec3(r, g, b), 0.0, 1.0);
    }

    void main() {
      if (v_alpha < 0.01) discard;
      vec3 color = hue(v_colorT);
      fragColor = vec4(color, v_alpha);
    }`;