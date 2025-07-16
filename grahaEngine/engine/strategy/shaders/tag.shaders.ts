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
    uniform vec2 u_canvasSize;

    out vec2 v_uv;

    void main() {
        vec3 right = vec3(u_view[0][0], u_view[1][0], u_view[2][0]);
        vec3 up    = vec3(u_view[0][1], u_view[1][1], u_view[2][1]);

        // Compute aspect ratio of canvas
        float aspectRatio = u_canvasSize.x / u_canvasSize.y;
        // Estimate distance from camera to label
        vec4 viewPos = u_view * vec4(u_worldPos, 1.0);
        float dist = abs(viewPos.z); // distance in view space

        // Approximate NDC pixel scale factor
        float ndcPixelSize = 2.0 / u_viewportSize.y; // NDC per pixel (height-based)

        // Fixed screen-space scale based on canvas height
        float scaleY = max(u_basePixelSize * ndcPixelSize * dist, 1.5);
        float scaleX = scaleY * aspectRatio; // Adjust X scale to maintain canvas aspect ratio

        // Apply offset: a_position.y in [-0.5, 0.5], shift up by 0.5 to align bottom with worldPos
        vec3 offset = a_position.x * scaleX * right + (a_position.y + 0.5) * scaleY * up;
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
    uniform float u_fillDuration; // Duration of fill phase
    uniform float u_glowDuration; // Duration of full glow phase

    out vec4 fragColor;

    vec3 hsv2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    void main() {
      vec4 base = texture(u_text, v_uv);
      if (base.a < 0.4) discard; // Strict alpha threshold for font only

      // Total cycle duration
      float totalDuration = u_fillDuration + u_glowDuration + 1.0; // +1.0 for flicker-off
      float cycleTime = mod(u_time, totalDuration);

      float brightness = 0.4; // Baseline dim

      // Fill phase
      if (cycleTime <= u_fillDuration) {
        float fillProgress = cycleTime / u_fillDuration; // Slow fill from left to right
        if (v_uv.x <= fillProgress) {
          brightness = 1.0;
        }
      }
      // Full glow phase
      else if (cycleTime <= u_fillDuration + u_glowDuration) {
        brightness = 1.0;
      }
      // Flicker-off phase
      else {
        brightness = 0.4;
      }

      // Animate hue for neon effect
      float hue = mod(u_time * 0.05, 1.0); // Slower hue shift
      vec3 neonColor = hsv2rgb(vec3(hue, 0.8, 1.0));

      vec3 finalColor = mix(vec3(0.0), neonColor, brightness);
      float finalAlpha = base.a * brightness;

      fragColor = vec4(finalColor, finalAlpha);
    }
`;