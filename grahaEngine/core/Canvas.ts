import { mat4 } from "gl-matrix";
import { SETTINGS } from "../config/settings";

export class Canvas {
  public readonly canvas: HTMLCanvasElement;
  public readonly gl: WebGL2RenderingContext;

  private isPointerLocked = false;
  private projectionMatrix = mat4.identity(mat4.create());
  private crosshair: HTMLElement | null;

  constructor(canvas: HTMLCanvasElement) {
    const el = canvas;
    const gl = el.getContext('webgl2', {antialias: false});
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.canvas = el;
    this.enableResizeHandler();
    this.resizeToDisplaySize();
    this.crosshair = document.getElementById("crosshair");
  }

  private enableResizeHandler() {
    window.addEventListener("resize", ()=>this.resizeToDisplaySize());
  }

  enablePointerLock(raycasterCallback: (ndcX: number, ndcY: number) => void) {
    this.canvas.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      if (!this.isPointerLocked) 
        { 
          if (this.crosshair) this.crosshair.style.display = "hidden";
          this.canvas.requestPointerLock();
        }
      else {
        if (this.crosshair) this.crosshair.style.display = "block";
        if (e.button !== 0) return;
        const rect = this.canvas.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = (1 - (e.clientY - rect.top) / rect.height) * 2 - 1;
        raycasterCallback(ndcX, ndcY);
      }
    });
  }

  getProjectionMatrix() {
    return this.projectionMatrix;
  }

  onPointerLockChange(callback: (locked: boolean) => void) {
    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas
      callback(this.isPointerLocked);
    });
  }

  resizeToDisplaySize() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(this.canvas.clientWidth * dpr);
    const height = Math.floor(this.canvas.clientHeight * dpr);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
      mat4.perspective(this.projectionMatrix, Math.PI / 4, width/height, 0.1, SETTINGS.FAR_PLANE/ SETTINGS.DISTANCE_SCALE);
    }
  }
}