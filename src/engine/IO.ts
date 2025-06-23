import { Canvas } from "../core/Canvas";

// src/engine/Input.ts
export class Input {
  private keys: Set<string> = new Set();
  private isMouseDragging = false;
  private controller?: AbortController = new AbortController();

  constructor(private canvasElement: HTMLCanvasElement) {}


  enableKeyboardInputs() {
    let signal = this.controller?.signal;
    document.addEventListener("keydown", (e) => this.keys.add(e.key), { signal });
    document.addEventListener("keyup", (e) => this.keys.delete(e.key), { signal });
  }

  enableMouseInputs(mouseMoveCallback?: (dragging :boolean, e: MouseEvent) => void) {
    let signal = this.controller?.signal;
    this.canvasElement.addEventListener("mousedown", (e) => {
        if (e.button === 0) this.isMouseDragging = true; // Left click
    }, {signal});
    
    this.canvasElement.addEventListener("mouseup", (e) => {
        if (e.button === 0) this.isMouseDragging = false; // Release left click
    }, {signal});
    
    this.canvasElement.addEventListener("mousemove", (e) => {
      if (!mouseMoveCallback) return;
      mouseMoveCallback(this.isMouseDragging, e);
    }, {signal});
  }

  disableInputs() {
    this.controller?.abort();
    this.controller = new AbortController();
  }

  getKeys() {
    return this.keys;
  }

  clear() {
    this.keys.clear();
  }
}
