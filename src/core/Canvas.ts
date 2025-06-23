// export class Canvas {
//   public readonly gl: WebGL2RenderingContext;
//   private canvas: HTMLCanvasElement;
//   private canvasAbort: AbortController = new AbortController();
//   private resizeCallback?: () => void;
//   private mouseCallback?: (e: MouseEvent) => void;
//   private clickCallback?: (e: MouseEvent) => void;
//   private mouseMoveCallback: ((dx: number, dy: number) => void) | null = null;
//   private keyState: Record<string, boolean> = {};
//   public isPointerLockedOnCanvas: boolean = false;

import { mat4 } from "gl-matrix";

// import { GLUtils } from "./GLUtils";

//   constructor(canvasId: string) {
//     this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
//     const gl = this.canvas.getContext('webgl2');
//     if (!gl) throw new Error("WebGL2 not supported");
//     this.gl = gl;

//     // Basic config
//     gl.clearColor(0, 0, 0, 1);
//     gl.enable(gl.DEPTH_TEST);
//     gl.depthFunc(gl.LEQUAL);
//     gl.viewport(0, 0, this.canvas.width, this.canvas.height);

//     this.attachEventHandlers();
//     this.resize(); // Initial resize
//   }

//   public setUpCanvasEvents() {
//     document.addEventListener("resize", () => this.resize(), { signal: this.canvasAbort.signal });

//     document.addEventListener("pointerlockchange", () => {
//       const isLocked = document.pointerLockElement === this.canvas;
//       const crosshair = document.getElementById("crosshair");
//       if (crosshair) {
//         crosshair.style.display = isLocked ? "block" : "none";
//       }
//       if (!isLocked) {
//         this.abortInput(); // If you have your own cleanup
//       } else {
//         this.abortInput();
//         this.handleKeyboardEvents();
//         this.handleMouseEvents();
//       }
//     });

//     this.canvas.addEventListener("click", () => {
//       this.canvas.requestPointerLock({ unadjustedMovement: true });
//     });
//   }


//   private handleKeyboardEvents() {
//     document.addEventListener("keydown", e => {
//       this.keyState[e.key.toLowerCase()] = true;
//     }, { signal: this.canvasAbort.signal });

//     document.addEventListener("keyup", e => {
//       this.keyState[e.key.toLowerCase()] = false;
//     }, { signal: this.canvasAbort.signal });
//   }

//   private handleMouseEvents() {
//     document.addEventListener("mousemove", e => {
//       if (this.mouseMoveCallback) {
//         this.mouseMoveCallback(e.movementX, e.movementY);
//       }
//     }, { signal: this.canvasAbort.signal });
//   }

//   private abortInput() {
//     this.canvasAbort.abort(); // cancel all input events
//     this.canvasAbort = new AbortController(); // reinitialize for next pointer lock
//   }

//   public onMouseMove(callback: (dx: number, dy: number) => void) {
//     this.mouseMoveCallback = callback;
//   }

//   public getKeyState(): Record<string, boolean> {
//     return this.keyState;
//   }

//   private attachEventHandlers() {
//     window.addEventListener('resize', () => this.resize());
//     this.canvas.addEventListener('mousemove', (e) => this.mouseCallback?.(e));
//     this.canvas.addEventListener('click', (e) => this.clickCallback?.(e));
//   }

//   public onResize(callback: () => void) {
//     this.resizeCallback = callback;
//   }

//   public onClick(callback: (e: MouseEvent) => void) {
//     this.clickCallback = callback;
//   }

//   public resize() {
//     const dpr = window.devicePixelRatio || 1;
//     const width = Math.floor(this.canvas.clientWidth * dpr);
//     const height = Math.floor(this.canvas.clientHeight * dpr);

//     if (this.canvas.width !== width || this.canvas.height !== height) {
//       this.canvas.width = width;
//       this.canvas.height = height;
//       this.gl.viewport(0, 0, width, height);
//       this.resizeCallback?.();
//     }
//   }

//   public getWidth() {
//     return this.canvas.width;
//   }

//   public getHeight() {
//     return this.canvas.height;
//   }

//   public clear() {
//     this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
//   }

//   public getElement(): HTMLCanvasElement {
//     return this.canvas;
//   }

//   public getContext(): WebGL2RenderingContext {
//     return this.gl;
//   }

//   public getAspectRatio() {
//     return this.getWidth() / this.getHeight();
//   }
// }

export class Canvas {
  public readonly canvas: HTMLCanvasElement;
  public readonly gl: WebGL2RenderingContext;

  private isPointerLocked = false;
  private projectionMatrix = mat4.identity(mat4.create());

  constructor(id: string) {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLCanvasElement)) throw new Error("Canvas not found");

    const gl = el.getContext('webgl2');
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.canvas = el;
    this.enablePointerLock();
    this.resizeToDisplaySize();
  }

  private enablePointerLock() {
    this.canvas.addEventListener("click", () => {
      if (!this.isPointerLocked) this.canvas.requestPointerLock();
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
      mat4.perspective(this.projectionMatrix, Math.PI / 3, width/height, 0.1, 100);
    }
  }
}