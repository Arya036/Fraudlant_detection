const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./CP0XR_XO.js","./BBM5j2y-.js","./CEHeSSSx.js","./entry.D6d7nGTd.css"])))=>i.map(i=>d[i]);
import { af as __vitePreload, e as dispatcherSingleton, U as store } from '#entry';

let flushCaptures = null;
const createdPanels = new Set();

// Dynamically import flushCaptures when stats is enabled
async function initStatsCaptures() {
  const { flushCaptures: fc } = await __vitePreload(async () => { const { flushCaptures: fc } = await import('./CP0XR_XO.js');return { flushCaptures: fc }},true              ?__vite__mapDeps([0,1,2,3]):void 0,import.meta.url);
  flushCaptures = fc;
}

class Raf {
  constructor() {
    this.time = self.performance.now();

    /**
     * A reference to the context from `requestAnimationFrame()` can
     * be called (usually `window`).
     *
     * @type {?(Window|XRSession)}
     */
    this._context = typeof self !== 'undefined' ? self : null;

    // Throttled RAF settings
    this._throttledFps = 40;
    this.throttledInterval = 1000 / this._throttledFps; // ~33.33ms for 30fps
    this.lastThrottledTime = 0;

    // Handle pause/resume from main thread visibility changes
    dispatcherSingleton.on('pause', () => {
      this.isPaused = true;
    });

    dispatcherSingleton.on('resume', () => {
      this.isPaused = false;
      this.oldTime = self.performance.now(); // Reset time to prevent huge delta
      this.lastThrottledTime = self.performance.now(); // Reset throttled timer
    });
  }

  /**
   * Get the current FPS setting for the throttled RAF loop
   * @returns {number} Current FPS value
   */
  getThrottledFps() {
    return this._throttledFps
  }

  /**
   * Set the FPS for the throttled RAF loop (triggerOnRaf30)
   * @param {number} fps - Target frames per second (e.g., 30, 60, 15)
   */
  setThrottledFps(fps) {
    this._throttledFps = fps;
    this.throttledInterval = 1000 / fps;
  }

  start(gl) {
    this.startTime = self.performance.now();
    this.oldTime = this.startTime;
    this.lastThrottledTime = this.startTime;
    this.isPaused = false;

    gl.setAnimationLoop(async (now, xrFrame) => {
      // Stats begin (main-thread mode)
      store.stats?.begin();

      if (!this.isPaused) {
        // Trigger throttled RAF when enough time has passed
        const currentTime = self.performance.now();
        // Trigger main RAF
        dispatcherSingleton.triggerOnRaf({
          elapsedTime: currentTime * 0.001,
          now,
          xrFrame
        });

        const deltaThrottled = currentTime - this.lastThrottledTime;

        if (deltaThrottled >= this.throttledInterval) {
          dispatcherSingleton.triggerOnRaf30(currentTime, deltaThrottled);
          this.lastThrottledTime = currentTime;
        }
      }
      // Stats end/update (main-thread mode)
      store.stats?.end();
      store.stats?.update();

      // StatsGLNode texture captures
      if (flushCaptures) {
        const captures = await flushCaptures(gl);
        for (const { name, bitmap, width, height } of captures) {
          // Worker mode: post to main thread
          if (store.stats) {
            if (!createdPanels.has(name)) {
              store.stats.addTexturePanel(name);
              createdPanels.add(name);
            }

            store.stats.setTextureBitmap(
              name,
              bitmap,
              width || gl.domElement.width,
              height || gl.domElement.height
            );
          }
        }
      }
    });
  }

  pause() {
    this.isPaused = true;
  }
}

const raf = new Raf();

export { initStatsCaptures, raf };
