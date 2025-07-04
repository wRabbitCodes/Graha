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
    const loadTasks: Promise<void>[] = [];

    const textureEntries = Object.entries(config.textures ?? {});
    const fontEntries = config.fonts ?? [];
    const modelEntries = Object.entries(config.models ?? {});

    this.totalAssets = textureEntries.length + fontEntries.length + modelEntries.length;
    this.loadedAssets = 0;

    for (const [name, url] of textureEntries) {
      loadTasks.push(
        this.utils.loadTexture(url).then((tex) => {
          this.textures.set(name, tex);
          this.loadedAssets++;
        })
      );
    }

    for (const font of fontEntries) {
      loadTasks.push(
        this._loadFont(font.name, font.url).then((fontFace) => {
          this.fonts.set(font.name, fontFace);
          this.loadedAssets++;
        })
      );
    }

    for (const [name, url] of modelEntries) {
      loadTasks.push(
        fetch(url)
          .then((res) => res.arrayBuffer())
          .then((buffer) => {
            this.models.set(name, buffer);
            this.loadedAssets++;
          })
      );
    }

    await Promise.all(loadTasks);
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
