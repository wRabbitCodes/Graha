import { SphereMesh } from "../../utils/GLUtils";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

abstract class RenderComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  program: WebGLProgram | null = null;
  VAO: WebGLVertexArrayObject | null = null;
}

export class PlanetRenderComponent extends RenderComponent {
  textures?: { [key: string]: WebGLTexture | null };
  uniformLocations: { [key: string]: WebGLUniformLocation | null }= {};  
  sphereMesh?: SphereMesh;
}

export class SkyRenderComponent extends RenderComponent {
  sphereMesh?: SphereMesh;
}

export class SunRenderComponent extends RenderComponent {}