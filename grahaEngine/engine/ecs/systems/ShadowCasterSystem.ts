import { System } from "../System";
import { ShadowCasterComponent } from "../components/ShadowCasterComponent";
import { ModelComponent } from "../components/ModelComponent";
import { mat4, vec3 } from "gl-matrix";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { Registry } from "../Registry";

export class ShadowCasterSystem extends System {

  constructor(registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    const entities = this.registry.getEntitiesWith(ShadowCasterComponent, ModelComponent);

    for (const entity of entities) {
      const caster = this.registry.getComponent(entity, ShadowCasterComponent);
      const model = this.registry.getComponent(entity, ModelComponent);

      // Lazy GL resource creation
      if (!caster.shadowMapTex || !caster.framebuffer) {
        this.initializeShadowResources(caster);
      }

      // Compute lightViewProj matrix (e.g., from light to target/moon direction)
      const lightPos = vec3.transformMat4(vec3.create(), [0, 0, 0], model.modelMatrix);
      const lightTarget = vec3.add(vec3.create(), lightPos, [0, 0, 1]); // looking "forward"
      const lightUp = vec3.fromValues(0, 1, 0);

      const view = mat4.lookAt(mat4.create(), lightPos, lightTarget, lightUp);
      const proj = mat4.ortho(mat4.create(), -8000, 8000, -8000, 8000, 0.1, 30000);
      mat4.multiply(caster.lightViewProj, proj, view);
    }
  }

  private initializeShadowResources(caster: ShadowCasterComponent) {
    const gl = this.utils.gl;
    const size = caster.size;

    // Depth texture
    caster.shadowMapTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, caster.shadowMapTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT16,
      size,
      size,
      0,
      gl.DEPTH_COMPONENT,
      gl.UNSIGNED_SHORT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Framebuffer
    caster.framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, caster.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      caster.shadowMapTex,
      0
    );

    // No color output
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);

    // Cleanup
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
