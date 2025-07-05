import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { Registry } from "../Registry";
import { Camera } from "../../../core/Camera";
import { vec3, mat4, vec4 } from "gl-matrix";
import { GLUtils } from "../../../utils/GLUtils";
import { Canvas } from "../../../core/Canvas";

export class FrustumCullingSystem extends System {
  constructor(
    private camera: Camera,
    private canvas: Canvas,
    registry: Registry,
    utils: GLUtils,
  ) {
    super(registry, utils);
  }
isSphereInFrustum(center: vec3, radius: number, planes: vec4[]): boolean {
  for (const plane of planes) {
    const distance =
      plane[0] * center[0] +
      plane[1] * center[1] +
      plane[2] * center[2] +
      plane[3];

    if (distance < -radius) return false;
  }
  return true;
}

  // FrustumUtils.ts
getFrustumPlanesFromMatrix(vp: mat4): vec4[] {
  const planes: vec4[] = [];
  for (let i = 0; i < 6; i++) planes.push(vec4.create());

  planes[0][0] = vp[3] + vp[0]; // left
  planes[0][1] = vp[7] + vp[4];
  planes[0][2] = vp[11] + vp[8];
  planes[0][3] = vp[15] + vp[12];

  planes[1][0] = vp[3] - vp[0]; // right
  planes[1][1] = vp[7] - vp[4];
  planes[1][2] = vp[11] - vp[8];
  planes[1][3] = vp[15] - vp[12];

  planes[2][0] = vp[3] + vp[1]; // bottom
  planes[2][1] = vp[7] + vp[5];
  planes[2][2] = vp[11] + vp[9];
  planes[2][3] = vp[15] + vp[13];

  planes[3][0] = vp[3] - vp[1]; // top
  planes[3][1] = vp[7] - vp[5];
  planes[3][2] = vp[11] - vp[9];
  planes[3][3] = vp[15] - vp[13];

  planes[4][0] = vp[3] + vp[2]; // near
  planes[4][1] = vp[7] + vp[6];
  planes[4][2] = vp[11] + vp[10];
  planes[4][3] = vp[15] + vp[14];

  planes[5][0] = vp[3] - vp[2]; // far
  planes[5][1] = vp[7] - vp[6];
  planes[5][2] = vp[11] - vp[10];
  planes[5][3] = vp[15] - vp[14];

  for (const p of planes) {
    const len = Math.hypot(p[0], p[1], p[2]);
    if (len > 0) {
      p[0] /= len;
      p[1] /= len;
      p[2] /= len;
      p[3] /= len;
    }
  }

  return planes;
}


  update(deltaTime: number): void {
    const view = this.camera.getViewMatrix();
    const projection = this.canvas.getProjectionMatrix(); // or canvas.projectionMatrix
    const vp = mat4.create();
    mat4.multiply(vp, projection, view);
    const planes = this.getFrustumPlanesFromMatrix(vp);

    for (const entity of this.registry.getEntitiesWith(ModelComponent)) {
      const model = this.registry.getComponent(entity, ModelComponent);
      if (!model || model.state !== "READY") continue;

      const center = vec3.create();
      mat4.getTranslation(center, model.modelMatrix);

      const scale = vec3.create();
      mat4.getScaling(scale, model.modelMatrix);
      const radius = Math.max(...scale) * model.boundingBoxScale;
    
      model.isVisible = this.isSphereInFrustum(center, radius, planes);

    //   console.log(`PLANET ${model.name} :: IS VISIBLE ? ${model.isVisible}`);
    }
  }
}
