export class IO {
  private keys: Set<string> = new Set();
  private isMouseDragging = false;
  private controller: AbortController = new AbortController();

  constructor(private canvasElement: HTMLCanvasElement) {}


  enableKeyboardInputs() {
    document.addEventListener("keydown", (e) => this.keys.add(e.key), { signal: this.controller.signal });
    document.addEventListener("keyup", (e) => this.keys.delete(e.key), { signal: this.controller.signal });
  }

  enableMouseInputs(mouseMoveCallback?: (dragging :boolean, e: MouseEvent) => void) {
    this.canvasElement.addEventListener("mousedown", (e) => {
        if (e.button === 0) this.isMouseDragging = true; // Left click
    }, {signal: this.controller.signal});
    
    this.canvasElement.addEventListener("mouseup", (e) => {
        if (e.button === 0) this.isMouseDragging = false; // Release left click
    }, {signal: this.controller.signal});
    
    this.canvasElement.addEventListener("mousemove", (e) => {
      if (!mouseMoveCallback) return;
      mouseMoveCallback(this.isMouseDragging, e);
    }, {signal: this.controller.signal});
  }

  disableInputs() {
    this.controller.abort();
    this.controller = new AbortController();
  }

  getKeys() {
    return this.keys;
  }

  clear() {
    this.keys.clear();
  }
}
