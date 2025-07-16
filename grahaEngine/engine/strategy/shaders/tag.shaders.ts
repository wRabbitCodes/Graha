export const tVertexShader = `#version 300 es
    #pragma vscode_glsllint_stage: vert
    precision mediump float;

    layout(location = 0) in vec2 a_position;
    layout(location = 1) in vec2 a_uv;

    uniform mat4 u_view;
    uniform mat4 u_proj;
    uniform vec3 u_worldPos;
    uniform float u_basePixelSize;
    uniform vec2 u_viewportSize;

    out vec2 v_uv;

    void main() {
        vec3 right = vec3(u_view[0][0], u_view[1][0], u_view[2][0]);
        vec3 up    = vec3(u_view[0][1], u_view[1][1], u_view[2][1]);

        // Estimate distance from camera to label
        vec4 viewPos = u_view * vec4(u_worldPos, 1.0);
        float dist = abs(viewPos.z); // distance in view space

        // Approximate NDC pixel scale factor
        float ndcPixelSize = 2.0 / u_viewportSize.y; // NDC per pixel (height-based)

        float scale = u_basePixelSize * ndcPixelSize * dist;

        vec3 offset = a_position.x * scale * right + a_position.y * scale * up;
        vec3 finalPos = u_worldPos + offset;

        gl_Position = u_proj * u_view * vec4(finalPos, 1.0);
        v_uv = a_uv;
    }
    `;

export const tFragmentShader = `#version 300 es
    #pragma vscode_glsllint_stage: frag

    precision mediump float;

    in vec2 v_uv;
    uniform sampler2D u_text;
    uniform float u_time;

    out vec4 fragColor;

    vec3 hsv2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    void main() {
      vec4 base = texture(u_text, v_uv);
      if (base.a < 0.1) discard;

      float cycleTime = mod(u_time, 4.0);

      float brightness = 0.4; // baseline dim

      // Left to right fill phase (between 0.5 and 2.5 sec)
      if (cycleTime > 0.5 && cycleTime <= 2.5) {
        float fillProgress = (cycleTime - 0.5) / 2.0;
        if (v_uv.x <= fillProgress) {
          brightness = 1.0;
        }
      }

      // Fully lit
      if (cycleTime > 2.5 && cycleTime <= 3.5) {
        brightness = 1.0;
      }

      // Flicker off (short gap at end)
      if (cycleTime > 3.5) {
        brightness = 0.4;
      }

      // Animate hue while glowing
      float hue = mod(u_time * 0.1, 1.0);
      vec3 neonColor = hsv2rgb(vec3(hue, 0.8, 1.0));

      vec3 finalColor = mix(vec3(0.0), neonColor, brightness);
      float finalAlpha = base.a * brightness;

      fragColor = vec4(finalColor, finalAlpha);
    }
    `;