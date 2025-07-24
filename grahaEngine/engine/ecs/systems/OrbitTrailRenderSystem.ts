import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { mat4, vec3 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { Renderer, RenderPass } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { OrbitComponent } from "../components/OrbitComponent";
import { OrbitTrailComponent } from "../components/OrbitTrialComponent";
import { Entity } from "../Entity";
import { Registry } from "../Registry";
import { System } from "../System";
import { MoonComponent } from "../components/MoonComponent";
import { ModelComponent } from "../components/ModelComponent";

// Vertex shader for the orbit trail
const vertexShaderSource = `#version 300 es
  precision highp float;

  in vec3 a_position;
  in float a_opacity;

  uniform mat4 u_mvpMatrix;
  uniform bool u_isMoon;
  uniform vec3 u_parentPosition;

  out float v_opacity;

  void main() {
    vec3 worldPosition = a_position;
    if (u_isMoon) {
      worldPosition += u_parentPosition;
    }

    gl_Position = u_mvpMatrix * vec4(worldPosition, 1.0);
    v_opacity = a_opacity;
  }`;

// Fragment shader with fading effect
const fragmentShaderSource = `#version 300 es
  precision highp float;

  in float v_opacity;
  uniform vec3 u_color;

  out vec4 outColor;

  void main() {
    outColor = vec4(u_color, v_opacity);
  }`;

class OrbitTrailStrategy {
  private program: WebGLProgram | null = null;

  constructor(private utils: GLUtils) { }

  initialize(): void {
    this.program = this.utils.createProgram(vertexShaderSource, fragmentShaderSource);
    if (!this.program) {
      console.error('Failed to create orbit trail program');
    } else {
      console.log('Orbit trail program created successfully');
    }
  }

  getProgram(): WebGLProgram | null {
    return this.program;
  }

  setBindings(gl: WebGL2RenderingContext, ctx: RenderContext, components: {
    trailComp: OrbitTrailComponent,
  }): void {
    if (!this.program) {
      console.error('No program available for orbit trail');
      return;
    }

    const { trailComp } = components;

    // Set up vertex attributes
    const positionLoc = gl.getAttribLocation(this.program, 'a_position');
    const opacityLoc = gl.getAttribLocation(this.program, 'a_opacity');
    const isMoonLoc = gl.getUniformLocation(this.program, 'u_isMoon');
    const parentPosLoc = gl.getUniformLocation(this.program, 'u_parentPosition');
    const mvpLoc = gl.getUniformLocation(this.program, 'u_mvpMatrix');
    const colorLoc = gl.getUniformLocation(this.program, 'u_color');

    
    // Compute MVP matrix (no model translation since pathPoints are in world space)
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, ctx.projectionMatrix, ctx.viewMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, trailComp.positionBuffer);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0); // Tightly packed positions
    gl.enableVertexAttribArray(positionLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, trailComp.opacityBuffer);
    gl.vertexAttribPointer(opacityLoc, 1, gl.FLOAT, false, 0, 0); // Tightly packed opacities
    gl.enableVertexAttribArray(opacityLoc);
  
    gl.uniformMatrix4fv(mvpLoc, false, mvpMatrix);
    gl.uniform3fv(colorLoc, trailComp.getColorAsVec3());
    gl.uniform1i(isMoonLoc, !!trailComp.parentPosition ? 1 : 0);
    gl.uniform3fv(parentPosLoc, trailComp.parentPosition || [0, 0, 0]);

    // Debug: Log matrix and color
    console.log('MVP Matrix:', mvpMatrix);
    console.log('Trail Color:', trailComp.color);
  }
}

export class OrbitTrailRenderSystem extends System {
  private trailStrategy: OrbitTrailStrategy;

  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
    this.trailStrategy = new OrbitTrailStrategy(utils);
    this.trailStrategy.initialize();
  }

  update(deltaTime: number): void {
    const entities = this.registry.getEntitiesWith(OrbitComponent);

    console.log(`Processing ${entities.length} entities with orbit trails`);

    for (const entity of entities) {
      const orbitComp = this.registry.getComponent(entity, OrbitComponent)!;
      let trailComp = this.registry.getComponent(entity, OrbitTrailComponent)!;
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if (!trailComp) {
        trailComp = new OrbitTrailComponent();
        this.registry.addComponent(entity, trailComp);
      }

      if (trailComp.state === COMPONENT_STATE.UNINITIALIZED) {
        console.log(`Initializing trail for entity ${entity}`);
        this.initializeTrail(entity, trailComp, orbitComp);
        trailComp.color = modelComp.baseColor;
      }

      if (trailComp.state !== COMPONENT_STATE.READY || orbitComp.state !== COMPONENT_STATE.READY) {
        console.warn(`Skipping entity ${entity}: trailComp.state=${trailComp.state}, orbitComp.state=${orbitComp.state}`);
        continue;
      }

      const moonComp = this.registry.getComponent(entity, MoonComponent);
      if (moonComp) {
        const parentComp = this.registry.getComponent(moonComp.parentEntity, ModelComponent);
        trailComp.parentPosition = vec3.clone(parentComp.position);  // store in trailComp
      } else {
        trailComp.parentPosition = undefined;
      }
      // Update trail points and get the actual number of points
      const actualPointCount = this.updateTrailPoints(entity, trailComp, orbitComp);

      if (actualPointCount < 2) {
        console.warn(`Not enough points (${actualPointCount}) to draw trail for entity ${entity}`);
        continue;
      }

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          if (!trailComp.program || !trailComp.vao) {
            console.error(`Invalid program or VAO for entity ${entity}`);
            return;
          }

          gl.useProgram(trailComp.program);
          gl.bindVertexArray(trailComp.vao);

          this.trailStrategy.setBindings(gl, ctx, { trailComp });

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

          console.log(`Drawing trail for entity ${entity} with ${actualPointCount} points`);
          gl.drawArrays(gl.LINE_STRIP, 0, actualPointCount);

          gl.disable(gl.BLEND);
          gl.bindVertexArray(null);
          gl.useProgram(null);
        },
        validate: (gl: WebGL2RenderingContext) => {
          const valid = !!trailComp.program && !!trailComp.vao && gl.getProgramParameter(trailComp.program!, gl.LINK_STATUS);
          if (!valid) {
            console.error(`Validation failed for entity ${entity}: program=${!!trailComp.program}, vao=${!!trailComp.vao}, linked=${trailComp.program ? gl.getProgramParameter(trailComp.program!, gl.LINK_STATUS) : false}`);
          }
          return valid;
        },
        priority: RenderPass.TRANSPARENT,
        shaderProgram: trailComp.program,
        persistent: false,
      });
    }
  }

  private initializeTrail(entity: Entity, trailComp: OrbitTrailComponent, orbitComp: OrbitComponent): void {
    trailComp.state = COMPONENT_STATE.LOADING;
    trailComp.orbitPoints = [...orbitComp.pathPoints];
    const gl = this.utils.gl;

    // Create and set up VAO
    trailComp.vao = gl.createVertexArray()!;
    gl.bindVertexArray(trailComp.vao);

    // Create position and opacity buffers
    trailComp.positionBuffer = gl.createBuffer()!;
    trailComp.opacityBuffer = gl.createBuffer()!;

    // Initialize with empty buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, trailComp.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, trailComp.pointCount * 3 * 4, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, trailComp.opacityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, trailComp.pointCount * 4, gl.DYNAMIC_DRAW);

    trailComp.program = this.trailStrategy.getProgram();
    trailComp.state = COMPONENT_STATE.READY;

    gl.bindVertexArray(null);
    console.log(`Trail initialized for entity ${entity} with ${trailComp.pointCount} points`);
  }

  private updateTrailPoints(entity: Entity, trailComp: OrbitTrailComponent, orbitComp: OrbitComponent): number {
    const gl = this.utils.gl;
    const entityName = this.registry.getNameFromEntityID(entity.id);
    // Calculate trail points (most recent at head, fading toward tail)
    const positions: number[] = [];
    const opacities: number[] = [];

    const totalPoints = trailComp.orbitPoints.length / 3;
    if (totalPoints < 2) {
      console.warn(`Insufficient pathPoints (${totalPoints}) for entity ${entityName}`);
      return 0;
    }

    const trailLength = Math.min(trailComp.pointCount, totalPoints);

    // Get current position index

    const currentIndex = Math.floor(orbitComp.headProgress * totalPoints);

    // Collect points for the trail, starting from current position and going backward
    for (let i = 0; i < trailLength; i++) {
      if (i === 0) {
        // Use the planet's current position for the first point
        positions.push(
          orbitComp.headPosition[0],
          orbitComp.headPosition[1],
          orbitComp.headPosition[2]
        );
      } else {
        const idx = ((currentIndex - i + totalPoints) % totalPoints) * 3;
        if (idx >= trailComp.orbitPoints.length || idx < 0) {
          console.warn(`Invalid pathPoints index ${idx} for entity ${entity}`);
          continue;
        }
        positions.push(
          trailComp.orbitPoints[idx],
          trailComp.orbitPoints[idx + 1],
          trailComp.orbitPoints[idx + 2]
        );
      }

      // Linearly interpolate opacity from 1.0 at head to 0.0 at tail
      opacities.push(1.0 - (i / (trailLength - 1)));
    }

    // Ensure we have enough points to draw a line strip
    if (positions.length < 6) { // At least 2 vertices (6 floats) needed
      console.warn(`Not enough valid trail points (${positions.length / 3}) for entity ${entity}`);
      return 0;
    }

    // Update buffers
    // gl.bindBuffer(gl.ARRAY_BUFFER, trailComp.positionBuffer);
    // gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(positions));

    // gl.bindBuffer(gl.ARRAY_BUFFER, trailComp.opacityBuffer);
    // gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(opacities));

    console.log(`Updated ${positions.length / 3} trail points for entity ${entity}`);
    return positions.length / 3; // Return the actual number of vertices
  }
}