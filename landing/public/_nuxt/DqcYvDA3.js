import { l as loader, c as component, a as camera, g as getDebugView } from './CxCVxjwk.js';
import './BDldtTB4.js';
import { ap as Vector2, aq as LinearFilter, ar as NearestFilter, as as ClampToEdgeWrapping, at as HalfFloatType, au as RGBAFormat, av as NoColorSpace, aw as RenderTarget, ax as Color, ay as Vector3, az as Scene, e as dispatcherSingleton, O as gsapWithCSS, U as store, aA as RepeatWrapping, aB as PerspectiveCamera, ao as mapTo, aC as ACESFilmicToneMapping, aD as NeutralToneMapping, aE as AgXToneMapping, aF as CineonToneMapping, aG as ReinhardToneMapping, aH as LinearToneMapping, aI as NoToneMapping } from '#entry';
import { n as nodeObject, T as TempNode, u as uniform, p as passTexture, N as NodeUpdateType, Q as QuadMesh, R as RendererUtils, F as Fn, a as uv, v as vec2, t as texture, f as float, l as length, c as clamp, b as vec4, I as If, d as abs, e as exp, g as dot, h as vec3, i as NodeMaterial, j as cos, s as sin, k as smoothstep, m as mix, o as pass, q as blendDodge, r as NodeUpdateType$1, w as luminance, x as uniformArray, L as Loop, y as int, z as add, A as convertToTexture, B as degrees, C as rand, D as unpremultiplyAlpha, E as premultiplyAlpha, P as PostProcessing, W as WebGPURenderer } from './BBM5j2y-.js';
import { g as getSceneSheet, d as distExports } from './Bw-OgUHK.js';

/**
 * SmokeNodeRTT.js
 *
 * GPU fluid simulation using a render-to-texture (RTT) approach.
 * Implements an incompressible Navier-Stokes solver on the GPU via a series
 * of fullscreen quad passes, each advancing one step of the simulation.
 *
 * **Algorithm Overview (per frame)**
 * 1. Splat  — inject velocity + density at the pointer position
 * 2. Curl   — compute vorticity (scalar curl) of the velocity field
 * 3. Vorticity confinement — amplify small-scale swirls to prevent numerical diffusion
 * 4. Divergence — measure how much fluid is "piling up" at each cell
 * 5. Pressure (Jacobi iterations) — solve for pressure that will correct the divergence
 * 6. Gradient subtract — subtract ∇pressure from velocity → divergence-free field
 * 7. Advect velocity — self-advect the velocity field (semi-Lagrangian)
 * 8. Advect density — advect the dye/smoke texture along the velocity field
 *
 * **Ping-Pong Buffering**
 * Every field that is both read and written in the same pass uses a double-buffer
 * (DoubleBuffer) — one texture is sampled, the result is written to the other,
 * then they are swapped. Fields that are only written once per step (curl, divergence)
 * use a SingleBuffer.
 *
 * **Usage**
 * ```js
 * import { smokeRTT } from './SmokeNodeRTT.js';
 *
 * const pointer = uniform(new THREE.Vector2());
 * const smoke = smokeRTT(pointer);
 *
 * // In your render loop, update pointer.value from mouse/touch input.
 * // Use smoke.getTextureNode() as an emissiveNode or map it however you like.
 * mesh.material.emissiveNode = smoke.getTextureNode();
 * ```
 *
 * @module SmokeNodeRTT
 */


// ============================================================================
// Buffer Helpers
// ============================================================================

/**
 * A ping-pong double-buffer backed by two RenderTargets.
 *
 * Every field that is read and written in the same pass needs two textures.
 * After each render pass the caller calls `swap()` to flip which is "read"
 * and which is "write". `phase` tracks the current orientation.
 */
class DoubleBuffer {
  constructor({
    width = 1,
    height = 1,
    format = RGBAFormat,
    type = HalfFloatType,
    minFilter = LinearFilter,
    magFilter = LinearFilter,
    wrapS = ClampToEdgeWrapping,
    wrapT = ClampToEdgeWrapping,
    generateMipmaps = false
  } = {}) {
    this._config = {
      colorSpace: NoColorSpace,
      format,
      type,
      minFilter,
      magFilter,
      wrapS,
      wrapT,
      generateMipmaps,
      depthBuffer: false
    };
    this.read = null;
    this.write = null;
    this.phase = false;
    this.setSize(width, height);
  }

  _createRT(width, height) {
    const rt = new RenderTarget(width, height, this._config);
    rt.texture.colorSpace = NoColorSpace;
    return rt
  }

  setSize(width, height) {
    this.read && this.read.dispose();
    this.write && this.write.dispose();
    this.width = width;
    this.height = height;
    this.read = this._createRT(width, height);
    this.write = this._createRT(width, height);
    this.phase = true;
  }

  /** Flip read ↔ write. */
  swap() {
    this.phase = !this.phase;
  }

  dispose() {
    this.read && this.read.dispose();
    this.write && this.write.dispose();
    this.read = null;
    this.write = null;
  }
}

/**
 * A single RenderTarget for fields that are written once and only read
 * by subsequent passes (curl, divergence).
 */
class SingleBuffer {
  constructor({
    width = 1,
    height = 1,
    format = RGBAFormat,
    type = HalfFloatType,
    minFilter = NearestFilter,
    magFilter = NearestFilter,
    wrapS = ClampToEdgeWrapping,
    wrapT = ClampToEdgeWrapping,
    generateMipmaps = false
  } = {}) {
    this._config = {
      colorSpace: NoColorSpace,
      format,
      type,
      minFilter,
      magFilter,
      wrapS,
      wrapT,
      generateMipmaps,
      depthBuffer: false
    };
    this.rt = null;
    this.setSize(width, height);
  }

  setSize(width, height) {
    this.rt && this.rt.dispose();
    this.width = width;
    this.height = height;
    this.rt = new RenderTarget(width, height, this._config);
    this.rt.texture.colorSpace = NoColorSpace;
  }

  get texture() {
    return this.rt.texture
  }

  dispose() {
    this.rt && this.rt.dispose();
    this.rt = null;
  }
}

// ============================================================================
// Fluid Simulation Shader Passes (TSL)
// ============================================================================

/**
 * Collection of TSL fragment functions — one per simulation step.
 * Each is compiled into a NodeMaterial and rendered as a fullscreen quad pass.
 */
const fluidShaders = {
  /**
   * Splat velocity — inject a Gaussian force blob at `point`.
   * Reads existing velocity and adds the impulse on top.
   * Clamps final speed to 500 to prevent blow-up.
   */
  splatVelocity: Fn(({ readTex, size, point, radius, force }) => {
    const texCoord = uv();

    // UV offset from the splat point, aspect-corrected
    const offset = vec2(texCoord.sub(point)).toVar();
    offset.x.mulAssign(size.x.div(size.y));

    // Gaussian falloff: e^(-|offset|² / (radius/100))
    const gaussian = float(
      exp(
        dot(offset, offset)
          .negate()
          .div(radius.div(float(100)))
      )
    );

    // Add scaled impulse to existing velocity
    const vel = texture(readTex, texCoord).xy.add(
      vec2(force.x.mul(gaussian), force.y.mul(gaussian))
    );

    // Clamp speed to avoid blow-up (hard cap at 500)
    const maxSpeed = float(500);
    const speed = length(vel);
    const clampedVel = vel.mul(clamp(maxSpeed.div(speed.max(maxSpeed)), 0, 1));

    return vec4(clampedVel, 0, 1)
  }),

  /**
   * Splat density — inject dye (RGB) + brightness at `point`.
   * Adds a Gaussian blob of colour to the existing density field.
   */
  splatDensity: Fn(({ readTex, size, point, radius, force }) => {
    const texCoord = uv();

    // Aspect-corrected offset
    const offset = vec2(texCoord.sub(point)).toVar();
    offset.x.mulAssign(size.x.div(size.y));

    // Gaussian falloff
    const gaussian = float(
      exp(
        dot(offset, offset)
          .negate()
          .div(radius.div(float(100)))
      )
    );

    // Add coloured blob (force.x, force.y, 1.0) * gaussian to existing RGB
    const existingDensity = texture(readTex, texCoord).rgb;
    const blob = vec3(force.x.mul(gaussian), force.y.mul(gaussian), gaussian);

    return vec4(existingDensity.add(blob), 1)
  }),

  /**
   * Curl (vorticity scalar) — computes the 2D curl of the velocity field:
   * `curl = ∂vy/∂x - ∂vx/∂y`
   * Stored as a single-channel texture used in the vorticity confinement pass.
   */
  curl: Fn(({ tVelocity, size, neighborStride }) => {
    const texCoord = uv();

    // Texel step and half-texel clamp border
    const step = vec2(1).div(size).mul(neighborStride);
    const border = vec2(0.5).div(size);

    // Sample neighbours (clamped to avoid edge artefacts)
    const left = clamp(
      texCoord.sub(vec2(step.x, 0)),
      border,
      vec2(1).sub(border)
    );
    const right = clamp(
      texCoord.add(vec2(step.x, 0)),
      border,
      vec2(1).sub(border)
    );
    const bottom = clamp(
      texCoord.sub(vec2(0, step.y)),
      border,
      vec2(1).sub(border)
    );
    const top = clamp(
      texCoord.add(vec2(0, step.y)),
      border,
      vec2(1).sub(border)
    );

    // ∂vy/∂x (right.y - left.y) and ∂vx/∂y (top.x - bottom.x)
    const vy_left = texture(tVelocity, left).y;
    const vy_right = texture(tVelocity, right).y;
    const vx_top = texture(tVelocity, top).x;
    const vx_bottom = texture(tVelocity, bottom).x;

    const curlValue = float(0.5).mul(
      vy_right.sub(vy_left).sub(vx_top).add(vx_bottom)
    );

    return vec4(curlValue, 0, 0, 1)
  }),

  /**
   * Vorticity confinement — adds a force that amplifies existing small-scale vortices.
   *
   * Algorithm:
   * 1. Sample the curl magnitude at neighbouring cells.
   * 2. Compute the gradient of |curl| — points toward regions of higher vorticity.
   * 3. Normalise and rotate 90° to get a force perpendicular to the gradient.
   * 4. Scale by `curlStrength * curlValue` and add to velocity.
   */
  vorticity: Fn(
    ({ tCurl, readTex, size, neighborStride, curlStrength, deltaTime }) => {
      const texCoord = uv();
      const step = vec2(1).div(size).mul(neighborStride);
      const border = vec2(0.5).div(size);

      const left = clamp(
        texCoord.sub(vec2(step.x, 0)),
        border,
        vec2(1).sub(border)
      );
      const right = clamp(
        texCoord.add(vec2(step.x, 0)),
        border,
        vec2(1).sub(border)
      );
      const bottom = clamp(
        texCoord.sub(vec2(0, step.y)),
        border,
        vec2(1).sub(border)
      );
      const top = clamp(
        texCoord.add(vec2(0, step.y)),
        border,
        vec2(1).sub(border)
      );

      // Gradient of vorticity magnitude
      const curlLeft = texture(tCurl, left).x;
      const curlRight = texture(tCurl, right).x;
      const curlTop = texture(tCurl, top).x;
      const curlBottom = texture(tCurl, bottom).x;
      const curlCenter = clamp(texture(tCurl, texCoord).x, -100, 100);

      // Confinement force direction: ∇|ω| normalised
      const force = vec2(
        abs(curlTop).sub(abs(curlBottom)),
        abs(curlRight).sub(abs(curlLeft))
      )
        .mul(0.5)
        .toVar();

      // Normalize (+ epsilon to avoid divide-by-zero)
      force.divAssign(length(force).add(1e-4));

      // Scale by curl strength and current vorticity, rotate 90°
      force.mulAssign(curlStrength.mul(curlCenter));
      force.y.assign(force.y.negate()); // 90° rotation (swap + negate)

      // Add to existing velocity
      const vel = texture(readTex, texCoord).xy;
      return vec4(vel.add(force.mul(deltaTime)), 0, 1)
    }
  ),

  /**
   * Divergence — measures how much the velocity field is expanding or contracting:
   * `div = ∂vx/∂x + ∂vy/∂y`
   *
   * Non-zero divergence means fluid is being created/destroyed, which isn't physical.
   * The pressure solver will compute a correction to make this zero.
   *
   * When `useBoundaries` is true, no-slip wall conditions are applied by
   * reflecting the velocity component into the wall.
   */
  divergence: Fn(({ tVelocity, size, neighborStride, useBoundaries }) => {
    const texCoord = uv();
    const step = vec2(1).div(size).mul(neighborStride);
    const border = vec2(0.5).div(size);

    const left = clamp(
      texCoord.sub(vec2(step.x, 0)),
      border,
      vec2(1).sub(border)
    ).toVar();
    const right = clamp(
      texCoord.add(vec2(step.x, 0)),
      border,
      vec2(1).sub(border)
    ).toVar();
    const bottom = clamp(
      texCoord.sub(vec2(0, step.y)),
      border,
      vec2(1).sub(border)
    ).toVar();
    const top = clamp(
      texCoord.add(vec2(0, step.y)),
      border,
      vec2(1).sub(border)
    ).toVar();

    const vx_left = texture(tVelocity, left).x.toVar();
    const vx_right = texture(tVelocity, right).x.toVar();
    const vy_top = texture(tVelocity, top).y.toVar();
    const vy_bottom = texture(tVelocity, bottom).y.toVar();
    const centerVel = texture(tVelocity, texCoord).xy;

    // Boundary conditions: reflect velocity into wall cells
    if (useBoundaries === true) {
      const oneTexel = float(1).div(size);
      const wallEdge = float(1).sub(oneTexel);

      If(left.x.lessThan(oneTexel), () => {
        vx_left.assign(centerVel.x.negate());
      });
      If(right.x.greaterThan(wallEdge), () => {
        vx_right.assign(centerVel.x.negate());
      });
      If(top.y.greaterThan(wallEdge), () => {
        vy_top.assign(centerVel.y.negate());
      });
      If(bottom.y.lessThan(oneTexel), () => {
        vy_bottom.assign(centerVel.y.negate());
      });
    }

    // Central-difference divergence
    const div = float(0.5).mul(vx_right.sub(vx_left).add(vy_top).sub(vy_bottom));
    return vec4(div, 0, 0, 1)
  }),

  /**
   * Clear pressure — multiply current pressure by `pressureDissipation` each frame.
   * A slight decay (< 1) prevents pressure from accumulating over time.
   */
  clearPressure: Fn(({ readTex, pressureDissipation }) => {
    return texture(readTex, uv()).mul(pressureDissipation)
  }),

  /**
   * Pressure (Jacobi iteration) — iterative solver for the Poisson equation:
   * `∇²p = div(v)`
   *
   * One Jacobi step:
   * `p[i,j] = pressureFactor * (p[left] + p[right] + p[top] + p[bottom] - divergence[i,j])`
   *
   * Multiple iterations (`this.iterations`) reduce the error.
   */
  pressure: Fn(
    ({ tDivergence, readTex, size, neighborStride, pressureFactor }) => {
      const texCoord = uv();
      const step = vec2(1).div(size).mul(neighborStride);
      const border = vec2(0.5).div(size);

      const left = clamp(
        texCoord.sub(vec2(step.x, 0)),
        border,
        vec2(1).sub(border)
      );
      const right = clamp(
        texCoord.add(vec2(step.x, 0)),
        border,
        vec2(1).sub(border)
      );
      const bottom = clamp(
        texCoord.sub(vec2(0, step.y)),
        border,
        vec2(1).sub(border)
      );
      const top = clamp(
        texCoord.add(vec2(0, step.y)),
        border,
        vec2(1).sub(border)
      );

      const pLeft = texture(readTex, left).x;
      const pRight = texture(readTex, right).x;
      const pTop = texture(readTex, top).x;
      const pBottom = texture(readTex, bottom).x;
      const div = texture(tDivergence, texCoord).x;

      const pNew = pressureFactor.mul(
        pLeft.add(pRight).add(pBottom).add(pTop).sub(div)
      );
      return vec4(pNew, 0, 0, 1)
    }
  ),

  /**
   * Gradient subtract — removes the pressure gradient from velocity:
   * `v -= ∇p`
   *
   * This is the projection step — it ensures the velocity field is
   * divergence-free (incompressible) after solving for pressure.
   */
  gradient: Fn(({ tPressure, readTex, size, neighborStride }) => {
    const texCoord = uv();
    const step = vec2(1).div(size).mul(neighborStride);
    const border = vec2(0.5).div(size);

    const left = clamp(
      texCoord.sub(vec2(step.x, 0)),
      border,
      vec2(1).sub(border)
    );
    const right = clamp(
      texCoord.add(vec2(step.x, 0)),
      border,
      vec2(1).sub(border)
    );
    const bottom = clamp(
      texCoord.sub(vec2(0, step.y)),
      border,
      vec2(1).sub(border)
    );
    const top = clamp(
      texCoord.add(vec2(0, step.y)),
      border,
      vec2(1).sub(border)
    );

    const pLeft = texture(tPressure, left).x;
    const pRight = texture(tPressure, right).x;
    const pTop = texture(tPressure, top).x;
    const pBottom = texture(tPressure, bottom).x;

    // Central-difference gradient, subtract from velocity
    const vel = texture(readTex, texCoord).xy.toVar();
    vel.subAssign(vec2(pRight.sub(pLeft), pTop.sub(pBottom)).mul(0.5));
    return vec4(vel, 0, 1)
  }),

  /**
   * Advect velocity — semi-Lagrangian self-advection.
   *
   * "Where did the fluid at this cell come from last frame?"
   * Traces back along the velocity field and samples there.
   * Clamped speed prevents texels from tracing too far in a single step.
   */
  advectVelocity: Fn(({ readTex, size, deltaTime, advectionDissipation }) => {
    const texCoord = uv();
    const texelSize = vec2(1).div(size);

    const vel = texture(readTex, texCoord).xy;

    // Clamp speed to avoid undersampling artifacts
    const maxSpeed = float(500);
    const speed = length(vel);
    const clampedVel = vel.mul(clamp(maxSpeed.div(speed.max(maxSpeed)), 0, 1));

    // Back-trace
    const prevCoord = clamp(
      texCoord.sub(deltaTime.mul(clampedVel.mul(texelSize))),
      0,
      1
    );
    const advected = texture(readTex, prevCoord).mul(advectionDissipation);

    return vec4(advected.rg, 0, 1)
  }),

  /**
   * Advect density — semi-Lagrangian advection of the dye/smoke field.
   *
   * Same principle as advectVelocity but applied to the colour/density buffer.
   * Uses the velocity field to determine where to sample.
   */
  advectDensity: Fn(
    ({ tVelocity, readTex, simRes, deltaTime, advectionDissipation }) => {
      const texCoord = uv();
      const texelSize = vec2(1).div(simRes);

      const vel = texture(tVelocity, texCoord).xy;

      // Clamp speed
      const maxSpeed = float(500);
      const speed = length(vel);
      const clampedVel = vel.mul(clamp(maxSpeed.div(speed.max(maxSpeed)), 0, 1));

      // Back-trace and sample density
      const prevCoord = clamp(
        texCoord.sub(deltaTime.mul(clampedVel.mul(texelSize))),
        0,
        1
      );
      const advected = texture(readTex, prevCoord).mul(advectionDissipation);

      return vec4(advected.rgb, 1)
    }
  )
};

// ============================================================================
// Helper — create a fullscreen-quad NodeMaterial from a TSL fragment node
// ============================================================================

function createPassMaterial(fragmentNode) {
  const mat = new NodeMaterial();
  mat.fragmentNode = fragmentNode;
  mat.depthTest = false;
  mat.depthWrite = false;
  return mat
}

// ============================================================================
// SmokeNodeRTT
// ============================================================================

// Renderer state snapshot (shared across all instances, restored after each frame)
let _rendererState$1;

/**
 * GPU fluid simulation node.
 *
 * Extends Three.js `TempNode` so it integrates with the node render pipeline.
 * `updateBeforeType = FRAME` causes `updateBefore()` to be called once per frame,
 * where the entire simulation is stepped.
 *
 * @class SmokeNodeRTT
 * @extends TempNode
 */
class SmokeNodeRTT extends TempNode {
  static get type() {
    return 'SmokeNodeRTT'
  }

  /**
   * @param {Object} [options]
   * @param {THREE.Vector2|Node} [options.pointer] - Pointer position in NDC [-1,+1].
   * @param {number} [options.simRes=128] - Velocity/pressure field resolution.
   * @param {number} [options.dyeRes=512] - Density/colour field resolution.
   * @param {number} [options.iterations=3] - Jacobi pressure solver iterations per step.
   * @param {number} [options.densityDissipation=0.97] - Density decay per step.
   * @param {number} [options.velocityDissipation=0.98] - Velocity decay per step.
   * @param {number} [options.pressureDissipation=0.8] - Pressure decay per step.
   * @param {number} [options.curlStrength=20] - Vorticity confinement strength.
   * @param {number} [options.pressureFactor=0.2] - Jacobi relaxation factor.
   * @param {number} [options.radius=0.1] - Splat Gaussian radius.
   * @param {boolean} [options.useBoundaries=true] - Apply no-slip wall boundaries.
   * @param {number} [options.pointerScale=45] - Scales pointer delta to force magnitude.
   * @param {number} [options.neighborStride=1] - Finite-difference stencil width (texels).
   * @param {number} [options.speedFactor=1] - Simulation speed multiplier.
   */
  constructor(options = {}) {
    super();

    // Apply defaults
    const config = {
      speedFactor: 1,
      simRes: 128,
      dyeRes: 512,
      iterations: 3,
      densityDissipation: 0.97,
      velocityDissipation: 0.98,
      pressureDissipation: 0.8,
      curlStrength: 20,
      pressureFactor: 0.2,
      radius: 0.1,
      useBoundaries: true,
      pointerScale: 45,
      neighborStride: 1,
      ...options
    };

    this._useBoundaries = config.useBoundaries;

    const {
      simRes: simResVal,
      dyeRes: dyeResVal,
      velocityDissipation,
      pressureDissipation,
      curlStrength,
      pressureFactor,
      radius
    } = config;

    // Uniforms (GPU-accessible)
    this.simRes = uniform(new Vector2(simResVal, simResVal));
    this.dyeRes = uniform(new Vector2(dyeResVal, dyeResVal));
    this.deltaTime = uniform(0.016);

    // Speed / substep bookkeeping
    this._speedFactor = config.speedFactor;
    this._baseIterations = config.iterations;
    this.iterations = Math.round(config.iterations * (1 / config.speedFactor));
    this._accumulatedTime = 0;
    this._timeStep = 0.016;
    this._subSteps = Math.max(1, Math.round(1 / config.speedFactor));

    // Dissipation values (CPU & GPU copies for the advection passes)
    this.densityDissipation = config.densityDissipation;
    this.velocityDissipation = velocityDissipation;
    this._advectionDissipation = uniform(velocityDissipation);
    this.pressureDissipation = uniform(pressureDissipation);
    this.pressureFactor = uniform(pressureFactor);
    this.curlStrength = uniform(curlStrength);

    // Pointer / splat state
    this.point = uniform(new Vector2(0, 0), 'vec2');
    this.force = uniform(new Vector2(0, 0), 'vec2');
    this.radius = uniform(radius);
    this.splats = [];

    // Accept pointer as a raw Vector2 or an existing uniform node
    if (config.pointer instanceof Vector2) {
      this.pointer = uniform(config.pointer, 'vec2');
    } else if (config.pointer && config.pointer.value instanceof Vector2) {
      this.pointer = config.pointer;
    } else {
      this.pointer = uniform(new Vector2(0, 0), 'vec2');
    }
    this._prevPointer = new Vector2(this.pointer.value.x, this.pointer.value.y);
    this._hasPrevPointer = false;
    this._pointerScale = config.pointerScale;
    this._rendererSize = new Vector2();

    this.neighborStride = uniform(config.neighborStride);

    // Resize / rebuild flags
    this._resized = false;
    this._resizePending = false;
    this._pendingSimRes = simResVal;
    this._pendingDyeRes = dyeResVal;

    // -------------------------------------------------------------------------
    // Simulation buffers
    // -------------------------------------------------------------------------

    // Velocity field (ping-pong, bilinear)
    this._velocity = new DoubleBuffer({
      width: simResVal,
      height: simResVal,
      minFilter: LinearFilter,
      magFilter: LinearFilter
    });
    // Density / dye field (ping-pong, bilinear, higher res)
    this._density = new DoubleBuffer({
      width: dyeResVal,
      height: dyeResVal,
      minFilter: LinearFilter,
      magFilter: LinearFilter
    });
    // Pressure (ping-pong, nearest — sharp values needed)
    this._pressure = new DoubleBuffer({
      width: simResVal,
      height: simResVal,
      minFilter: NearestFilter,
      magFilter: NearestFilter
    });
    // Curl scalar (single, nearest)
    this._curl = new SingleBuffer({
      width: simResVal,
      height: simResVal,
      minFilter: NearestFilter,
      magFilter: NearestFilter
    });
    // Divergence scalar (single, nearest)
    this._divergence = new SingleBuffer({
      width: simResVal,
      height: simResVal,
      minFilter: NearestFilter,
      magFilter: NearestFilter
    });

    // Output texture node — wraps the density read buffer
    this._textureNode = passTexture(this, this._density.read.texture);

    // FRAME update hook
    this.updateBeforeType = NodeUpdateType.FRAME;

    // Two QuadMesh instances — alternated each pass to avoid GPU pipeline stalls
    this._quadA = new QuadMesh();
    this._quadB = new QuadMesh();
    this._useQuadA = true;

    // Material cache (built lazily on first setup())
    this._materialsBuilt = false;
    this._builtSimRes = simResVal;
    this._builtDyeRes = dyeResVal;
    this._builtUseBoundaries = this._useBoundaries;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /** Returns the texture node that carries the density field output. */
  getTextureNode() {
    return this._textureNode
  }

  /** Toggle no-slip wall boundaries. Triggers a material rebuild. */
  set useBoundaries(value) {
    const v = !!value;
    if (v !== this._useBoundaries) {
      this._useBoundaries = v;
      this._resizePending = true;
    }
  }
  get useBoundaries() {
    return this._useBoundaries
  }

  /** Adjust simulation speed at runtime. */
  _updateSpeedFactor(factor) {
    this._speedFactor = factor;
    this._subSteps = Math.max(1, Math.round(1 / factor));
    this.iterations = Math.round(this._baseIterations * (1 / factor));
  }

  /**
   * Trigger a resolution change. Actual resize is deferred to `updateBefore`
   * to avoid mid-frame GPU state corruption.
   */
  setSize() {
    const simR = this.simRes.value.x;
    const dyeR = this.dyeRes.value.x;
    const sizeChanged = simR !== this._builtSimRes || dyeR !== this._builtDyeRes;
    const boundaryChanged = this._useBoundaries !== this._builtUseBoundaries;

    if (sizeChanged || boundaryChanged) {
      this._pendingSimRes = simR;
      this._pendingDyeRes = dyeR;
      this._resizePending = true;
    }
  }

  // ============================================================================
  // Material / pass setup
  // ============================================================================

  /**
   * Builds one NodeMaterial per simulation pass.
   * Each pass has a "read" and "write" variant — they read from opposite halves
   * of the ping-pong buffer depending on the current `phase` flag.
   * @private
   */
  _buildMaterials() {
    const {
      splatVelocity,
      splatDensity,
      curl,
      vorticity,
      divergence,
      clearPressure,
      pressure,
      gradient,
      advectVelocity,
      advectDensity
    } = fluidShaders;

    const makeVariant = (fn, overrides) => createPassMaterial(fn(overrides));

    // Splat velocity
    const splatVelBase = {
      size: this.simRes,
      point: this.point,
      radius: this.radius,
      force: this.force
    };
    this._splatVelocityRead = makeVariant(splatVelocity, {
      readTex: this._velocity.read.texture,
      ...splatVelBase
    });
    this._splatVelocityWrite = makeVariant(splatVelocity, {
      readTex: this._velocity.write.texture,
      ...splatVelBase
    });

    // Splat density
    const splatDenBase = {
      size: this.dyeRes,
      point: this.point,
      radius: this.radius,
      force: this.force
    };
    this._splatDensityRead = makeVariant(splatDensity, {
      readTex: this._density.read.texture,
      ...splatDenBase
    });
    this._splatDensityWrite = makeVariant(splatDensity, {
      readTex: this._density.write.texture,
      ...splatDenBase
    });

    // Curl
    const curlBase = { size: this.simRes, neighborStride: this.neighborStride };
    this._curlRead = makeVariant(curl, {
      tVelocity: this._velocity.read.texture,
      ...curlBase
    });
    this._curlWrite = makeVariant(curl, {
      tVelocity: this._velocity.write.texture,
      ...curlBase
    });

    // Vorticity
    const vorticityBase = {
      tCurl: this._curl.texture,
      size: this.simRes,
      neighborStride: this.neighborStride,
      curlStrength: this.curlStrength,
      deltaTime: this.deltaTime
    };
    this._vorticityRead = makeVariant(vorticity, {
      readTex: this._velocity.read.texture,
      ...vorticityBase
    });
    this._vorticityWrite = makeVariant(vorticity, {
      readTex: this._velocity.write.texture,
      ...vorticityBase
    });

    // Divergence
    const divBase = {
      size: this.simRes,
      neighborStride: this.neighborStride,
      useBoundaries: this._useBoundaries
    };
    this._divergenceRead = makeVariant(divergence, {
      tVelocity: this._velocity.read.texture,
      ...divBase
    });
    this._divergenceWrite = makeVariant(divergence, {
      tVelocity: this._velocity.write.texture,
      ...divBase
    });

    // Clear pressure
    this._clearPressureRead = makeVariant(clearPressure, {
      readTex: this._pressure.read.texture,
      pressureDissipation: this.pressureDissipation
    });
    this._clearPressureWrite = makeVariant(clearPressure, {
      readTex: this._pressure.write.texture,
      pressureDissipation: this.pressureDissipation
    });

    // Pressure (Jacobi)
    const pressureBase = {
      tDivergence: this._divergence.texture,
      size: this.simRes,
      neighborStride: this.neighborStride,
      pressureFactor: this.pressureFactor
    };
    this._pressureRead = makeVariant(pressure, {
      readTex: this._pressure.read.texture,
      ...pressureBase
    });
    this._pressureWrite = makeVariant(pressure, {
      readTex: this._pressure.write.texture,
      ...pressureBase
    });

    // Gradient subtract
    const gradBase = {
      tPressure: this._pressure.read.texture,
      size: this.simRes,
      neighborStride: this.neighborStride
    };
    this._gradientRead = makeVariant(gradient, {
      readTex: this._velocity.read.texture,
      ...gradBase
    });
    this._gradientWrite = makeVariant(gradient, {
      readTex: this._velocity.write.texture,
      ...gradBase
    });

    // Advect velocity
    const advVelBase = {
      size: this.simRes,
      deltaTime: this.deltaTime,
      advectionDissipation: this._advectionDissipation
    };
    this._advectVelocityRead = makeVariant(advectVelocity, {
      readTex: this._velocity.read.texture,
      ...advVelBase
    });
    this._advectVelocityWrite = makeVariant(advectVelocity, {
      readTex: this._velocity.write.texture,
      ...advVelBase
    });

    // Advect density
    const advDenBase = {
      tVelocity: this._velocity.read.texture,
      simRes: this.simRes,
      deltaTime: this.deltaTime,
      advectionDissipation: this._advectionDissipation
    };
    this._advectDensityRead = makeVariant(advectDensity, {
      readTex: this._density.read.texture,
      ...advDenBase
    });
    this._advectDensityWrite = makeVariant(advectDensity, {
      readTex: this._density.write.texture,
      ...advDenBase
    });

    this._materialsBuilt = true;
    this._builtSimRes = this._velocity.width;
    this._builtDyeRes = this._density.width;
    this._builtUseBoundaries = this._useBoundaries;
  }

  /**
   * Alternates between the two QuadMesh instances each pass to avoid stalling
   * the GPU pipeline while the same mesh is still in flight.
   * @private
   */
  _getQuad() {
    this._useQuadA = !this._useQuadA;
    return this._useQuadA ? this._quadA : this._quadB
  }

  /**
   * Renders a fullscreen quad with the given material into the target RT.
   * @private
   */
  _renderPass(renderer, material, renderTarget) {
    const quad = this._getQuad();
    quad.material = material;
    renderer.setRenderTarget(renderTarget);
    quad.render(renderer);
  }

  // ============================================================================
  // TempNode overrides
  // ============================================================================

  /** Called by the node system — returns the output texture node. */
  setup() {
    if (!this._materialsBuilt) this._buildMaterials();
    return this._textureNode
  }

  // ============================================================================
  // Per-step simulation passes
  // ============================================================================

  /** Process all queued splat events. */
  splat(renderer) {
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const { x, y, dx, dy } = this.splats.splice(i, 1)[0];
      this.point.value.set(x, y);
      this.force.value.set(dx, dy);

      this._renderPass(
        renderer,
        this._velocity.phase
          ? this._splatVelocityRead
          : this._splatVelocityWrite,
        this._velocity.phase ? this._velocity.write : this._velocity.read
      );
      this._velocity.swap();

      this._renderPass(
        renderer,
        this._density.phase ? this._splatDensityRead : this._splatDensityWrite,
        this._density.phase ? this._density.write : this._density.read
      );
      this._density.swap();
    }
  }

  /** Compute scalar curl of velocity → curl buffer. */
  curl(renderer) {
    this._renderPass(
      renderer,
      this._velocity.phase ? this._curlRead : this._curlWrite,
      this._curl.rt
    );
  }

  /** Apply vorticity confinement to velocity. */
  vorticity(renderer) {
    this._renderPass(
      renderer,
      this._velocity.phase ? this._vorticityRead : this._vorticityWrite,
      this._velocity.phase ? this._velocity.write : this._velocity.read
    );
    this._velocity.swap();
  }

  /** Compute divergence of velocity → divergence buffer. */
  divergence(renderer) {
    this._renderPass(
      renderer,
      this._velocity.phase ? this._divergenceRead : this._divergenceWrite,
      this._divergence.rt
    );
  }

  /** Decay pressure field. */
  clearPressure(renderer) {
    this._renderPass(
      renderer,
      this._pressure.phase ? this._clearPressureRead : this._clearPressureWrite,
      this._pressure.phase ? this._pressure.write : this._pressure.read
    );
    this._pressure.swap();
  }

  /** Run Jacobi pressure iterations. */
  pressure(renderer) {
    for (let i = 0; i < this.iterations; i++) {
      this._renderPass(
        renderer,
        this._pressure.phase ? this._pressureRead : this._pressureWrite,
        this._pressure.phase ? this._pressure.write : this._pressure.read
      );
      this._pressure.swap();
    }
  }

  /** Subtract pressure gradient from velocity (projection step). */
  gradientSubtract(renderer) {
    this._renderPass(
      renderer,
      this._velocity.phase ? this._gradientRead : this._gradientWrite,
      this._velocity.phase ? this._velocity.write : this._velocity.read
    );
    this._velocity.swap();
  }

  /** Semi-Lagrangian self-advection of the velocity field. */
  advectionVelocity(renderer) {
    this._advectionDissipation.value = this.velocityDissipation;
    this._renderPass(
      renderer,
      this._velocity.phase
        ? this._advectVelocityRead
        : this._advectVelocityWrite,
      this._velocity.phase ? this._velocity.write : this._velocity.read
    );
    this._velocity.swap();
  }

  /** Semi-Lagrangian advection of the density/dye field. */
  advectionDensity(renderer) {
    this._advectionDissipation.value = this.densityDissipation;
    this._renderPass(
      renderer,
      this._density.phase ? this._advectDensityRead : this._advectDensityWrite,
      this._density.phase ? this._density.write : this._density.read
    );
    this._density.swap();
  }

  // ============================================================================
  // Frame update
  // ============================================================================

  /**
   * Called once per frame by the node system.
   * Handles pointer → splat conversion, resize, and the simulation loop.
   */
  updateBefore({ renderer, deltaTime }) {
    // --- Deferred resize ---
    if (this._resizePending) {
      const simR = Math.max(1, Math.round(this._pendingSimRes));
      const dyeR = Math.max(1, Math.round(this._pendingDyeRes));

      if (
        simR !== this._builtSimRes ||
        dyeR !== this._builtDyeRes ||
        this._useBoundaries !== this._builtUseBoundaries
      ) {
        this.simRes.value.set(simR, simR);
        this.dyeRes.value.set(dyeR, dyeR);
        this._density.setSize(dyeR, dyeR);
        this._velocity.setSize(simR, simR);
        this._pressure.setSize(simR, simR);
        this._divergence.setSize(simR, simR);
        this._curl.setSize(simR, simR);
        this._disposeMaterials();
        this._buildMaterials();
        this._resized = true;
      }
      this._resizePending = false;
    }

    if (typeof deltaTime === 'number') {
      this.deltaTime.value = Math.min(deltaTime, 0.1);
    }

    // --- Pointer → splat ---
    const ptr = this.pointer.value;
    if (ptr) {
      if (this._hasPrevPointer) {
        const CLAMP = 0.1;
        let dx = Math.max(-CLAMP, Math.min(CLAMP, ptr.x - this._prevPointer.x));
        let dy = Math.max(-CLAMP, Math.min(CLAMP, ptr.y - this._prevPointer.y));

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
          // Convert NDC [-1,+1] to UV [0,1]
          const uvX = ptr.x * 0.5 + 0.5;
          const uvY = ptr.y * -0.5 + 0.5;

          // Skip splats that are too close to the border
          const BORDER = 0.05;
          if (
            uvX >= BORDER &&
            uvX <= 1 - BORDER &&
            uvY >= BORDER &&
            uvY <= 1 - BORDER
          ) {
            renderer.getSize(this._rendererSize);
            const minDim = Math.max(
              1,
              Math.min(this._rendererSize.x, this._rendererSize.y)
            );
            const fx = dx * minDim * 0.5 * this._pointerScale;
            const fy = -dy * minDim * 0.5 * this._pointerScale;
            this.splats.push({ x: uvX, y: uvY, dx: fx, dy: fy });
          }
        }
      }
      this._prevPointer.set(ptr.x, ptr.y);
      this._hasPrevPointer = true;
    }

    // --- Snapshot + disable renderer defaults ---
    _rendererState$1 = RendererUtils.resetRendererState(renderer, _rendererState$1);
    renderer.autoClear = false;

    if (this._resized) {
      this._resized = false;
      RendererUtils.restoreRendererState(renderer, _rendererState$1);
      return
    }

    // --- Fixed-timestep simulation loop ---
    this._accumulatedTime += this.deltaTime.value;
    const stepsNeeded = Math.floor(
      this._accumulatedTime / (this._timeStep * this._speedFactor)
    );

    if (stepsNeeded > 0) {
      this._accumulatedTime -= stepsNeeded * this._timeStep * this._speedFactor;

      for (let s = 0; s < stepsNeeded; s++) {
        this.deltaTime.value = this._timeStep * this._speedFactor;

        // Splats only on the first sub-step
        const pendingSplats = [...this.splats];
        this.splats.length = 0;
        if (s === 0) this.splats.push(...pendingSplats);

        // Full simulation pipeline
        this.splat(renderer);
        this.curl(renderer);
        this.vorticity(renderer);
        this.divergence(renderer);
        this.clearPressure(renderer);
        this.pressure(renderer);
        this.gradientSubtract(renderer);
        this.advectionVelocity(renderer);
        this.advectionDensity(renderer);
      }
    }

    // Point the output node at the current density read texture
    this._textureNode.value = this._density.phase
      ? this._density.read.texture
      : this._density.write.texture;

    renderer.setRenderTarget(null);
    RendererUtils.restoreRendererState(renderer, _rendererState$1);
  }

  // ============================================================================
  // Disposal
  // ============================================================================

  _disposeMaterials() {
    const keys = [
      '_splatVelocityRead',
      '_splatVelocityWrite',
      '_splatDensityRead',
      '_splatDensityWrite',
      '_curlRead',
      '_curlWrite',
      '_vorticityRead',
      '_vorticityWrite',
      '_divergenceRead',
      '_divergenceWrite',
      '_clearPressureRead',
      '_clearPressureWrite',
      '_pressureRead',
      '_pressureWrite',
      '_gradientRead',
      '_gradientWrite',
      '_advectVelocityRead',
      '_advectVelocityWrite',
      '_advectDensityRead',
      '_advectDensityWrite'
    ];
    for (const key of keys) {
      if (this[key]) {
        this[key].dispose();
        this[key] = null;
      }
    }
  }

  dispose() {
    this._density.dispose();
    this._velocity.dispose();
    this._pressure.dispose();
    this._divergence.dispose();
    this._curl.dispose();
    this._disposeMaterials();
    this._quadA.dispose();
    this._quadB.dispose();
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Creates a SmokeNodeRTT instance wrapped in a nodeObject.
 *
 * @param {THREE.Vector2|Node} [pointer] - Pointer in NDC [-1,+1].
 * @param {number} [simRes=128]
 * @param {number} [dyeRes=512]
 * @param {number} [iterations=3]
 * @param {number} [densityDissipation=0.97]
 * @param {number} [velocityDissipation=0.98]
 * @param {number} [pressureDissipation=0.8]
 * @param {number} [curlStrength=20]
 * @param {number} [pressureFactor=0.2]
 * @param {number} [radius=0.1]
 * @param {boolean} [useBoundaries=true]
 * @param {number} [pointerScale=45]
 * @param {number} [neighborStride=1]
 * @param {number} [speedFactor=1]
 * @returns {Node}
 */
const smokeRTT = (
  pointer,
  simRes = 128,
  dyeRes = 512,
  iterations = 3,
  densityDissipation = 0.97,
  velocityDissipation = 0.98,
  pressureDissipation = 0.8,
  curlStrength = 20,
  pressureFactor = 0.2,
  radius = 0.1,
  useBoundaries = true,
  pointerScale = 45,
  neighborStride = 1,
  speedFactor = 1
) =>
  nodeObject(
    new SmokeNodeRTT({
      pointer,
      simRes,
      dyeRes,
      iterations,
      densityDissipation,
      velocityDissipation,
      pressureDissipation,
      curlStrength,
      pressureFactor,
      radius,
      useBoundaries,
      pointerScale,
      neighborStride,
      speedFactor
    })
  );

/**
 * TransitionEffects
 *
 * Provides reusable transition effects for compositing multiple scenes.
 * Supports various transition types with configurable parameters.
 */
class TransitionEffects {
  constructor() {
    // Diagonal wave transition parameters
    this.frequency = uniform(5.0); // Wave frequency (higher = more waves)
    this.angle = uniform(45.0); // Angle in degrees (0 = horizontal, 90 = vertical, 45 = diagonal)
    this.amplitude = uniform(0.2); // Wave amplitude (0 = straight line, higher = more wave)
    this.edgeSoftness = uniform(0.05); // Transition edge softness

    // Time for animated waves
    this.time = uniform(0.0); // Time offset for wave animation
    this.waveSpeed = 0.5; // Speed multiplier for wave animation

    // Velocity-based dynamics
    this.velocity = uniform(0.0); // Current scroll velocity (0-1)
    this.velocityTarget = 0.0; // Target velocity value
    this.velocityCurrent = 0.0; // Lerped velocity value
    this.velocityLerpFactor = 0.15; // How quickly velocity lerps (lower = smoother)

    this.velocityInfluence = {
      angle: 15.0, // Maximum angle variation in degrees
      amplitude: 0.15, // Maximum amplitude variation
    };

    // Store base values for dynamic calculations
    this.baseAngle = 45.0;
    this.baseAmplitude = 0.2;
  }

  /**
   * Creates a diagonal wave transition mask with a single smooth wave curve
   * @param {TSLNode} uv - The UV coordinates
   * @param {TSLNode} progress - Progress value (0-1) for the transition
   * @param {Object} options - Optional parameters to override defaults
   * @returns {TSLNode} A mask value (0-1) for the transition
   */
  createDiagonalWave(uv, progress, options = {}) {
    const freq =
      options.frequency !== undefined
        ? float(options.frequency)
        : this.frequency;
    const angleDeg =
      options.angle !== undefined ? float(options.angle) : this.angle;
    const amp =
      options.amplitude !== undefined
        ? float(options.amplitude)
        : this.amplitude;
    const softness =
      options.edgeSoftness !== undefined
        ? float(options.edgeSoftness)
        : this.edgeSoftness;

    // Convert angle from degrees to radians
    const angleRad = angleDeg.mul(Math.PI / 180.0);

    // Center the UV coordinates (0.5, 0.5 becomes the rotation center)
    const centeredUV = uv.sub(0.5);

    // Calculate rotated coordinates
    // rotatedCoord: along the sweep direction
    // perpCoord: perpendicular to the sweep direction
    const cosAngle = cos(angleRad);
    const sinAngle = sin(angleRad);
    const rotatedCoord = centeredUV.x
      .mul(cosAngle)
      .add(centeredUV.y.mul(sinAngle));
    const perpCoord = centeredUV.x
      .mul(sinAngle)
      .sub(centeredUV.y.mul(cosAngle));

    // Create a single smooth wave curve using the perpendicular coordinate
    // This creates a wave that undulates as it sweeps across
    // Add time offset to animate the wave
    const wave = sin(
      perpCoord
        .mul(freq)
        .mul(Math.PI * 2.0)
        .add(this.time)
    ).mul(amp);

    // Combine progress with wave offset
    // The wave creates a smooth curved line that sweeps across the screen
    const threshold = progress.mul(2.0).sub(1.0); // Map 0-1 to -1 to 1 for full sweep
    const transitionLine = rotatedCoord.add(wave).sub(threshold);

    // Create smooth transition mask
    // Invert the mask so progress=0 shows texture A, progress=1 shows texture B
    const mask = smoothstep(
      softness.negate(),
      softness,
      transitionLine.negate()
    );

    return mask;
  }

  /**
   * Creates a simple linear diagonal transition (no wave)
   * @param {TSLNode} uv - The UV coordinates
   * @param {TSLNode} progress - Progress value (0-1) for the transition
   * @param {Object} options - Optional parameters
   * @returns {TSLNode} A mask value (0-1) for the transition
   */
  createDiagonalLinear(uv, progress, options = {}) {
    const angleDeg =
      options.angle !== undefined ? float(options.angle) : this.angle;
    const softness =
      options.edgeSoftness !== undefined
        ? float(options.edgeSoftness)
        : this.edgeSoftness;

    // Center the UV coordinates
    const centeredUV = uv.sub(0.5);

    const angleRad = angleDeg.mul(Math.PI / 180.0);
    const cosAngle = cos(angleRad);
    const sinAngle = sin(angleRad);
    const rotatedCoord = centeredUV.x
      .mul(cosAngle)
      .add(centeredUV.y.mul(sinAngle));

    const threshold = progress.mul(2.0).sub(1.0);
    const transitionLine = rotatedCoord.sub(threshold);

    const mask = smoothstep(softness.negate(), softness, transitionLine);

    return mask;
  }

  /**
   * Creates a vertical wave transition (original style but with wave)
   * @param {TSLNode} uv - The UV coordinates
   * @param {TSLNode} progress - Progress value (0-1) for the transition
   * @param {Object} options - Optional parameters
   * @returns {TSLNode} A mask value (0-1) for the transition
   */
  createVerticalWave(uv, progress, options = {}) {
    return this.createDiagonalWave(uv, progress, { ...options, angle: 90 });
  }

  /**
   * Creates a horizontal wave transition
   * @param {TSLNode} uv - The UV coordinates
   * @param {TSLNode} progress - Progress value (0-1) for the transition
   * @param {Object} options - Optional parameters
   * @returns {TSLNode} A mask value (0-1) for the transition
   */
  createHorizontalWave(uv, progress, options = {}) {
    return this.createDiagonalWave(uv, progress, { ...options, angle: 0 });
  }

  /**
   * Blends two textures using a transition effect
   * @param {TSLNode} texA - First texture
   * @param {TSLNode} texB - Second texture
   * @param {TSLNode} mask - Transition mask (0-1)
   * @returns {TSLNode} Blended result
   */
  blend(texA, texB, mask) {
    return mix(texA, texB, mask);
  }

  /**
   * Updates the target velocity value for dynamic transitions
   * @param {number} velocity - Velocity value (can be negative for scroll up)
   */
  updateVelocity(velocity) {
    this.velocityTarget = velocity;
  }

  /**
   * Updates lerped velocity and applies it to transition parameters
   * Call this each frame for smooth velocity transitions
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  update(deltaTime = 0.016) {
    // Lerp current velocity towards target
    this.velocityCurrent +=
      (this.velocityTarget - this.velocityCurrent) * this.velocityLerpFactor;

    // // Clamp to avoid floating point issues
    // if (Math.abs(this.velocityCurrent) < 0.001) {
    //   this.velocityCurrent = 0;
    // }

    // Get absolute velocity for magnitude and sign for direction
    const absVelocity = Math.abs(this.velocityCurrent);
    const velocityDirection = Math.sign(this.velocityCurrent) || 1; // Default to 1 if 0

    // Update time for wave animation - reverse direction when scrolling up
    const timeDirection = velocityDirection;
    this.time.value += deltaTime * this.waveSpeed * timeDirection;

    // Update uniform
    this.velocity.value = this.velocityCurrent;

    // Calculate dynamic angle based on lerped velocity and direction
    // Positive velocity (scroll down) = subtract angle offset (e.g., 45° -> 30°)
    // Negative velocity (scroll up) = add angle offset (e.g., 45° -> 60°)
    // This creates a subtle directional change without reversing the transition
    const velocityAngleOffset =
      this.velocity.value * 5 * this.velocityInfluence.angle;
    const dynamicAngle = this.baseAngle - velocityAngleOffset;
    this.angle.value = dynamicAngle;

    // Calculate dynamic amplitude based on absolute velocity
    // Higher velocity (either direction) = more wave amplitude
    const velocityAmplitudeBoost =
      absVelocity * this.velocityInfluence.amplitude;
    const dynamicAmplitude = this.baseAmplitude + velocityAmplitudeBoost;
    this.amplitude.value = dynamicAmplitude;
  }

  /**
   * Updates the uniform values for runtime control
   * @param {Object} params - Parameters to update
   */
  updateParameters(params) {
    if (params.frequency !== undefined) {
      this.frequency.value = params.frequency;
    }
    if (params.angle !== undefined) {
      this.angle.value = params.angle;
      this.baseAngle = params.angle; // Update base for velocity calculations
    }
    if (params.amplitude !== undefined) {
      this.amplitude.value = params.amplitude;
      this.baseAmplitude = params.amplitude; // Update base for velocity calculations
    }
    if (params.edgeSoftness !== undefined) {
      this.edgeSoftness.value = params.edgeSoftness;
    }
    if (params.waveSpeed !== undefined) {
      this.waveSpeed = params.waveSpeed;
    }
    if (params.velocityInfluenceAngle !== undefined) {
      this.velocityInfluence.angle = params.velocityInfluenceAngle;
    }
    if (params.velocityInfluenceAmplitude !== undefined) {
      this.velocityInfluence.amplitude = params.velocityInfluenceAmplitude;
    }
    if (params.velocityLerpFactor !== undefined) {
      this.velocityLerpFactor = params.velocityLerpFactor;
    }
  }
}

/**
 * Standardized PostProcessing for each section
 * Includes: vignette, color overlay, gradient map, and color adjustments
 * Optionally supports fluid texture for distortion
 */
class SectionPostProcessing {
  /**
   * Default settings for all sections
   */
  static defaultSettings = {
    // Overlay settings
    overlayColor: { r: 255, g: 255, b: 255 },
    overlayOpacity: 0.0,
    overlayBlendMode: 'normal', // normal, multiply, screen, overlay, add, burn, dodge

    // Gradient map settings (luminance-based)
    colorRampEnabled: false,
    colorRampColor1: { r: 0, g: 0, b: 0 }, // Color for dark areas (luminance = 0)
    colorRampColor2: { r: 255, g: 255, b: 255 }, // Color for bright areas (luminance = 1)
    colorRampMix: 1.0, // Mix factor (0 = original, 1 = full gradient map)

    // Vignette settings
    vignetteStrength: 0.3,
    vignetteSize: 0.8,

    // Fluid distortion settings
    fluidDistortion: 0.001,
    fluidBrightness: 0.0,

    // Color Adjustment settings
    contrast: 1.0, // 0-2, default 1.0 (no change)
    contrastClampMin: 0.0, // Minimum clamp value for contrast (default 0.0 = black)
    saturation: 1.0, // 0-2, default 1.0 (no change)
    hue: 0.0 // -180 to 180 degrees, default 0 (no shift)
  }

  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Merge custom settings with defaults
    this.settings = {
      ...SectionPostProcessing.defaultSettings,
      ...options.settings
    };

    // Optional fluid texture for distortion and brightness
    this.fluidTexture = options.fluidTexture || null;

    // Optional activation uniform (for conditional rendering)
    // If provided, the output will be black when inactive
    this.activationUniform = options.activationUniform || null;

    // Maximum device pixel ratio for this scene (for performance optimization)
    this.maxDpr = options.maxDpr || Infinity;

    // Store current size for resize handling
    this.currentWidth = 0;
    this.currentHeight = 0;
    this.currentDpr = 1;

    // Ping-pong rendering control
    this.shouldRender = true; // Whether to render this frame
    this.renderTarget = null; // Cached render target

    // Create uniforms
    this.createUniforms();
    this.setupPostProcessing();
  }

  createUniforms() {
    const s = this.settings;

    // Overlay uniforms
    this.overlayColorUniform = uniform(
      new Color(
        s.overlayColor.r / 255,
        s.overlayColor.g / 255,
        s.overlayColor.b / 255
      ).convertSRGBToLinear()
    );
    this.overlayOpacityUniform = uniform(s.overlayOpacity);
    this.overlayBlendModeUniform = uniform(
      this.getBlendModeValue(s.overlayBlendMode)
    );

    // Gradient map uniforms (luminance-based color remapping)
    this.colorRampEnabledUniform = uniform(s.colorRampEnabled ? 1.0 : 0.0);
    this.colorRampColor1Uniform = uniform(
      new Color(
        s.colorRampColor1.r / 255,
        s.colorRampColor1.g / 255,
        s.colorRampColor1.b / 255
      ).convertSRGBToLinear()
    );
    this.colorRampColor2Uniform = uniform(
      new Color(
        s.colorRampColor2.r / 255,
        s.colorRampColor2.g / 255,
        s.colorRampColor2.b / 255
      ).convertSRGBToLinear()
    );
    this.colorRampMixUniform = uniform(s.colorRampMix);

    // Vignette uniforms
    this.vignetteStrengthUniform = uniform(s.vignetteStrength);
    this.vignetteSizeUniform = uniform(s.vignetteSize);

    // Fluid uniforms
    this.fluidDistortionUniform = uniform(s.fluidDistortion);
    this.fluidBrightnessUniform = uniform(s.fluidBrightness);

    // Color Adjustment uniforms
    this.contrastUniform = uniform(s.contrast);
    this.contrastClampMinUniform = uniform(s.contrastClampMin);
    this.saturationUniform = uniform(s.saturation);
    this.hueUniform = uniform(s.hue);
  }

  getBlendModeValue(mode) {
    const blendModeMap = {
      normal: 0,
      multiply: 1,
      screen: 2,
      overlay: 3,
      add: 4,
      burn: 5,
      dodge: 6
    };
    return blendModeMap[mode] || 0
  }

  setupPostProcessing() {
    // Create scene pass
    const scenePass = pass(this.scene, this.camera);
    const outputPass = scenePass.getTextureNode();

    // Store passes for compositor access
    this.outputPass = outputPass;
    this.scenePass = scenePass;

    // Try to configure the pass to not auto-clear when scene is invisible
    // This is essential for ping-pong rendering to preserve cached frames
    try {
      // Attempt to disable auto-clearing on the pass
      if (scenePass.autoClear !== undefined) {
        // Store original autoClear state
        this.originalAutoClear = scenePass.autoClear;
      }

      // Try to access the render target if available
      if (scenePass.renderTarget) {
        // Mark that we found a render target
        this.hasRenderTarget = true;
      }
    } catch (e) {
      // Silently fail if these properties don't exist
      console.warn('Could not configure pass auto-clear:', e.message);
    }

    // Store original autoUpdate state
    this.originalAutoUpdate = this.scene.autoUpdate;

    // Create blend function for color overlay
    // Uses conditional branching so only the selected blend mode is computed
    const blendColorFn = Fn(([base, blend, mode]) => {
      const result = vec3(0).toVar();

      result.assign(blendDodge(base, blend));

      return result
    });

    this.blendColorFn = blendColorFn;
  }

  /**
   * Set whether this section should render on the current frame
   * Part of the ping-pong rendering optimization
   * When false, the scene won't render and will use cached render target output
   */
  setShouldRender(shouldRender) {
    this.shouldRender = shouldRender;

    // Debug: log pass properties only once
    // if (!this._debuggedPassProps && this.scenePass) {
    //   this._debuggedPassProps = true
    // }

    if (this.scene) {
      // Store original states if not already stored
      if (this.originalSceneVisibility === undefined) {
        this.originalSceneVisibility = this.scene.visible;
      }

      // When invisible, the pass should preserve and return its cached render target
      this.scene.visible = shouldRender ? this.originalSceneVisibility : false;

      // Disable autoUpdate to save CPU cycles on matrix calculations when not rendering
      // this.scene.autoUpdate = shouldRender ? this.originalAutoUpdate : false
    }

    // Control the scene pass to preserve render target when not rendering
    if (this.scenePass) {
      // Store original autoClear if not stored
      if (
        this._originalPassAutoClear === undefined &&
        this.scenePass.autoClear !== undefined
      ) {
        this._originalPassAutoClear = this.scenePass.autoClear;
      }

      // When not rendering (shouldRender = false), disable autoClear to preserve cached frame
      // When rendering (shouldRender = true), enable autoClear to render fresh frame
      if (this.scenePass.autoClear !== undefined) {
        this.scenePass.autoClear = shouldRender;
      }
    }
  }

  /**
   * Get the output node with all post-processing effects applied
   * This is called by the MultiSceneCompositor
   *
   * @param {Node} customUV - Optional custom UV coordinates (e.g., with distortion)
   * @returns {Node} The final color output
   */
  getOutputNode(customUV = null) {
    return Fn(() => {
      const baseUV = customUV || uv();
      let samplingUV = baseUV;

      // // Apply fluid-based UV distortion if fluid texture is available
      // if (this.fluidTexture) {
      //   const fluidSample = this.fluidTexture.sample(baseUV)
      //   const fluidDisplacement = fluidSample.rgb
      //     .mul(this.fluidDistortionUniform)
      //     .mul(0.01)
      //   samplingUV = baseUV.add(fluidDisplacement.xy)
      // }

      // Sample scene with potentially distorted UVs
      const sceneColor = this.outputPass.sample(samplingUV).rgb;

      // // Use scene color directly (bloom is now global)
      const color = sceneColor.toVar();

      // If activation uniform is provided, conditionally skip processing when inactive
      // This saves GPU cycles by avoiding unnecessary calculations
      if (this.activationUniform) {
        If(this.activationUniform.greaterThan(0.5), () => {
          // Apply fluid-based brightness boost
          if (this.fluidTexture) {
            const fluidSample = this.fluidTexture.sample(baseUV);
            const fluidIntensity = length(fluidSample.rgb).mul(0.005);
            const brightnessFactor = fluidIntensity
              .mul(this.fluidBrightnessUniform)
              .add(1.0);
            color.mulAssign(brightnessFactor);
          }

          // Apply gradient map based on luminance (if enabled)
          // Recalculate luminance after color adjustments
          const luminanceForGradient = dot(color, vec3(0.299, 0.587, 0.114));
          const gradientColor = mix(
            this.colorRampColor1Uniform,
            this.colorRampColor2Uniform,
            luminanceForGradient
          );
          const gradientMixAmount = this.colorRampEnabledUniform.mul(
            this.colorRampMixUniform
          );
          color.assign(mix(color, gradientColor, gradientMixAmount));

          // Apply color overlay
          const overlayResult = this.blendColorFn(
            color,
            this.overlayColorUniform,
            this.overlayBlendModeUniform
          );

          color.assign(mix(color, overlayResult, this.overlayOpacityUniform));

          // Apply color adjustments: Contrast, Saturation, Hue
          // 1. Contrast adjustment: (color - 0.5) * contrast + 0.5, clamped to prevent inversion
          color.assign(
            clamp(
              color.sub(0.5).mul(this.contrastUniform).add(0.5),
              this.contrastClampMinUniform,
              1.0
            )
          );

          // 2. Saturation adjustment: mix between grayscale and original color
          const luminance = dot(color, vec3(0.299, 0.587, 0.114));
          const grayscale = vec3(luminance);
          color.assign(mix(grayscale, color, this.saturationUniform));

          // 3. Hue adjustment: Use rotation matrix in RGB space (much faster than HSV conversion)
          const hueRadians = this.hueUniform.mul(Math.PI / 180.0);
          const cosA = hueRadians.cos();
          const sinA = hueRadians.sin();

          // Rotation matrix coefficients for hue rotation around luminance axis
          const oneThird = float(1.0 / 3.0);
          const sqrtOneThird = float(Math.sqrt(1.0 / 3.0));

          const a = cosA.add(float(1.0).sub(cosA).mul(oneThird));
          const b = float(1.0)
            .sub(cosA)
            .mul(oneThird)
            .sub(sinA.mul(sqrtOneThird));
          const c = float(1.0)
            .sub(cosA)
            .mul(oneThird)
            .add(sinA.mul(sqrtOneThird));

          // Apply rotation matrix
          const newR = color.r.mul(a).add(color.g.mul(b)).add(color.b.mul(c));
          const newG = color.r.mul(c).add(color.g.mul(a)).add(color.b.mul(b));
          const newB = color.r.mul(b).add(color.g.mul(c)).add(color.b.mul(a));

          color.assign(vec3(newR, newG, newB));

          // Apply vignette
          const vignetteUV = baseUV.sub(0.5).mul(2.0); // -1 to 1
          const dist = length(vignetteUV);
          const vignette = smoothstep(
            this.vignetteSizeUniform.add(this.vignetteStrengthUniform),
            this.vignetteSizeUniform,
            dist
          );
          color.mulAssign(vignette);
        }).Else(() => {
          // When inactive, skip all processing and output black
          color.assign(vec3(0));
        });
      } else {
        // No activation uniform - always process (for sections without activation control)
        // Apply fluid-based brightness boost
        if (this.fluidTexture) {
          const fluidSample = this.fluidTexture.sample(baseUV);
          const fluidIntensity = length(fluidSample.rgb).mul(0.005);
          const brightnessFactor = fluidIntensity
            .mul(this.fluidBrightnessUniform)
            .add(1.0);
          color.mulAssign(brightnessFactor);
        }

        // Apply gradient map based on luminance (if enabled)
        // Recalculate luminance after color adjustments
        const luminanceForGradient = dot(color, vec3(0.299, 0.587, 0.114));
        const gradientColor = mix(
          this.colorRampColor1Uniform,
          this.colorRampColor2Uniform,
          luminanceForGradient
        );
        const gradientMixAmount = this.colorRampEnabledUniform.mul(
          this.colorRampMixUniform
        );
        color.assign(mix(color, gradientColor, gradientMixAmount));

        // Apply color overlay
        const overlayResult = this.blendColorFn(
          color,
          this.overlayColorUniform,
          this.overlayBlendModeUniform
        );

        color.assign(mix(color, overlayResult, this.overlayOpacityUniform));

        // Apply color adjustments: Contrast, Saturation, Hue
        // 1. Contrast adjustment: (color - 0.5) * contrast + 0.5, clamped to prevent inversion
        color.assign(
          clamp(
            color.sub(0.5).mul(this.contrastUniform).add(0.5),
            this.contrastClampMinUniform,
            1.0
          )
        );

        // 2. Saturation adjustment: mix between grayscale and original color
        const luminance = dot(color, vec3(0.299, 0.587, 0.114));
        const grayscale = vec3(luminance);
        color.assign(mix(grayscale, color, this.saturationUniform));

        // 3. Hue adjustment: Use rotation matrix in RGB space (much faster than HSV conversion)
        const hueRadians = this.hueUniform.mul(Math.PI / 180.0);
        const cosA = hueRadians.cos();
        const sinA = hueRadians.sin();

        // Rotation matrix coefficients for hue rotation around luminance axis
        const oneThird = float(1.0 / 3.0);
        const sqrtOneThird = float(Math.sqrt(1.0 / 3.0));

        const a = cosA.add(float(1.0).sub(cosA).mul(oneThird));
        const b = float(1.0).sub(cosA).mul(oneThird).sub(sinA.mul(sqrtOneThird));
        const c = float(1.0).sub(cosA).mul(oneThird).add(sinA.mul(sqrtOneThird));

        // Apply rotation matrix
        const newR = color.r.mul(a).add(color.g.mul(b)).add(color.b.mul(c));
        const newG = color.r.mul(c).add(color.g.mul(a)).add(color.b.mul(b));
        const newB = color.r.mul(b).add(color.g.mul(c)).add(color.b.mul(a));

        color.assign(vec3(newR, newG, newB));

        // Apply vignette
        const vignetteUV = baseUV.sub(0.5).mul(2.0); // -1 to 1
        const dist = length(vignetteUV);
        const vignette = smoothstep(
          this.vignetteSizeUniform.add(this.vignetteStrengthUniform),
          this.vignetteSizeUniform,
          dist
        );
        color.mulAssign(vignette);
      }

      return vec4(color, 1.0)
    })()
  }

  /**
   * Update overlay parameters at runtime
   */
  updateOverlay(color, opacity, blendMode) {
    if (color) {
      this.overlayColorUniform.value
        .setRGB(color.r / 255, color.g / 255, color.b / 255)
        .convertSRGBToLinear();
    }
    if (opacity !== undefined) this.overlayOpacityUniform.value = opacity;
    if (blendMode)
      this.overlayBlendModeUniform.value = this.getBlendModeValue(blendMode);
  }

  /**
   * Update gradient map parameters at runtime
   */
  updateColorRamp(enabled, color1, color2, mixFactor) {
    if (enabled !== undefined)
      this.colorRampEnabledUniform.value = enabled ? 1.0 : 0.0;
    if (color1) {
      this.colorRampColor1Uniform.value
        .setRGB(color1.r / 255, color1.g / 255, color1.b / 255)
        .convertSRGBToLinear();
    }
    if (color2) {
      this.colorRampColor2Uniform.value
        .setRGB(color2.r / 255, color2.g / 255, color2.b / 255)
        .convertSRGBToLinear();
    }
    if (mixFactor !== undefined) this.colorRampMixUniform.value = mixFactor;
  }

  /**
   * Update vignette parameters at runtime
   */
  updateVignette(strength, size) {
    if (strength !== undefined) this.vignetteStrengthUniform.value = strength;
    if (size !== undefined) this.vignetteSizeUniform.value = size;
  }

  /**
   * Update fluid parameters at runtime
   */
  updateFluid(distortion, brightness) {
    if (distortion !== undefined) this.fluidDistortionUniform.value = distortion;
    if (brightness !== undefined) this.fluidBrightnessUniform.value = brightness;
  }

  /**
   * Update color adjustment parameters at runtime
   */
  updateColorAdjustments(contrast, saturation, hue, contrastClampMin) {
    if (contrast !== undefined) this.contrastUniform.value = contrast;
    if (saturation !== undefined) this.saturationUniform.value = saturation;
    if (hue !== undefined) this.hueUniform.value = hue;
    if (contrastClampMin !== undefined)
      this.contrastClampMinUniform.value = contrastClampMin;
  }

  /**
   * Update maximum DPR for this section
   * @param {number} maxDpr - New maximum device pixel ratio
   */
  updateMaxDpr(maxDpr) {
    this.maxDpr = maxDpr;
    // Trigger resize to apply new DPR limit
    if (this.currentWidth > 0 && this.currentHeight > 0) {
      const globalDpr = this.renderer.getPixelRatio();
      const effectiveDpr = Math.min(globalDpr, this.maxDpr);
      this.onResize(this.currentWidth, this.currentHeight, effectiveDpr);
    }
  }

  /**
   * Handle resize with per-scene DPR
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {number} dpr - Device pixel ratio (already clamped by maxDpr)
   */
  onResize(width, height, dpr) {
    this.currentWidth = width;
    this.currentHeight = height;
    this.currentDpr = dpr;

    // Calculate the resolution scale based on global DPR
    // If global DPR is 2.0 and maxDpr is 1.0, we want scale of 0.5
    const globalDpr = this.renderer.getPixelRatio();
    const resolutionScale = dpr / globalDpr;

    // Update scene pass resolution scale
    // This controls the internal render target resolution for this scene
    if (this.scenePass && this.scenePass._resolutionScale !== undefined) {
      this.scenePass._resolutionScale = resolutionScale;

      // Also call setSize with pixel dimensions if available
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);

      if (typeof this.scenePass.setSize === 'function') {
        this.scenePass.setSize(pixelWidth, pixelHeight);
      }
    }
  }
}

const _quadMesh = /*@__PURE__*/ new QuadMesh();
const _size = /*@__PURE__*/ new Vector2();

const _BlurDirectionX = /*@__PURE__*/ new Vector2( 1.0, 0.0 );
const _BlurDirectionY = /*@__PURE__*/ new Vector2( 0.0, 1.0 );

let _rendererState;

/**
 * Post processing node for creating a bloom effect.
 * ```js
 * const postProcessing = new THREE.PostProcessing( renderer );
 *
 * const scenePass = pass( scene, camera );
 * const scenePassColor = scenePass.getTextureNode( 'output' );
 *
 * const bloomPass = bloom( scenePassColor );
 *
 * postProcessing.outputNode = scenePassColor.add( bloomPass );
 * ```
 * By default, the node affects the entire image. For a selective bloom,
 * use the `emissive` material property to control which objects should
 * contribute to bloom or not. This can be achieved via MRT.
 * ```js
 * const postProcessing = new THREE.PostProcessing( renderer );
 *
 * const scenePass = pass( scene, camera );
 * scenePass.setMRT( mrt( {
 * 	output,
 * 	emissive
 * } ) );
 *
 * const scenePassColor = scenePass.getTextureNode( 'output' );
 * const emissivePass = scenePass.getTextureNode( 'emissive' );
 *
 * const bloomPass = bloom( emissivePass );
 * postProcessing.outputNode = scenePassColor.add( bloomPass );
 * ```
 * @augments TempNode
 * @three_import import { bloom } from 'three/addons/tsl/display/BloomNode.js';
 */
class BloomNode extends TempNode {

	static get type() {

		return 'BloomNode';

	}

	/**
	 * Constructs a new bloom node.
	 *
	 * @param {Node<vec4>} inputNode - The node that represents the input of the effect.
	 * @param {number} [strength=1] - The strength of the bloom.
	 * @param {number} [radius=0] - The radius of the bloom.
	 * @param {number} [threshold=0] - The luminance threshold limits which bright areas contribute to the bloom effect.
	 */
	constructor( inputNode, strength = 1, radius = 0, threshold = 0 ) {

		super( 'vec4' );

		/**
		 * The node that represents the input of the effect.
		 *
		 * @type {Node<vec4>}
		 */
		this.inputNode = inputNode;

		/**
		 * The strength of the bloom.
		 *
		 * @type {UniformNode<float>}
		 */
		this.strength = uniform( strength );

		/**
		 * The radius of the bloom. Must be in the range `[0,1]`.
		 *
		 * @type {UniformNode<float>}
		 */
		this.radius = uniform( radius );

		/**
		 * The luminance threshold limits which bright areas contribute to the bloom effect.
		 *
		 * @type {UniformNode<float>}
		 */
		this.threshold = uniform( threshold );

		/**
		 * Can be used to tweak the extracted luminance from the scene.
		 *
		 * @type {UniformNode<float>}
		 */
		this.smoothWidth = uniform( 0.01 );

		/**
		 * An array that holds the render targets for the horizontal blur passes.
		 *
		 * @private
		 * @type {Array<RenderTarget>}
		 */
		this._renderTargetsHorizontal = [];

		/**
		 * An array that holds the render targets for the vertical blur passes.
		 *
		 * @private
		 * @type {Array<RenderTarget>}
		 */
		this._renderTargetsVertical = [];

		/**
		 * The number if blur mips.
		 *
		 * @private
		 * @type {number}
		 */
		this._nMips = 5;

		/**
		 * The render target for the luminance pass.
		 *
		 * @private
		 * @type {RenderTarget}
		 */
		this._renderTargetBright = new RenderTarget( 1, 1, { depthBuffer: false, type: HalfFloatType } );
		this._renderTargetBright.texture.name = 'UnrealBloomPass.bright';
		this._renderTargetBright.texture.generateMipmaps = false;

		//

		for ( let i = 0; i < this._nMips; i ++ ) {

			const renderTargetHorizontal = new RenderTarget( 1, 1, { depthBuffer: false, type: HalfFloatType } );

			renderTargetHorizontal.texture.name = 'UnrealBloomPass.h' + i;
			renderTargetHorizontal.texture.generateMipmaps = false;

			this._renderTargetsHorizontal.push( renderTargetHorizontal );

			const renderTargetVertical = new RenderTarget( 1, 1, { depthBuffer: false, type: HalfFloatType } );

			renderTargetVertical.texture.name = 'UnrealBloomPass.v' + i;
			renderTargetVertical.texture.generateMipmaps = false;

			this._renderTargetsVertical.push( renderTargetVertical );

		}

		/**
		 * The material for the composite pass.
		 *
		 * @private
		 * @type {?NodeMaterial}
		 */
		this._compositeMaterial = null;

		/**
		 * The material for the luminance pass.
		 *
		 * @private
		 * @type {?NodeMaterial}
		 */
		this._highPassFilterMaterial = null;

		/**
		 * The materials for the blur pass.
		 *
		 * @private
		 * @type {Array<NodeMaterial>}
		 */
		this._separableBlurMaterials = [];

		/**
		 * The result of the luminance pass as a texture node for further processing.
		 *
		 * @private
		 * @type {TextureNode}
		 */
		this._textureNodeBright = texture( this._renderTargetBright.texture );

		/**
		 * The result of the first blur pass as a texture node for further processing.
		 *
		 * @private
		 * @type {TextureNode}
		 */
		this._textureNodeBlur0 = texture( this._renderTargetsVertical[ 0 ].texture );

		/**
		 * The result of the second blur pass as a texture node for further processing.
		 *
		 * @private
		 * @type {TextureNode}
		 */
		this._textureNodeBlur1 = texture( this._renderTargetsVertical[ 1 ].texture );

		/**
		 * The result of the third blur pass as a texture node for further processing.
		 *
		 * @private
		 * @type {TextureNode}
		 */
		this._textureNodeBlur2 = texture( this._renderTargetsVertical[ 2 ].texture );

		/**
		 * The result of the fourth blur pass as a texture node for further processing.
		 *
		 * @private
		 * @type {TextureNode}
		 */
		this._textureNodeBlur3 = texture( this._renderTargetsVertical[ 3 ].texture );

		/**
		 * The result of the fifth blur pass as a texture node for further processing.
		 *
		 * @private
		 * @type {TextureNode}
		 */
		this._textureNodeBlur4 = texture( this._renderTargetsVertical[ 4 ].texture );

		/**
		 * The result of the effect is represented as a separate texture node.
		 *
		 * @private
		 * @type {PassTextureNode}
		 */
		this._textureOutput = passTexture( this, this._renderTargetsHorizontal[ 0 ].texture );

		/**
		 * The `updateBeforeType` is set to `NodeUpdateType.FRAME` since the node renders
		 * its effect once per frame in `updateBefore()`.
		 *
		 * @type {string}
		 * @default 'frame'
		 */
		this.updateBeforeType = NodeUpdateType$1.FRAME;

	}

	/**
	 * Returns the result of the effect as a texture node.
	 *
	 * @return {PassTextureNode} A texture node that represents the result of the effect.
	 */
	getTextureNode() {

		return this._textureOutput;

	}

	/**
	 * Sets the size of the effect.
	 *
	 * @param {number} width - The width of the effect.
	 * @param {number} height - The height of the effect.
	 */
	setSize( width, height ) {

		let resx = Math.round( width / 2 );
		let resy = Math.round( height / 2 );

		this._renderTargetBright.setSize( resx, resy );

		for ( let i = 0; i < this._nMips; i ++ ) {

			this._renderTargetsHorizontal[ i ].setSize( resx, resy );
			this._renderTargetsVertical[ i ].setSize( resx, resy );

			this._separableBlurMaterials[ i ].invSize.value.set( 1 / resx, 1 / resy );

			resx = Math.round( resx / 2 );
			resy = Math.round( resy / 2 );

		}

	}

	/**
	 * This method is used to render the effect once per frame.
	 *
	 * @param {NodeFrame} frame - The current node frame.
	 */
	updateBefore( frame ) {

		const { renderer } = frame;

		_rendererState = RendererUtils.resetRendererState( renderer, _rendererState );

		//

		const size = renderer.getDrawingBufferSize( _size );
		this.setSize( size.width, size.height );

		// 1. Extract bright areas

		renderer.setRenderTarget( this._renderTargetBright );
		_quadMesh.material = this._highPassFilterMaterial;
		_quadMesh.name = 'Bloom [ High Pass ]';
		_quadMesh.render( renderer );

		// 2. Blur all the mips progressively

		let inputRenderTarget = this._renderTargetBright;

		for ( let i = 0; i < this._nMips; i ++ ) {

			_quadMesh.material = this._separableBlurMaterials[ i ];

			this._separableBlurMaterials[ i ].colorTexture.value = inputRenderTarget.texture;
			this._separableBlurMaterials[ i ].direction.value = _BlurDirectionX;
			renderer.setRenderTarget( this._renderTargetsHorizontal[ i ] );
			_quadMesh.name = `Bloom [ Blur Horizontal - ${ i } ]`;
			_quadMesh.render( renderer );

			this._separableBlurMaterials[ i ].colorTexture.value = this._renderTargetsHorizontal[ i ].texture;
			this._separableBlurMaterials[ i ].direction.value = _BlurDirectionY;
			renderer.setRenderTarget( this._renderTargetsVertical[ i ] );
			_quadMesh.name = `Bloom [ Blur Vertical - ${ i } ]`;
			_quadMesh.render( renderer );

			inputRenderTarget = this._renderTargetsVertical[ i ];

		}

		// 3. Composite all the mips

		renderer.setRenderTarget( this._renderTargetsHorizontal[ 0 ] );
		_quadMesh.material = this._compositeMaterial;
		_quadMesh.name = 'Bloom [ Composite ]';
		_quadMesh.render( renderer );

		// restore

		RendererUtils.restoreRendererState( renderer, _rendererState );

	}

	/**
	 * This method is used to setup the effect's TSL code.
	 *
	 * @param {NodeBuilder} builder - The current node builder.
	 * @return {PassTextureNode}
	 */
	setup( builder ) {

		// luminosity high pass material

		const luminosityHighPass = Fn( () => {

			const texel = this.inputNode;
			const v = luminance( texel.rgb );

			const alpha = smoothstep( this.threshold, this.threshold.add( this.smoothWidth ), v );

			return mix( vec4( 0 ), texel, alpha );

		} );

		this._highPassFilterMaterial = this._highPassFilterMaterial || new NodeMaterial();
		this._highPassFilterMaterial.fragmentNode = luminosityHighPass().context( builder.getSharedContext() );
		this._highPassFilterMaterial.name = 'Bloom_highPass';
		this._highPassFilterMaterial.needsUpdate = true;

		// gaussian blur materials

		// These sizes have been changed to account for the altered coefficients-calculation to avoid blockiness,
		// while retaining the same blur-strength. For details see https://github.com/mrdoob/three.js/pull/31528
		const kernelSizeArray = [ 6, 10, 14, 18, 22 ];

		for ( let i = 0; i < this._nMips; i ++ ) {

			this._separableBlurMaterials.push( this._getSeparableBlurMaterial( builder, kernelSizeArray[ i ] ) );

		}

		// composite material

		const bloomFactors = uniformArray( [ 1.0, 0.8, 0.6, 0.4, 0.2 ] );
		const bloomTintColors = uniformArray( [ new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ) ] );

		const lerpBloomFactor = Fn( ( [ factor, radius ] ) => {

			const mirrorFactor = float( 1.2 ).sub( factor );
			return mix( factor, mirrorFactor, radius );

		} ).setLayout( {
			name: 'lerpBloomFactor',
			type: 'float',
			inputs: [
				{ name: 'factor', type: 'float' },
				{ name: 'radius', type: 'float' },
			]
		} );


		const compositePass = Fn( () => {

			const color0 = lerpBloomFactor( bloomFactors.element( 0 ), this.radius ).mul( vec4( bloomTintColors.element( 0 ), 1.0 ) ).mul( this._textureNodeBlur0 );
			const color1 = lerpBloomFactor( bloomFactors.element( 1 ), this.radius ).mul( vec4( bloomTintColors.element( 1 ), 1.0 ) ).mul( this._textureNodeBlur1 );
			const color2 = lerpBloomFactor( bloomFactors.element( 2 ), this.radius ).mul( vec4( bloomTintColors.element( 2 ), 1.0 ) ).mul( this._textureNodeBlur2 );
			const color3 = lerpBloomFactor( bloomFactors.element( 3 ), this.radius ).mul( vec4( bloomTintColors.element( 3 ), 1.0 ) ).mul( this._textureNodeBlur3 );
			const color4 = lerpBloomFactor( bloomFactors.element( 4 ), this.radius ).mul( vec4( bloomTintColors.element( 4 ), 1.0 ) ).mul( this._textureNodeBlur4 );

			const sum = color0.add( color1 ).add( color2 ).add( color3 ).add( color4 );

			return sum.mul( this.strength );

		} );

		this._compositeMaterial = this._compositeMaterial || new NodeMaterial();
		this._compositeMaterial.fragmentNode = compositePass().context( builder.getSharedContext() );
		this._compositeMaterial.name = 'Bloom_comp';
		this._compositeMaterial.needsUpdate = true;

		//

		return this._textureOutput;

	}

	/**
	 * Frees internal resources. This method should be called
	 * when the effect is no longer required.
	 */
	dispose() {

		for ( let i = 0; i < this._renderTargetsHorizontal.length; i ++ ) {

			this._renderTargetsHorizontal[ i ].dispose();

		}

		for ( let i = 0; i < this._renderTargetsVertical.length; i ++ ) {

			this._renderTargetsVertical[ i ].dispose();

		}

		this._renderTargetBright.dispose();

		if ( this._highPassFilterMaterial !== null ) this._highPassFilterMaterial.dispose();
		if ( this._compositeMaterial !== null ) this._compositeMaterial.dispose();

		for ( let i = 0; i < this._separableBlurMaterials.length; i ++ ) {

			this._separableBlurMaterials[ i ].dispose();

		}

	}

	/**
	 * Create a separable blur material for the given kernel radius.
	 *
	 * @private
	 * @param {NodeBuilder} builder - The current node builder.
	 * @param {number} kernelRadius - The kernel radius.
	 * @return {NodeMaterial}
	 */
	_getSeparableBlurMaterial( builder, kernelRadius ) {

		const coefficients = [];
		const sigma = kernelRadius / 3;

		for ( let i = 0; i < kernelRadius; i ++ ) {

			coefficients.push( 0.39894 * Math.exp( -0.5 * i * i / ( sigma * sigma ) ) / sigma );

		}

		//

		const colorTexture = texture( null );
		const gaussianCoefficients = uniformArray( coefficients );
		const invSize = uniform( new Vector2() );
		const direction = uniform( new Vector2( 0.5, 0.5 ) );

		const uvNode = uv();
		const sampleTexel = ( uv ) => colorTexture.sample( uv );

		const separableBlurPass = Fn( () => {

			const diffuseSum = sampleTexel( uvNode ).rgb.mul( gaussianCoefficients.element( 0 ) ).toVar();

			Loop( { start: int( 1 ), end: int( kernelRadius ), type: 'int', condition: '<' }, ( { i } ) => {

				const x = float( i );
				const w = gaussianCoefficients.element( i );
				const uvOffset = direction.mul( invSize ).mul( x );
				const sample1 = sampleTexel( uvNode.add( uvOffset ) ).rgb;
				const sample2 = sampleTexel( uvNode.sub( uvOffset ) ).rgb;
				diffuseSum.addAssign( add( sample1, sample2 ).mul( w ) );

			} );

			return vec4( diffuseSum, 1.0 );

		} );

		const separableBlurMaterial = new NodeMaterial();
		separableBlurMaterial.fragmentNode = separableBlurPass().context( builder.getSharedContext() );
		separableBlurMaterial.name = 'Bloom_separable';
		separableBlurMaterial.needsUpdate = true;

		// uniforms
		separableBlurMaterial.colorTexture = colorTexture;
		separableBlurMaterial.direction = direction;
		separableBlurMaterial.invSize = invSize;

		return separableBlurMaterial;

	}

}

/**
 * TSL function for creating a bloom effect.
 *
 * @tsl
 * @function
 * @param {Node<vec4>} node - The node that represents the input of the effect.
 * @param {number} [strength=1] - The strength of the bloom.
 * @param {number} [radius=0] - The radius of the bloom.
 * @param {number} [threshold=0] - The luminance threshold limits which bright areas contribute to the bloom effect.
 * @returns {BloomNode}
 */
const bloom = ( node, strength, radius, threshold ) => nodeObject( new BloomNode( nodeObject( node ), strength, radius, threshold ) );

/**
 * Applies a hash blur effect to the given texture node.
 *
 * The approach of this blur is different compared to Gaussian and box blur since
 * it does not rely on a kernel to apply a convolution. Instead, it reads the base
 * texture multiple times in a random pattern and then averages the samples. A
 * typical artifact of this technique is a slightly noisy appearance of the blur which
 * can be mitigated by increasing the number of iterations (see `repeats` parameter).
 * Compared to Gaussian blur, hash blur requires just a single pass.
 *
 * Reference: {@link https://www.shadertoy.com/view/4lXXWn}.
 *
 * @tsl
 * @function
 * @param {Node<vec4>} textureNode - The texture node that should be blurred.
 * @param {Node<float>} [bluramount=float(0.1)] - This node determines the amount of blur.
 * @param {Object} [options={}] - Additional options for the hash blur effect.
 * @param {Node<float>} [options.repeats=float(45)] - The number of iterations for the blur effect.
 * @param {boolean} [options.premultipliedAlpha=false] - Whether to use premultiplied alpha for the blur effect.
 * @return {Node<vec4>} The blurred texture node.
 */
const hashBlur = /*#__PURE__*/ Fn( ( [ textureNode, bluramount = float( 0.1 ), options = {} ] ) => {

	textureNode = convertToTexture( textureNode );

	const repeats = nodeObject( options.repeats ) || float( 45 );
	const premultipliedAlpha = options.premultipliedAlpha || false;

	const tap = ( uv ) => {

		const sample = textureNode.sample( uv );

		return premultipliedAlpha ? premultiplyAlpha( sample ) : sample;

	};

	const targetUV = textureNode.uvNode || uv();
	const blurred_image = vec4( 0. );

	Loop( { start: 0., end: repeats, type: 'float' }, ( { i } ) => {

		const q = vec2( vec2( cos( degrees( i.div( repeats ).mul( 360. ) ) ), sin( degrees( i.div( repeats ).mul( 360. ) ) ) ).mul( rand( vec2( i, targetUV.x.add( targetUV.y ) ) ).add( bluramount ) ) );
		const uv2 = vec2( targetUV.add( q.mul( bluramount ) ) );
		blurred_image.addAssign( tap( uv2 ) );

	} );

	blurred_image.divAssign( repeats );

	return premultipliedAlpha ? unpremultiplyAlpha( blurred_image ) : blurred_image;

} );

/**
 * MultiSceneCompositor
 *
 * Renders multiple scenes to separate render targets and composites them
 * with scroll-based Y-axis masking for smooth transitions.
 * Each scene has its own camera for independent camera settings.
 */
class MultiSceneCompositor {
  constructor(renderer, defaultCamera) {
    this.renderer = renderer;
    this.mainTheatreSheet = getSceneSheet('Main');

    // Time tracking for deltaTime
    this.lastTime = performance.now();

    // Frame counter for ping-pong rendering
    this.frameCount = 0;

    // Transition state tracking for DPR optimization
    this.isInTransition = false;
    this.transitionMaxDpr = 1.25; // Cap DPR to 1.25 during transitions
    this.currentCanvasWidth = 0;
    this.currentCanvasHeight = 0;
    this.currentGlobalDpr = 1;

    // Section scenes with configuration
    // maxDpr: maximum device pixel ratio for this scene (useful for performance optimization)
    this.scenesConfig = {
      sectionIntro: { maxDpr: Infinity },
      sectionCapabilities: { maxDpr: Infinity },
      sectionPortfolio: { maxDpr: Infinity },
      sectionTechnology: { maxDpr: Infinity },
      sectionOutro: { maxDpr: Infinity }
    };

    // Section scenes
    this.scenes = {
      sectionIntro: new Scene(),
      sectionCapabilities: new Scene(),
      sectionPortfolio: new Scene(),
      sectionTechnology: new Scene(),
      sectionOutro: new Scene()
    };

    // Create individual cameras for each scene
    this.cameras = {
      sectionIntro: this.createCamera(defaultCamera),
      sectionCapabilities: this.createCamera(defaultCamera),
      sectionPortfolio: this.createCamera(defaultCamera),
      sectionTechnology: this.createCamera(defaultCamera),
      sectionOutro: this.createCamera(defaultCamera)
    };

    // Set background colors for each scene
    // this.scenes.sectionInvestors.background = new THREE.Color(0x16213e);
    // this.scenes.sectionPortfolio.background = new THREE.Color(0x0f3460);
    // this.scenes.sectionTeam.background = new THREE.Color(0x533483); // Commented out to allow backgroundNode shader
    // this.scenes.sectionOutro.background = new THREE.Color(0x1a1a2e);

    // Scroll progress uniform (0 to 1 for full page)
    this.scrollProgress = uniform(0);
    this.sceneTimelineProgress = uniform(0);

    // Mask progress uniforms for each transition
    // Each section (except intro) has a maskProgress that controls its transition
    this.maskProgressUniforms = {
      sectionCapabilities: uniform(0), // Controls intro -> investors transition
      sectionPortfolio: uniform(0), // Controls investors -> portfolio transition
      sectionTechnology: uniform(0), // Controls portfolio -> team transition
      sectionOutro: uniform(0) // Controls team -> outro transition
    };

    // Initialize transition effects system
    this.transitionEffects = new TransitionEffects();

    // Section activation uniforms (for conditional rendering)
    this.sectionActivationUniforms = {
      sectionIntro: uniform(1),
      sectionCapabilities: uniform(1),
      sectionPortfolio: uniform(1),
      sectionTechnology: uniform(1),
      sectionOutro: uniform(1)
    };

    // PostProcessing instances will be created after scenes are loaded
    this.postProcessing = {};

    // Global bloom will be initialized after compositor is created
    this.globalBloomPass = null;

    // Create uniforms for global post-processing effects
    this.filmGrainIntensity = uniform(0.05);
    this.brightnessGrainIntensity = uniform(0.0);
    this.chromaticAberrationIntensity = uniform(0.0);
    // this.time = uniform(0.0)
    this.canvasWidth = uniform(1920);
    this.canvasHeight = uniform(1080);
    this.vignetteBlurIntensity = uniform(0.08);
    this.vignetteBlurInner = uniform(0.5);
    this.vignetteBlurOuter = uniform(1.2);
    this.caInner = uniform(0.5);
    this.caOuter = uniform(1.0);
    this.caMin = uniform(0.0);
    this.barrelDistortionStrength = uniform(0.0);
    this.barrelDistortionRadius = uniform(0.5);

    // Stored Theatre-editable values for default and company page presets.
    // These are written by Theatre callbacks and never directly touch the uniforms.
    // The _postFxMixValue (0 = default, 1 = company) is the only thing GSAP animates.
    this._vignetteBlurDefault = { intensity: 0.08, inner: 0.5, outer: 1.2 };
    this._vignetteBlurCompany = { intensity: 0.15, inner: 0.3, outer: 0.9 };
    this._caDefault = { intensity: 0.0, min: 0.0, inner: 0.5, outer: 1.0 };
    this._caCompany = { intensity: 0.003, min: 0.0, inner: 0.3, outer: 0.8 };
    this._barrelDefault = { strength: 0.0, radius: 0.5 };
    this._barrelCompany = { strength: 0.0, radius: 0.5 };
    this._postFxMixValue = 0;

    // Listen for company page enter/leave — only the mix scalar is tweened
    dispatcherSingleton.on('portfolioCompanyEnter', ({ duration } = {}) => {
      this._tweenPostFxMix(1, duration !== undefined ? duration : 2);
    });
    dispatcherSingleton.on('portfolioCompanyLeave', () => {
      this._tweenPostFxMix(0, 2);
    });

    // Setup Theatre.js values for controlling the main timeline progress
    this.setupTheatreValues();
  }

  /**
   * Tween the mix scalar between default (0) and company (1) presets.
   * Theatre values are never touched here — only the mix drives the uniforms.
   * @param {number} target - 0 for default preset, 1 for company preset
   * @param {number} duration - tween duration in seconds
   */
  _tweenPostFxMix(target, duration = 0.6) {
    gsapWithCSS.killTweensOf(this);
    gsapWithCSS.to(this, {
      _postFxMixValue: target,
      duration,
      ease: 'power1.inOut',
      onUpdate: () => this._applyMixedPostFx()
    });
  }

  /**
   * Lerp between stored default and company Theatre values using _postFxMixValue
   * and write the result into the GPU uniforms.
   */
  _applyMixedPostFx() {
    const t = this._postFxMixValue;
    const vd = this._vignetteBlurDefault;
    const vc = this._vignetteBlurCompany;
    const cd = this._caDefault;
    const cc = this._caCompany;

    this.vignetteBlurIntensity.value =
      vd.intensity + (vc.intensity - vd.intensity) * t;
    this.vignetteBlurInner.value = vd.inner + (vc.inner - vd.inner) * t;
    this.vignetteBlurOuter.value = vd.outer + (vc.outer - vd.outer) * t;
    this.chromaticAberrationIntensity.value =
      cd.intensity + (cc.intensity - cd.intensity) * t;
    this.caMin.value = cd.min + (cc.min - cd.min) * t;
    this.caInner.value = cd.inner + (cc.inner - cd.inner) * t;
    this.caOuter.value = cd.outer + (cc.outer - cd.outer) * t;
    const bd = this._barrelDefault;
    const bc = this._barrelCompany;
    this.barrelDistortionStrength.value =
      bd.strength + (bc.strength - bd.strength) * t;
    this.barrelDistortionRadius.value = bd.radius + (bc.radius - bd.radius) * t;
  }

  /**
   * Initialize PostProcessing for all sections
   * Called after scenes are loaded and fluid texture is available
   */
  async setupSectionPostProcessing() {
    // Get fluid texture from store (set by renderer)
    const fluidTexture = store.fluidTexture;

    // Define custom settings per section if needed
    const sectionSettings = {
      sectionIntro: {
        vignetteStrength: 0.2
      },
      sectionCapabilities: {
        vignetteStrength: 0.3
      },
      sectionPortfolio: {
        vignetteStrength: 0.3
      },
      sectionTechnology: {
        vignetteStrength: 0.3,
        fluidDistortion: 0.002,
        fluidBrightness: 0.5
      },
      sectionOutro: {
        vignetteStrength: 0.25
      }
    };

    // Create PostProcessing for each section
    Object.keys(this.scenes).forEach((sectionId) => {
      const maxDpr = this.scenesConfig[sectionId]?.maxDpr || Infinity;
      this.postProcessing[sectionId] = new SectionPostProcessing(
        this.renderer,
        this.scenes[sectionId],
        this.cameras[sectionId],
        {
          fluidTexture,
          settings: sectionSettings[sectionId],
          activationUniform: this.sectionActivationUniforms[sectionId],
          maxDpr
        }
      );
    });

    this.setupPostProcessingTheatreControls();
  }

  /**
   * Setup Theatre.js controls for each section's PostProcessing
   * Uses section-specific sheets instead of the main sheet
   */
  setupPostProcessingTheatreControls() {
    // Create Theatre.js objects for each section's PostProcessing
    Object.keys(this.postProcessing).forEach((sectionId) => {
      const pp = this.postProcessing[sectionId];

      // Get the section-specific Theatre.js sheet
      const sectionSheet = getSceneSheet(sectionId);

      if (!sectionSheet) {
        console.warn(
          `Theatre.js sheet not found for ${sectionId} - skipping PostProcessing controls`
        );
        return
      }

      // Vignette controls
      const vignetteObject = sectionSheet.object('PostProcessing / Vignette', {
        strength: distExports.types.number(pp.vignetteStrengthUniform.value, {
          range: [0, 1],
          precision: 0.01
        }),
        size: distExports.types.number(pp.vignetteSizeUniform.value, {
          range: [0, 2],
          precision: 0.01
        })
      });

      vignetteObject.onValuesChange((values) => {
        pp.updateVignette(values.strength, values.size);
      });

      // Color Overlay controls
      const overlayObject = sectionSheet.object('PostProcessing / Overlay', {
        color: distExports.types.rgba({
          r: pp.overlayColorUniform.value.r * 255,
          g: pp.overlayColorUniform.value.g * 255,
          b: pp.overlayColorUniform.value.b * 255,
          a: 1.0
        }),
        opacity: distExports.types.number(pp.overlayOpacityUniform.value, {
          range: [0, 1],
          precision: 0.01
        }),
        blendMode: distExports.types.stringLiteral('normal', {
          normal: 'normal',
          multiply: 'multiply',
          screen: 'screen',
          overlay: 'overlay',
          add: 'add',
          burn: 'burn',
          dodge: 'dodge'
        })
      });

      overlayObject.onValuesChange((values) => {
        pp.updateOverlay(
          {
            r: values.color.r * 255,
            g: values.color.g * 255,
            b: values.color.b * 255
          },
          values.opacity,
          values.blendMode
        );
      });

      // Gradient Map controls (luminance-based color remapping)
      const colorRampObject = sectionSheet.object(
        'PostProcessing / Gradient Map',
        {
          enabled: distExports.types.boolean(pp.colorRampEnabledUniform.value > 0.5),
          colorDark: distExports.types.rgba({
            r: pp.colorRampColor1Uniform.value.r * 255,
            g: pp.colorRampColor1Uniform.value.g * 255,
            b: pp.colorRampColor1Uniform.value.b * 255,
            a: 1.0
          }),
          colorBright: distExports.types.rgba({
            r: pp.colorRampColor2Uniform.value.r * 255,
            g: pp.colorRampColor2Uniform.value.g * 255,
            b: pp.colorRampColor2Uniform.value.b * 255,
            a: 1.0
          }),
          mix: distExports.types.number(pp.colorRampMixUniform.value, {
            range: [0, 1],
            precision: 0.01
          })
        }
      );

      colorRampObject.onValuesChange((values) => {
        pp.updateColorRamp(
          values.enabled,
          {
            r: values.colorDark.r * 255,
            g: values.colorDark.g * 255,
            b: values.colorDark.b * 255
          },
          {
            r: values.colorBright.r * 255,
            g: values.colorBright.g * 255,
            b: values.colorBright.b * 255
          },
          values.mix
        );
      });

      // Fluid controls (only if section has fluid texture)
      if (pp.fluidTexture) {
        const fluidObject = sectionSheet.object('PostProcessing / Fluid', {
          distortion: distExports.types.number(pp.fluidDistortionUniform.value, {
            range: [0, 0.01],
            precision: 0.0001
          }),
          brightness: distExports.types.number(pp.fluidBrightnessUniform.value, {
            range: [0, 5],
            precision: 0.1
          })
        });

        fluidObject.onValuesChange((values) => {
          pp.updateFluid(values.distortion, values.brightness);
        });
      }

      // Color Adjustments controls
      const colorAdjustmentsObject = sectionSheet.object(
        'PostProcessing / Color Adjustments',
        {
          contrast: distExports.types.number(pp.contrastUniform.value, {
            range: [0, 2],
            precision: 0.01
          }),
          contrastClampMin: distExports.types.number(pp.contrastClampMinUniform.value, {
            range: [-0.1, 0.1],
            precision: 0.001
          }),
          saturation: distExports.types.number(pp.saturationUniform.value, {
            range: [0, 2],
            precision: 0.01
          }),
          hue: distExports.types.number(pp.hueUniform.value, {
            range: [-180, 180],
            precision: 0.1
          })
        }
      );

      colorAdjustmentsObject.onValuesChange((values) => {
        pp.updateColorAdjustments(
          values.contrast,
          values.saturation,
          values.hue,
          values.contrastClampMin
        );
      });
    });
  }

  setupTheatreValues() {
    // Theatre.js should always be initialized, but check just in case
    if (!this.mainTheatreSheet) {
      console.warn(
        'Theatre.js not initialized - skipping theatre setup. Animation timeline will not work!'
      );
      return
    }

    this.theatreObject = this.mainTheatreSheet.object('Multi scene progress', {
      sceneProgress: distExports.types.number(0, { range: [0, 1], precision: 0.0001 })
    });

    this.theatreObject.onValuesChange((values) => {
      this.sceneTimelineProgress.value = values.sceneProgress;
    });

    this.transitionTheatreObject = this.mainTheatreSheet.object(
      'Transition Effects',
      {
        frequency: distExports.types.number(5.0, { range: [0, 20], precision: 0.1 }),
        angle: distExports.types.number(45, { range: [0, 360], precision: 1 }),
        amplitude: distExports.types.number(0.2, { range: [0, 1], precision: 0.01 }),
        edgeSoftness: distExports.types.number(0.05, { range: [0, 0.5], precision: 0.01 }),
        waveSpeed: distExports.types.number(0.5, { range: [0, 5], precision: 0.1 }),
        velocityInfluenceAngle: distExports.types.number(15, {
          range: [0, 90],
          precision: 1
        }),
        velocityInfluenceAmplitude: distExports.types.number(0.15, {
          range: [0, 0.5],
          precision: 0.01
        }),
        velocityLerpFactor: distExports.types.number(0.15, {
          range: [0.01, 1],
          precision: 0.01
        })
      }
    );

    this.transitionTheatreObject.onValuesChange((values) => {
      this.transitionEffects.updateParameters({
        frequency: values.frequency,
        angle: values.angle,
        amplitude: values.amplitude,
        edgeSoftness: values.edgeSoftness,
        waveSpeed: values.waveSpeed,
        velocityInfluenceAngle: values.velocityInfluenceAngle,
        velocityInfluenceAmplitude: values.velocityInfluenceAmplitude,
        velocityLerpFactor: values.velocityLerpFactor
      });
    });

    // Global Bloom controls
    this.globalBloomObject = this.mainTheatreSheet.object(
      'Global PostProcessing - Bloom',
      {
        threshold: distExports.types.number(0.8, {
          range: [0, 1],
          precision: 0.001
        }),
        strength: distExports.types.number(0.3, {
          range: [0, 3],
          precision: 0.01
        }),
        radius: distExports.types.number(0.5, {
          range: [0, 2],
          precision: 0.01
        })
      }
    );

    this.globalBloomObject.onValuesChange((values) => {
      if (this.globalBloomPass) {
        this.globalBloomPass.threshold.value = values.threshold;
        this.globalBloomPass.strength.value = values.strength;
        this.globalBloomPass.radius.value = values.radius;
      }
    });

    // Film Grain controls
    this.filmGrainObject = this.mainTheatreSheet.object(
      'Global PostProcessing - Film Grain',
      {
        intensity: distExports.types.number(0.05, {
          range: [0, 1],
          precision: 0.001
        }),
        brightness: distExports.types.number(0.0, {
          range: [0, 1],
          precision: 0.001
        })
      }
    );

    this.filmGrainObject.onValuesChange((values) => {
      this.filmGrainIntensity.value = values.intensity;
      this.brightnessGrainIntensity.value = values.brightness;
    });

    // Barrel Distortion — Default preset
    this.barrelDistortionDefaultObject = this.mainTheatreSheet.object(
      'Global PostProcessing - Barrel Distortion / Default',
      {
        strength: distExports.types.number(0.0, { range: [0, 5], precision: 0.001 }),
        radius: distExports.types.number(0.5, { range: [0.01, 2], precision: 0.001 })
      }
    );

    this.barrelDistortionDefaultObject.onValuesChange((values) => {
      this._barrelDefault.strength = values.strength;
      this._barrelDefault.radius = values.radius;
      this._applyMixedPostFx();
    });

    // Barrel Distortion — Company page preset
    this.barrelDistortionCompanyObject = this.mainTheatreSheet.object(
      'Global PostProcessing - Barrel Distortion / Company',
      {
        strength: distExports.types.number(0.0, { range: [0, 5], precision: 0.001 }),
        radius: distExports.types.number(0.5, { range: [0.01, 2], precision: 0.001 })
      }
    );

    this.barrelDistortionCompanyObject.onValuesChange((values) => {
      this._barrelCompany.strength = values.strength;
      this._barrelCompany.radius = values.radius;
      this._applyMixedPostFx();
    });

    // Chromatic Aberration — Default preset (editable in Theatre, feeds the mix)
    this.caDefaultObject = this.mainTheatreSheet.object(
      'Global PostProcessing - Chromatic Aberration / Default',
      {
        intensity: distExports.types.number(0.0, { range: [0, 10], precision: 0.0001 }),
        min: distExports.types.number(0.0, { range: [0, 1], precision: 0.0001 }),
        inner: distExports.types.number(0.5, { range: [0, 1], precision: 0.01 }),
        outer: distExports.types.number(1.0, { range: [0, 1], precision: 0.01 })
      }
    );

    this.caDefaultObject.onValuesChange((values) => {
      this._caDefault.intensity = values.intensity * 0.003;
      this._caDefault.min = values.min * 0.003;
      this._caDefault.inner = values.inner;
      this._caDefault.outer = values.outer;
      this._applyMixedPostFx();
    });

    // Chromatic Aberration — Company page preset
    this.caCompanyObject = this.mainTheatreSheet.object(
      'Global PostProcessing - Chromatic Aberration / Company',
      {
        intensity: distExports.types.number(1.0, { range: [0, 10], precision: 0.0001 }),
        min: distExports.types.number(0.0, { range: [0, 1], precision: 0.0001 }),
        inner: distExports.types.number(0.3, { range: [0, 1], precision: 0.01 }),
        outer: distExports.types.number(0.8, { range: [0, 1], precision: 0.01 })
      }
    );

    this.caCompanyObject.onValuesChange((values) => {
      this._caCompany.intensity = values.intensity * 0.003;
      this._caCompany.min = values.min * 0.003;
      this._caCompany.inner = values.inner;
      this._caCompany.outer = values.outer;
      this._applyMixedPostFx();
    });

    // Vignette Blur — Default preset
    this.vignetteBlurDefaultObject = this.mainTheatreSheet.object(
      'Global PostProcessing - Vignette Blur / Default',
      {
        intensity: distExports.types.number(0.08, { range: [0, 0.3], precision: 0.001 }),
        inner: distExports.types.number(0.5, { range: [0, 2], precision: 0.01 }),
        outer: distExports.types.number(1.2, { range: [0, 3], precision: 0.01 })
      }
    );

    this.vignetteBlurDefaultObject.onValuesChange((values) => {
      this._vignetteBlurDefault.intensity = values.intensity;
      this._vignetteBlurDefault.inner = values.inner;
      this._vignetteBlurDefault.outer = values.outer;
      this._applyMixedPostFx();
    });

    // Vignette Blur — Company page preset
    this.vignetteBlurCompanyObject = this.mainTheatreSheet.object(
      'Global PostProcessing - Vignette Blur / Company',
      {
        intensity: distExports.types.number(0.15, { range: [0, 0.3], precision: 0.001 }),
        inner: distExports.types.number(0.3, { range: [0, 2], precision: 0.01 }),
        outer: distExports.types.number(0.9, { range: [0, 3], precision: 0.01 })
      }
    );

    this.vignetteBlurCompanyObject.onValuesChange((values) => {
      this._vignetteBlurCompany.intensity = values.intensity;
      this._vignetteBlurCompany.inner = values.inner;
      this._vignetteBlurCompany.outer = values.outer;
      this._applyMixedPostFx();
    });

    // Scroll Limits controls - allows editing scroll constraints in Theatre.js
    this.scrollLimitsObject = this.mainTheatreSheet.object('Scroll Limits', {
      postIntroMin: distExports.types.number(1.5, {
        range: [0, 10],
        precision: 0.1
      }),
      postIntroMax: distExports.types.number(6.5, {
        range: [0, 20],
        precision: 0.1
      })
    });

    this.scrollLimitsObject.onValuesChange((values) => {
      // Send scroll limits to main thread
      dispatcherSingleton.trigger(
        { name: 'scrollLimitsUpdate' },
        {
          postIntroMin: values.postIntroMin,
          postIntroMax: values.postIntroMax
        }
      );
    });

    // Send initial scroll limit values immediately
    const initialScrollLimits = this.scrollLimitsObject.value;
    dispatcherSingleton.trigger(
      { name: 'scrollLimitsUpdate' },
      {
        postIntroMin: initialScrollLimits.postIntroMin,
        postIntroMax: initialScrollLimits.postIntroMax
      }
    );

    // Create individual Scene Activation objects for each section
    this.sceneActivationObjects = {};
    Object.keys(this.scenes).forEach((sectionId) => {
      const sectionSheet = getSceneSheet(sectionId);
      if (!sectionSheet) {
        console.warn(
          `Theatre.js sheet not found for ${sectionId} - skipping Scene UI Activation`
        );
        return
      }
      this.sceneActivationObjects[sectionId] = sectionSheet.object(
        'Scene Activation',
        {
          active: distExports.types.boolean(false)
        }
      );
    });

    // Create individual Scene UI Activation objects for each section
    // These are created on section-specific sheets
    this.sceneUIActivationObjects = {};
    Object.keys(this.scenes).forEach((sectionId) => {
      const sectionSheet = getSceneSheet(sectionId);

      if (!sectionSheet) {
        console.warn(
          `Theatre.js sheet not found for ${sectionId} - skipping Scene UI Activation`
        );
        return
      }

      this.sceneUIActivationObjects[sectionId] = sectionSheet.object(
        'Scene UI Activation',
        {
          active: distExports.types.boolean(false)
        }
      );
    });

    // Track previous visibility states to detect changes
    this.previousVisibility = {
      sectionIntro: true,
      sectionCapabilities: true,
      sectionPortfolio: true,
      sectionTechnology: true,
      sectionOutro: true
    };

    // Track previous UI visibility states to detect changes
    this.previousUIVisibility = {
      sectionIntro: true,
      sectionCapabilities: true,
      sectionPortfolio: true,
      sectionTechnology: true,
      sectionOutro: true
    };

    // Flag to emit initial state on first update
    this.hasEmittedInitialState = false;

    // Create maskProgress Theatre.js objects for each section
    // Each section (except intro) controls the mask for its incoming transition
    this.maskProgressObjects = {};
    const maskProgressSections = [
      'sectionCapabilities',
      'sectionPortfolio',
      'sectionTechnology',
      'sectionOutro'
    ];

    maskProgressSections.forEach((sectionId) => {
      const sectionSheet = getSceneSheet(sectionId);

      if (!sectionSheet) {
        console.warn(
          `Theatre.js sheet not found for ${sectionId} - skipping maskProgress controls`
        );
        return
      }

      this.maskProgressObjects[sectionId] = sectionSheet.object(
        'Mask Progress',
        {
          maskProgress: distExports.types.number(0, { range: [0, 1], precision: 0.0001 })
        }
      );

      this.maskProgressObjects[sectionId].onValuesChange((values) => {
        if (this.maskProgressUniforms[sectionId]) {
          this.maskProgressUniforms[sectionId].value = values.maskProgress;
        }
      });
    });

    // Snap Settings — editable snap point and start breakpoint per section sheet
    // Intro has no startBreakpoint (it's the first section)
    this.snapSettingsObjects = {};
    const snapSettingsConfig = {
      sectionIntro: { snapPoint: 1.5 },
      sectionCapabilities: { snapPoint: 3, startBreakpoint: 2.05 },
      sectionPortfolio: { snapPoint: 4.5, startBreakpoint: 3.35 },
      sectionTechnology: { snapPoint: 5.5, startBreakpoint: 5 },
      sectionOutro: { snapPoint: 6.5, startBreakpoint: 6 }
    };

    Object.entries(snapSettingsConfig).forEach(([sectionId, defaults]) => {
      const sectionSheet = getSceneSheet(sectionId);
      if (!sectionSheet) return

      const props = {
        snapPoint: distExports.types.number(defaults.snapPoint, {
          range: [0, 15],
          precision: 0.01
        })
      };
      if (defaults.startBreakpoint !== undefined) {
        props.startBreakpoint = distExports.types.number(defaults.startBreakpoint, {
          range: [0, 15],
          precision: 0.01
        });
      }

      this.snapSettingsObjects[sectionId] = sectionSheet.object(
        'Snap Settings',
        props
      );

      this.snapSettingsObjects[sectionId].onValuesChange((values) => {
        dispatcherSingleton.trigger(
          { name: 'snapSettingsUpdate' },
          {
            sectionId,
            snapPoint: values.snapPoint,
            startBreakpoint: values.startBreakpoint
          }
        );
      });
    });

    // Send initial snap settings to main thread
    Object.entries(this.snapSettingsObjects).forEach(([sectionId, obj]) => {
      dispatcherSingleton.trigger(
        { name: 'snapSettingsUpdate' },
        {
          sectionId: sectionId === 'sectionCapabilities' ? 'sectionInvestors' : (sectionId === 'sectionTechnology' ? 'sectionTeam' : sectionId),
          snapPoint: obj.value.snapPoint,
          startBreakpoint: obj.value.startBreakpoint
        }
      );
    });
  }

  /**
   * Emit initial UI visibility state to Vue components
   * Called once on first update to ensure components know their initial state
   */
  emitInitialState() {
    if (this.sceneUIActivationObjects) {
      Object.keys(this.sceneUIActivationObjects).forEach((sceneKey) => {
        const isUIVisible = this.sceneUIActivationObjects[sceneKey].value.active;

        dispatcherSingleton.trigger(
          { name: 'sceneUIVisibilityChanged' },
          {
            section: sceneKey === 'sectionCapabilities' ? 'sectionInvestors' : (sceneKey === 'sectionTechnology' ? 'sectionTeam' : sceneKey),
            visible: isUIVisible
          }
        );

        // Update previous state to match current
        this.previousUIVisibility[sceneKey] = isUIVisible;
      });
    }
  }

  createCompositor() {
    const uvCoord = uv();

    // Get each section's post-processed output
    // Each SectionPostProcessing handles its own activation uniform internally
    // Inactive sections will return black (vec4(0, 0, 0, 1))
    const introTex = this.postProcessing.sectionIntro
      ? this.postProcessing.sectionIntro.getOutputNode(uvCoord)
      : vec4(0, 0, 0, 1);

    const investorsTex = this.postProcessing.sectionCapabilities
      ? this.postProcessing.sectionCapabilities.getOutputNode(uvCoord)
      : vec4(0, 0, 0, 1);

    const portfolioTex = this.postProcessing.sectionPortfolio
      ? this.postProcessing.sectionPortfolio.getOutputNode(uvCoord)
      : vec4(0, 0, 0, 1);

    const teamTex = this.postProcessing.sectionTechnology
      ? this.postProcessing.sectionTechnology.getOutputNode(uvCoord)
      : vec4(0, 0, 0, 1);

    const outroTex = this.postProcessing.sectionOutro
      ? this.postProcessing.sectionOutro.getOutputNode(uvCoord)
      : vec4(0, 0, 0, 1);

    // Use maskProgress uniforms for each transition
    // These are controlled by Theatre.js on each section's sheet
    const maskProgressCapabilities = this.maskProgressUniforms.sectionCapabilities;
    const maskProgressPortfolio = this.maskProgressUniforms.sectionPortfolio;
    const maskProgressTechnology = this.maskProgressUniforms.sectionTechnology;
    const maskProgressOutro = this.maskProgressUniforms.sectionOutro;

    // Create diagonal wave transition masks using maskProgress uniforms
    const mask1to2 = this.transitionEffects.createDiagonalWave(
      uvCoord,
      maskProgressCapabilities
    );
    const blend1_2 = this.transitionEffects.blend(
      introTex,
      investorsTex,
      mask1to2
    );

    const mask2to3 = this.transitionEffects.createDiagonalWave(
      uvCoord,
      maskProgressPortfolio
    );
    const blend2_3 = this.transitionEffects.blend(
      blend1_2,
      portfolioTex,
      mask2to3
    );

    const mask3to4 = this.transitionEffects.createDiagonalWave(
      uvCoord,
      maskProgressTechnology
    );
    const blend3_4 = this.transitionEffects.blend(blend2_3, teamTex, mask3to4);

    const mask4to5 = this.transitionEffects.createDiagonalWave(
      uvCoord,
      maskProgressOutro
    );
    const blend4_5 = this.transitionEffects.blend(blend3_4, outroTex, mask4to5);

    // Final composite (bloom will be applied globally in getOutputNode)
    return blend4_5
  }

  // Get the compositor output node with global bloom, film grain, and chromatic aberration
  // Note: Fluid distortion is handled per-section in SectionPostProcessing,
  // and global effects (bloom, grain, CA) are applied to the final composite
  getOutputNode() {
    // Set up blue noise texture node from preloaded resources
    if (!this.blueNoiseNode && loader.resources.blueNoiseTexture?.asset) {
      const blueNoiseAsset = loader.resources.blueNoiseTexture.asset;
      blueNoiseAsset.wrapS = RepeatWrapping;
      blueNoiseAsset.wrapT = RepeatWrapping;
      this.blueNoiseNode = texture(blueNoiseAsset);
    }

    const composite = this.createCompositor();

    if (!this.globalBloomPass) {
      const bloomStrength = uniform(0.3);
      const bloomRadius = uniform(0.5);
      const bloomThreshold = uniform(0.8);

      this.globalBloomPass = bloom(
        composite,
        bloomStrength,
        bloomRadius,
        bloomThreshold
      );

      this.globalBloomPass.strength = bloomStrength;
      this.globalBloomPass.radius = bloomRadius;
      this.globalBloomPass.threshold = bloomThreshold;
    }

    // This is just a vec4/color node
    const bloomResult = composite.add(this.globalBloomPass);

    // Turn it into a sampleable texture node
    const bloomTexture = convertToTexture(bloomResult);

    // CA pass: chromatic aberration scaled by vignette distance from center
    const caTexture = convertToTexture(
      Fn(() => {
        const uvCoord = uv();

        // Barrel distortion: positive strength = barrel (bulge), negative = pincushion.
        // Aspect-correct: scale x by aspect ratio so distortion is radially symmetric.
        // Radius: normalises r so strength is consistent regardless of screen size.
        const p = uvCoord.sub(0.5);
        const aspect = this.canvasWidth.div(this.canvasHeight);
        const pAspect = vec2(p.x.mul(aspect), p.y);
        const r2 = pAspect
          .dot(pAspect)
          .div(this.barrelDistortionRadius.mul(this.barrelDistortionRadius));
        const distortedUV = p
          .mul(float(1.0).sub(this.barrelDistortionStrength.mul(r2)))
          .add(0.5);

        const dist = uvCoord.sub(0.5).mul(2.0).length();
        const caOffset = smoothstep(this.caInner, this.caOuter, dist)
          .mul(this.chromaticAberrationIntensity)
          .add(this.caMin);
        const r = texture(
          bloomTexture,
          distortedUV.add(vec2(caOffset, caOffset.mul(0.5)))
        ).r;
        const g = texture(bloomTexture, distortedUV).g;
        const b = texture(
          bloomTexture,
          distortedUV.sub(vec2(caOffset, caOffset.mul(0.5)))
        ).b;
        return vec4(r, g, b, 1.0)
      })()
    );

    const finalWithEffects = Fn(() => {
      const uvCoord = uv();
      const dist = uvCoord.sub(0.5).mul(2.0).length();

      // Vignette blur applied to the CA texture
      const blurAmount = smoothstep(
        this.vignetteBlurInner,
        this.vignetteBlurOuter,
        dist
      ).mul(this.vignetteBlurIntensity);
      const colorAfterVignette = hashBlur(caTexture, blurAmount, {
        repeats: float(5)
      }).rgb;

      let finalColor = colorAfterVignette;

      if (this.blueNoiseNode) {
        const resolutionScale = store.isMobile ? 8 : 64;
        // Sample blue noise at 1:1 pixel density (64x64 texture tiled across screen)
        const blueNoiseUV = uvCoord.mul(
          vec2(this.canvasWidth, this.canvasHeight).div(resolutionScale)
        );
        const grainNoise = this.blueNoiseNode.sample(blueNoiseUV);

        finalColor = mix(
          colorAfterVignette,
          colorAfterVignette.sub(0.025).mul(grainNoise),
          0.5
        );

        finalColor = mix(
          colorAfterVignette,
          finalColor,
          this.filmGrainIntensity
        );
      }
      const brightnessNoise = finalColor.mul(this.brightnessGrainIntensity);
      finalColor = finalColor.add(brightnessNoise);

      return finalColor
    })();

    return finalWithEffects
  }

  updateScroll(progress, total, velocity = 0) {
    if (this.mainTheatreSheet) {
      const progressMapped = mapTo(progress, 0, 1, 0, total);
      this.mainTheatreSheet.sequence.position = progressMapped;

      // sync section sheets
      Object.keys(this.scenes).forEach((sectionId) => {
        const sectionSheet = getSceneSheet(sectionId);
        if (sectionSheet) {
          sectionSheet.sequence.position = progressMapped;
        }
      });

      // WORKAROUND: onValuesChange doesn't fire in web workers
      if (this.theatreObject) {
        this.sceneTimelineProgress.value =
          this.theatreObject.value.sceneProgress;
      }

      // WORKAROUND: onValuesChange doesn't fire in web workers — poll maskProgress directly
      if (typeof window === 'undefined' && this.maskProgressObjects) {
        for (const sectionId in this.maskProgressObjects) {
          if (this.maskProgressUniforms[sectionId]) {
            this.maskProgressUniforms[sectionId].value =
              this.maskProgressObjects[sectionId].value.maskProgress;
          }
        }
      }

      // WORKAROUND: onValuesChange doesn't fire in web workers — poll snap settings and dispatch on change
      if (typeof window === 'undefined' && this.snapSettingsObjects) {
        for (const [sectionId, obj] of Object.entries(
          this.snapSettingsObjects
        )) {
          const values = obj.value;
          const prev = this._prevSnapSettings?.[sectionId];
          if (
            !prev ||
            prev.snapPoint !== values.snapPoint ||
            prev.startBreakpoint !== values.startBreakpoint
          ) {
            dispatcherSingleton.trigger(
              { name: 'snapSettingsUpdate' },
              {
                sectionId: sectionId === 'sectionCapabilities' ? 'sectionInvestors' : (sectionId === 'sectionTechnology' ? 'sectionTeam' : sectionId),
                snapPoint: values.snapPoint,
                startBreakpoint: values.startBreakpoint
              }
            );
            if (!this._prevSnapSettings) this._prevSnapSettings = {};
            this._prevSnapSettings[sectionId] = {
              snapPoint: values.snapPoint,
              startBreakpoint: values.startBreakpoint
            };
          }
        }
      }
    }

    if (this.transitionEffects && velocity !== undefined) {
      this.transitionEffects.updateVelocity(velocity);
    }
  }

  /**
   * Determine which scenes are currently active based on Theatre.js Scene Activation state
   * This replaces the old scroll-based activation with direct Theatre.js control
   */
  getActiveScenes() {
    const activeScenes = [];

    // Read active state directly from Theatre.js Scene Activation objects
    if (this.sceneActivationObjects) {
      Object.keys(this.sceneActivationObjects).forEach((sceneKey) => {
        const activationObject = this.sceneActivationObjects[sceneKey];
        if (activationObject && activationObject.value.active === true) {
          activeScenes.push(sceneKey);
        }
      });
    }

    return activeScenes
  }

  /**
   * Update transition effects each frame
   * Call this from the render loop
   */
  update() {
    // Increment frame counter
    this.frameCount++;

    // Get currently active scenes from Theatre.js Scene Activation state
    const activeScenes = this.getActiveScenes();

    // Ping-pong logic: alternate between active scenes
    // If 2 scenes are active, render one on even frames, the other on odd frames
    const shouldRenderMap = {};

    // Initialize all scenes as disabled
    Object.keys(this.scenes).forEach((sceneKey) => {
      shouldRenderMap[sceneKey] = false;
    });

    if (activeScenes.length === 2) {
      // Ping-pong between the two active scenes
      const renderFirst = this.frameCount % 2 === 0;
      shouldRenderMap[activeScenes[0]] = renderFirst;
      shouldRenderMap[activeScenes[1]] = !renderFirst;
    } else {
      // Only one scene active (or none), render it normally
      activeScenes.forEach((scene) => {
        shouldRenderMap[scene] = true;
      });
    }

    // Update each section's post-processing with shouldRender flag
    // This controls ping-pong optimization (rendering vs cached frame)
    // shouldRenderMap already respects Theatre.js activation state
    Object.keys(this.postProcessing).forEach((sectionId) => {
      if (this.postProcessing[sectionId]) {
        this.postProcessing[sectionId].setShouldRender(
          shouldRenderMap[sectionId] || false
        );
      }
    });

    // Also update scene component instances to skip their onRaf updates
    // Map section IDs to store.scenes keys
    const sceneMapping = {
      sectionIntro: 'intro',
      sectionCapabilities: 'investors',
      sectionPortfolio: 'portfolio',
      sectionTechnology: 'team',
      sectionOutro: 'outro'
    };

    Object.keys(sceneMapping).forEach((sectionId) => {
      const sceneKey = sceneMapping[sectionId];
      const sceneInstance = store.scenes[sceneKey];
      if (
        sceneInstance &&
        typeof sceneInstance.setShouldRender === 'function'
      ) {
        sceneInstance.setShouldRender(shouldRenderMap[sectionId] || false);
      }
    });

    // Dynamic DPR optimization: reduce DPR during transitions (2 scenes active)
    // const wasInTransition = this.isInTransition
    // this.isInTransition = enabledActiveScenes.length === 2

    // // If transition state changed, update DPR for all scenes
    // if (wasInTransition !== this.isInTransition) {
    //   this.applyTransitionDpr()
    // }

    if (this.transitionEffects) {
      const now = performance.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;
      this.transitionEffects.update(deltaTime);
    }

    // Update time uniform for film grain animation
    // this.time.value = performance.now() * 0.001

    // WORKAROUND: onValuesChange doesn't fire in web workers
    // Manually update bloom uniforms from Theatre.js values
    if (this.globalBloomObject && this.globalBloomPass) {
      const bloomValues = this.globalBloomObject.value;
      this.globalBloomPass.threshold.value = bloomValues.threshold;
      this.globalBloomPass.strength.value = bloomValues.strength;
      this.globalBloomPass.radius.value = bloomValues.radius;
    }

    // Manually update film grain uniform
    if (this.filmGrainObject) {
      this.filmGrainIntensity.value = this.filmGrainObject.value.intensity;
    }

    // WORKAROUND: poll the four vignette-blur / CA Theatre objects and feed the stored
    // preset values, then recompute the mixed uniforms via _applyMixedPostFx.
    // (onValuesChange doesn't fire reliably in web workers.)
    let presetsDirty = false;
    if (this.barrelDistortionDefaultObject) {
      this._barrelDefault.strength =
        this.barrelDistortionDefaultObject.value.strength;
      this._barrelDefault.radius =
        this.barrelDistortionDefaultObject.value.radius;
      presetsDirty = true;
    }
    if (this.barrelDistortionCompanyObject) {
      this._barrelCompany.strength =
        this.barrelDistortionCompanyObject.value.strength;
      this._barrelCompany.radius =
        this.barrelDistortionCompanyObject.value.radius;
      presetsDirty = true;
    }
    if (this.vignetteBlurDefaultObject) {
      const v = this.vignetteBlurDefaultObject.value;
      this._vignetteBlurDefault.intensity = v.intensity;
      this._vignetteBlurDefault.inner = v.inner;
      this._vignetteBlurDefault.outer = v.outer;
      presetsDirty = true;
    }
    if (this.vignetteBlurCompanyObject) {
      const v = this.vignetteBlurCompanyObject.value;
      this._vignetteBlurCompany.intensity = v.intensity;
      this._vignetteBlurCompany.inner = v.inner;
      this._vignetteBlurCompany.outer = v.outer;
      presetsDirty = true;
    }
    if (this.caDefaultObject) {
      const v = this.caDefaultObject.value;
      this._caDefault.intensity = v.intensity * 0.003;
      this._caDefault.min = v.min * 0.003;
      this._caDefault.inner = v.inner;
      this._caDefault.outer = v.outer;
      presetsDirty = true;
    }
    if (this.caCompanyObject) {
      const v = this.caCompanyObject.value;
      this._caCompany.intensity = v.intensity * 0.003;
      this._caCompany.min = v.min * 0.003;
      this._caCompany.inner = v.inner;
      this._caCompany.outer = v.outer;
      presetsDirty = true;
    }
    if (presetsDirty) {
      this._applyMixedPostFx();
    }

    // Emit initial state on first update
    if (!this.hasEmittedInitialState) {
      this.emitInitialState();
      this.hasEmittedInitialState = true;
    }

    // Handle 3D scene activation toggles
    // Scene visibility is controlled by Theatre.js activation state, not ping-pong optimization
    if (this.sceneActivationObjects) {
      Object.keys(this.sceneActivationObjects).forEach((sceneKey) => {
        const isVisible = this.sceneActivationObjects[sceneKey].value.active;

        // Update scene visibility based on Theatre.js activation
        if (this.scenes[sceneKey]) {
          this.scenes[sceneKey].visible = isVisible;
        }

        // Update activation uniform (0 = inactive, 1 = active)
        // This controls whether the section contributes to the final composite
        if (this.sectionActivationUniforms[sceneKey]) {
          this.sectionActivationUniforms[sceneKey].value = isVisible ? 1 : 0;
        }

        // Emit event if visibility changed
        if (this.previousVisibility[sceneKey] !== isVisible) {
          dispatcherSingleton.trigger(
            { name: 'sceneVisibilityChanged' },
            {
              section: sceneKey === 'sectionCapabilities' ? 'sectionInvestors' : (sceneKey === 'sectionTechnology' ? 'sectionTeam' : sceneKey),
              visible: isVisible
            }
          );
          this.previousVisibility[sceneKey] = isVisible;
        }
      });
    }

    // Handle UI activation toggles (separate from 3D scene)
    if (this.sceneUIActivationObjects) {
      Object.keys(this.sceneUIActivationObjects).forEach((sceneKey) => {
        const isUIVisible = this.sceneUIActivationObjects[sceneKey].value.active;

        // Emit event if UI visibility changed
        if (this.previousUIVisibility[sceneKey] !== isUIVisible) {
          dispatcherSingleton.trigger(
            { name: 'sceneUIVisibilityChanged' },
            {
              section: sceneKey === 'sectionCapabilities' ? 'sectionInvestors' : (sceneKey === 'sectionTechnology' ? 'sectionTeam' : sceneKey),
              visible: isUIVisible
            }
          );
          this.previousUIVisibility[sceneKey] = isUIVisible;
        }
      });
    }
  }

  createCamera(defaultCamera) {
    const camera = new PerspectiveCamera(
      defaultCamera.fov || 40,
      defaultCamera.aspect || 1,
      defaultCamera.near || 0.1,
      defaultCamera.far || 10000
    );

    camera.position.copy(defaultCamera.position);
    camera.rotation.copy(defaultCamera.rotation);
    camera.quaternion.copy(defaultCamera.quaternion);

    if (defaultCamera.target) {
      camera.target = defaultCamera.target.clone();
      camera.lookAt(camera.target);
    }

    return camera
  }

  getCamera(sectionId) {
    return this.cameras[sectionId]
  }

  getScene(sectionId) {
    return this.scenes[sectionId]
  }

  /**
   * Update scene configuration
   * @param {string} sectionId - The scene key (e.g., 'sectionIntro')
   * @param {object} config - Configuration object (e.g., { maxDpr: 1.5 })
   */
  updateSceneConfig(sectionId, config) {
    if (!this.scenesConfig[sectionId]) {
      console.warn(`Cannot update config for unknown scene: ${sectionId}`);
      return
    }

    this.scenesConfig[sectionId] = {
      ...this.scenesConfig[sectionId],
      ...config
    };

    // If post-processing exists and maxDpr changed, update it
    if (config.maxDpr !== undefined && this.postProcessing[sectionId]) {
      this.postProcessing[sectionId].updateMaxDpr(config.maxDpr);
    }
  }

  /**
   * Get the effective DPR for a specific scene
   * @param {string} sectionId - The scene key
   * @param {number} globalDpr - The global device pixel ratio
   * @returns {number} The clamped DPR for this scene
   */
  getSceneDpr(sectionId, globalDpr) {
    const maxDpr = this.scenesConfig[sectionId]?.maxDpr || Infinity;
    let effectiveDpr = Math.min(globalDpr, maxDpr);

    // Apply transition DPR cap when in transition (2 scenes active)
    if (this.isInTransition) {
      effectiveDpr = Math.min(effectiveDpr, this.transitionMaxDpr);
    }

    return effectiveDpr
  }

  /**
   * Apply transition DPR optimization
   * Called when transition state changes to update all scene DPRs
   */
  // applyTransitionDpr() {
  //   // Only apply if we have valid dimensions
  //   if (
  //     this.currentCanvasWidth === 0 ||
  //     this.currentCanvasHeight === 0 ||
  //     !this.currentGlobalDpr
  //   ) {
  //     return
  //   }

  //   // Reapply DPR to all scenes (will use transition cap if in transition)
  //   Object.keys(this.postProcessing).forEach((sectionId) => {
  //     const sceneDpr = this.getSceneDpr(sectionId, this.currentGlobalDpr)
  //     if (this.postProcessing[sectionId]) {
  //       this.postProcessing[sectionId].onResize(
  //         this.currentCanvasWidth,
  //         this.currentCanvasHeight,
  //         sceneDpr
  //       )
  //     }
  //   })
  // }

  /**
   * Handle resize for all scenes with per-scene DPR clamping
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {number} dpr - Global device pixel ratio
   */
  onResize(width, height, dpr) {
    // Store current dimensions and DPR for transition optimization
    this.currentCanvasWidth = width;
    this.currentCanvasHeight = height;
    this.canvasWidth.value = width * dpr;
    this.canvasHeight.value = height * dpr;
    this.currentGlobalDpr = dpr;

    Object.keys(this.postProcessing).forEach((sectionId) => {
      const sceneDpr = this.getSceneDpr(sectionId, dpr);
      if (this.postProcessing[sectionId]) {
        this.postProcessing[sectionId].onResize(width, height, sceneDpr);
      }
    });
  }

  updateCamerasAspect(aspect) {
    Object.values(this.cameras).forEach((camera) => {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    });
  }

  updateSceneCamera(sectionId, newCamera) {
    if (!this.cameras[sectionId]) {
      console.warn(`Cannot update camera for unknown scene: ${sectionId}`);
      return
    }

    const oldCamera = this.cameras[sectionId];
    this.cameras[sectionId] = newCamera;

    newCamera.aspect = oldCamera.aspect;
    newCamera.updateProjectionMatrix();
  }
}

class RendererImpl extends component(WebGPURenderer, {
  raf: {
    renderPriority: Infinity
  }
}) {
  constructor({ canvas, isWebGPU }) {
    super({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      forceWebGL: !isWebGPU
    });

    this.countRenderBeforeStart = 0;
    this._compiled = false;

    // Color management and tone mapping
    this.toneMapping = ACESFilmicToneMapping;
    this.toneMappingExposure = 1.0;

    // this.shadowMap.enabled = true
    // this.shadowMap.type = THREE.BasicShadowMap;
    // this.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create multi-scene compositor
    this.multiScene = new MultiSceneCompositor(this, camera);

    // Store reference in store for Demo component to access scenes
    store.multiScene = this.multiScene;

    // FX uniforms
    const fxUniforms = {
      distortionStrength: uniform(0.001),
      fluidMix: uniform(0.25),
      fluidTint: uniform(1)
    };
    this.fluidParams = fxUniforms;

    if (!store.isMobile && !store.isFirefox) {
      // Fluid simulation with pointer
      this.fluid = smokeRTT(store.pointerLerp);

      // Store fluid texture node for later use
      this.fluidTexture = this.fluid.getTextureNode();

      // Make fluid texture available to sections via store
      store.fluidTexture = this.fluidTexture;
    }

    // Post-processing will be set up after scenes are loaded in onLoadEnd
  }

  /**
   * Setup post-processing pipeline after all scenes are created
   * This must happen after onLoadEnd so scene instances can contribute their post-processing
   */
  async setupPostProcessing() {
    // 1. Setup per-section post-processing (bloom, vignette, color overlay for each section)
    // Each section has its own post-processing node graph with:
    //   - Fluid distortion
    //   - Activation uniform (controlled by Theatre.js Scene Activation)
    //   - LUT color grading (preloaded .cube files)
    await this.multiScene.setupSectionPostProcessing();

    // 2. Get the compositor output node
    // Each section internally handles its activation state:
    //   - Active sections return their post-processed output
    //   - Inactive sections return black (vec4(0, 0, 0, 1))
    const compositedScene = this.multiScene.getOutputNode();

    // 3. Setup final post-processing pass for compositing
    this.postProcessing = new PostProcessing(this);
    this.postProcessing.outputNode = vec4(compositedScene.rgb, 1.0);
    // this.postProcessing.outputNode = vec4(1.0, 1.0, 0.0, 1.0)
  }

  onResize({ width, height, dpr, ratio }) {
    this.setDrawingBufferSize(width, height, dpr);

    // Update all scene cameras' aspect ratios
    if (this.multiScene) {
      this.multiScene.updateCamerasAspect(ratio);
      // Handle per-scene DPR clamping and resize
      this.multiScene.onResize(width, height, dpr);
    }
  }

  onLoadEnd() {
    this.assetsLoaded = true;
  }

  onCompileEnd() {
    this.sceneCompiled = true;
  }

  onScrollRaf({ progress, total, velocity, scrollEnabled }) {
    if (this.multiScene && scrollEnabled) {
      this.multiScene.updateScroll(progress, total, velocity);
    }
  }

  onDebug({ theatre }) {
    if (!theatre) return

    const { sheet } = theatre;

    // Create Theatre.js objects for FX uniforms
    const fxObject = sheet.object('FX Uniforms', {
      distortionStrength: this.fluidParams.distortionStrength.value,
      fluidMix: this.fluidParams.fluidMix.value,
      fluidTint: this.fluidParams.fluidTint.value
    });

    // Create Theatre.js object for tone mapping
    const toneMappingObject = sheet.object('Tone Mapping', {
      type: distExports.types.stringLiteral('ACESFilmic', {
        NoToneMapping: 'NoToneMapping',
        Linear: 'Linear',
        Reinhard: 'Reinhard',
        Cineon: 'Cineon',
        ACESFilmic: 'ACESFilmic',
        AgX: 'AgX',
        Neutral: 'Neutral'
      }),
      exposure: distExports.types.number(this.toneMappingExposure, {
        range: [0, 3],
        precision: 0.01
      })
    });

    // Subscribe to changes and update uniforms
    fxObject.onValuesChange((values) => {
      this.fluidParams.distortionStrength.value = values.distortionStrength;
      this.fluidParams.fluidMix.value = values.fluidMix;
      this.fluidParams.fluidTint.value = values.fluidTint;
    });

    // Subscribe to tone mapping changes
    toneMappingObject.onValuesChange((values) => {
      // Map string literal to THREE.js tone mapping constant
      const toneMappingTypes = {
        NoToneMapping: NoToneMapping,
        Linear: LinearToneMapping,
        Reinhard: ReinhardToneMapping,
        Cineon: CineonToneMapping,
        ACESFilmic: ACESFilmicToneMapping,
        AgX: AgXToneMapping,
        Neutral: NeutralToneMapping
      };

      // this.outputColorSpace = THREE.LinearSRGBColorSpace;

      this.toneMapping =
        toneMappingTypes[values.type] || ACESFilmicToneMapping;
      this.toneMappingExposure = values.exposure;

      // // Mark post-processing as needing update for WebGPU renderer
      // if (this.postProcessing) {
      //   this.postProcessing.needsUpdate = true
      // }

      // // Force backend update for WebGPU renderer tone mapping changes
      // if (this.backend) {
      //   this.backend.needsUpdate = true
      // }
    });
  }

  onThrottle() {}

  async onRaf() {
    if (!this.sceneCompiled || !this.postProcessing) {
      return
    }

    // Update transition effects (velocity lerping) and activation uniforms
    if (this.multiScene) {
      this.multiScene.update();
    }

    // Render final compositor pass (includes all active section post-processing)
    await this.postProcessing.render();

    // Update and render debug view if active
    const debugView = getDebugView();
    if (debugView) {
      debugView.update();
      await debugView.render();
    }
  }
}

export { RendererImpl as default };
