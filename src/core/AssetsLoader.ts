import * as twgl from "twgl.js";

export type TextureMap = Record<string, string>;
export type FontMap = { name: string; url: string };
export type ModelMap = Record<string, string>; // key: model name, value: .glTF URL

export class AssetsLoader {
  private gl: WebGL2RenderingContext;

  private total = 0;
  private loaded = 0;

  private textureCache: Map<string, WebGLTexture> = new Map();
  private modelCache: Map<string, twgl.BufferInfo | any> = new Map(); // BufferInfo or glTF Scene

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /** Load all assets at once */
  async loadAll({
    textures = {},
    fonts = [],
    models = {},
  }: {
    textures?: TextureMap;
    fonts?: FontMap[];
    models?: ModelMap;
  }): Promise<void> {
    const textureCount = Object.keys(textures).length;
    const fontCount = fonts.length;
    const modelCount = Object.keys(models).length;
    this.total = textureCount + fontCount + modelCount;
    this.loaded = 0;

    await Promise.all([
      ...fonts.map((font) => this.loadFont(font.name, font.url)),
      ...Object.entries(textures).map(([key, url]) => this.loadTexture(key, url)),
      ...Object.entries(models).map(([key, url]) => this.loadGLTFModel(key, url)),
    ]);
  }

  /** Load and cache a texture */
  async loadTexture(name: string, url: string): Promise<void> {
    if (this.textureCache.has(url)) {
      this.loaded++;
      return;
    }
    const tex = await twgl.createTexture(this.gl, { src: url });
    this.textureCache.set(name, tex);
    this.loaded++;
  }

  /** Load a glTF model and store bufferInfo/scene */
  async loadGLTFModel(name: string, url: string): Promise<void> {
    const response = await fetch(url);
    const json = await response.json();
    // You can plug in a glTF loader here — simplified placeholder for now
    this.modelCache.set(name, json); // Replace with parsed glTF scene
    this.loaded++;
  }

  /** Load a web font */
  async loadFont(name: string, url: string): Promise<void> {
    const font = new FontFace(name, `url(${url})`);
    await font.load();
    (document as any).fonts.add(font);
    this.loaded++;
  }

  getTexture(name: string): WebGLTexture | undefined {
    return this.textureCache.get(name);
  }

  getModel(name: string): any {
    return this.modelCache.get(name);
  }

  getProgress(): number {
    return this.total === 0 ? 1 : this.loaded / this.total;
  }
}
