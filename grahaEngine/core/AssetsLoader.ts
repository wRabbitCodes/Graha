import { GLUtils } from "../utils/GLUtils";
import { NodeIO, Texture as GltfTexture } from "@gltf-transform/core";

export interface MeshData {
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  indices?: Uint16Array | Uint32Array;
  texture?: WebGLTexture;
}

type FontConfig = {
  name: string;
  url: string;
};

type LoadConfig = {
  textures?: Record<string, string>;
  fonts?: FontConfig[];
  models?: Record<string, string>;
  json?: Record<string, string>;
};

export class AssetsLoader {
  private gl: WebGL2RenderingContext;
  private utils: GLUtils;

  private textures: Map<string, WebGLTexture> = new Map();
  private fonts: Map<string, FontFace> = new Map();
  private modelCache: Map<string, MeshData> = new Map();
  private jsonData: Map<string, any> = new Map();

  private totalAssets = 0;
  private loadedAssets = 0;

  constructor(utils: GLUtils) {
    this.gl = utils.gl;
    this.utils = utils;
  }

  async loadAll(config: LoadConfig): Promise<void> {
    const textureEntries = Object.entries(config.textures ?? {});
    const fontEntries = config.fonts ?? [];
    const modelEntries = Object.entries(config.models ?? {});

    this.totalAssets =
      textureEntries.length + fontEntries.length + modelEntries.length;
    this.loadedAssets = 0;

    const loadTasks: Promise<void>[] = [];

    for (const [name, url] of textureEntries) {
      loadTasks.push(
        this.utils
          .loadTexture(url)
          .then((texture) => {
            this.textures.set(name, texture);
          })
          .catch((err) => {
            console.error(`❌ Failed to load texture: ${name} (${url})`, err);
          })
          .finally(() => {
            this.loadedAssets++;
          })
      );
    }

    for (const { name, url } of fontEntries) {
      loadTasks.push(
        this._loadFont(name, url)
          .then((font) => {
            console.log(`Loaded font: ${name}`);
            this.fonts.set(name, font);
          })
          .catch((err) => {
            console.error(`❌ Failed to load font: ${name} (${url})`, err);
          })
          .finally(() => {
            this.loadedAssets++;
          })
      );
    }

    for (const [name, url] of modelEntries) {
      loadTasks.push(
        this.loadGLBModel(url)
          .then((mesh) => {
            this.modelCache.set(name, mesh);
          })
          .catch((err) => {
            console.error(`❌ Failed to load model: ${name} (${url})`, err);
          })
          .finally(() => {
            this.loadedAssets++;
          })
      );
    }

    const jsonEntries = Object.entries(config.json ?? {});
    this.totalAssets += jsonEntries.length;
    for (const [name, url] of jsonEntries) {
      loadTasks.push(
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error(`Failed to fetch JSON: ${url}`);
            return res.json();
          })
          .then((data) => {
            this.jsonData.set(name, data);
          })
          .catch((err) => {
            console.error(`❌ Failed to load JSON: ${name} (${url})`, err);
          })
          .finally(() => {
            this.loadedAssets++;
          })
      );
    }


    await Promise.allSettled(loadTasks);
  }

  async loadGLBModel(url: string): Promise<MeshData> {
    if (this.modelCache.has(url)) return this.modelCache.get(url)!;

    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`HTTP ${response.status} when loading ${url}`);

    const arrayBuffer = await response.arrayBuffer();
    const io = new NodeIO();
    const document = await io.readBinary(new Uint8Array(arrayBuffer));
    const mesh = document.getRoot().listMeshes()[0];
    const prim = mesh.listPrimitives()[0];

    const baseColorTex = prim.getMaterial()?.getBaseColorTexture();
    let texture: WebGLTexture | undefined = undefined;

    if (baseColorTex) {
      const imageData = baseColorTex.getImage(); // Uint8Array | null
      if (!imageData) throw new Error("Missing image data from texture");

      const blob = new Blob([imageData], {
        type: baseColorTex.getMimeType() || "image/png",
      });

      const imageBitmap = await createImageBitmap(blob);
      texture = this.utils.createTextureFromImage(imageBitmap);
    }

    const meshData: MeshData = {
      positions: prim.getAttribute("POSITION")!.getArray() as Float32Array,
      normals: prim.getAttribute("NORMAL")?.getArray() as Float32Array,
      uvs: prim.getAttribute("TEXCOORD_0")?.getArray() as Float32Array,
      indices: prim.getIndices()?.getArray() as Uint16Array | Uint32Array,
      texture,
    };

    return meshData;
  }

  getProgress(): number {
    return this.totalAssets === 0 ? 1 : this.loadedAssets / this.totalAssets;
  }

  getTexture(name: string): WebGLTexture | undefined {
    return this.textures.get(name);
  }

  getFont(name: string): FontFace | undefined {
    return this.fonts.get(name);
  }

  getJSON<T = any>(name: string): T | undefined {
    return this.jsonData.get(name);
  }
  getModel(name: string): MeshData | undefined {
    return this.modelCache.get(name);
  }

  private async _loadFont(name: string, url: string): Promise<FontFace> {
    const font = new FontFace(name, `url(${url})`);
    await font.load();
    document.fonts.add(font);
    return font;
  }
}
