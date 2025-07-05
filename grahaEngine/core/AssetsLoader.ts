import { GLUtils } from "../utils/GLUtils";

type FontConfig = {
  name: string;
  url: string;
};

type LoadConfig = {
  textures?: Record<string, string>;
  fonts?: FontConfig[];
  models?: Record<string, string>;
};

export class AssetsLoader {
  private gl: WebGL2RenderingContext;
  private utils: GLUtils;

  private textures: Map<string, WebGLTexture> = new Map();
  private fonts: Map<string, FontFace> = new Map();
  private models: Map<string, ArrayBuffer> = new Map();

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

    this.totalAssets = textureEntries.length + fontEntries.length + modelEntries.length;
    this.loadedAssets = 0;

    const loadTasks: Promise<void>[] = [];

    for (const [name, url] of textureEntries) {
      loadTasks.push(
        this.utils.loadTexture(url)
          .then((texture) => {
            this.textures.set(name, texture);
            console.log(`Loaded texture: ${name}`);

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
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.arrayBuffer();
          })
          .then((buffer) => {
            this.models.set(name, buffer);
          })
          .catch((err) => {
            console.error(`❌ Failed to load model: ${name} (${url})`, err);
          })
          .finally(() => {
            this.loadedAssets++;
          })
      );
    }

    await Promise.allSettled(loadTasks);
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

  getModel(name: string): ArrayBuffer | undefined {
    return this.models.get(name);
  }

  private async _loadFont(name: string, url: string): Promise<FontFace> {
    const font = new FontFace(name, `url(${url})`);
    await font.load();
    document.fonts.add(font);
    return font;
  }
}
