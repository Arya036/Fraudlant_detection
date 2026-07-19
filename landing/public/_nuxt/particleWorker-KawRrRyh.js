// Particle Data Generation Web Worker
// Handles compute-intensive particle data generation off the main thread

const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;

// Worker state
let offscreenCanvas = null;
let ctx = null;

// Initialize OffscreenCanvas
function initCanvas() {
  if (!offscreenCanvas) {
    offscreenCanvas = new OffscreenCanvas(IMAGE_WIDTH, IMAGE_HEIGHT);
    ctx = offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });
  }
}

// Draw ImageBitmap to canvas and extract pixel data
function extractImageData(imageBitmap) {
  initCanvas();
  ctx.clearRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
  ctx.drawImage(imageBitmap, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
  return ctx.getImageData(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
}

// Random sampling with rejection (original method from particles.js)
function generateRandomSampling(targetCount, imageData, depthData, params) {
  const points = [];

  for (let i = 0; i < targetCount; i++) {
    let x, y, r, g, b, brightness, depth;
    let attempts = 0;
    const maxAttempts = 10;

    // Keep trying random positions until we find a valid pixel (not background)
    do {
      x = Math.random();
      y = Math.random();

      // Sample color to check brightness
      if (imageData) {
        const px = Math.floor(x * IMAGE_WIDTH);
        const py = Math.floor(y * IMAGE_HEIGHT);
        const idx = (py * IMAGE_WIDTH + px) * 4;
        r = imageData.data[idx] / 255.0;
        g = imageData.data[idx + 1] / 255.0;
        b = imageData.data[idx + 2] / 255.0;
        brightness = (r + g + b) / 3;
      } else {
        brightness = 1;
        r = g = b = 1;
      }

      // Sample depth
      if (depthData) {
        const px = Math.floor(x * IMAGE_WIDTH);
        const py = Math.floor(y * IMAGE_HEIGHT);
        const idx = (py * IMAGE_WIDTH + px) * 4;
        depth = depthData.data[idx] / 255.0;
      } else {
        depth = 0.5;
      }

      attempts++;
    } while (
      (brightness < params.brightnessThreshold ||
        depth < params.depthThreshold) &&
      attempts < maxAttempts
    );

    if (
      brightness >= params.brightnessThreshold &&
      depth >= params.depthThreshold
    ) ;

    points.push({ x, y });
  }

  return points;
}

// Generate particle data arrays
function generateParticleData(
  imageData,
  depthData,
  normalData,
  params,
  maxCount
) {
  const max = maxCount !== null ? maxCount : params.particleCount || 5000;

  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const depths = new Float32Array(max);
  const sizes = new Float32Array(max);
  const velocities = new Float32Array(max * 3);
  const initialPositions = new Float32Array(max * 3);
  const timeOffsets = new Float32Array(max);
  const mouseResponsive = new Float32Array(max);
  const curlResponsive = new Float32Array(max);
  const spriteVariations = new Float32Array(max);
  const brightnesses = new Float32Array(max);
  const packedData = new Float32Array(max * 4);

  const sampledPoints = generateRandomSampling(
    max,
    imageData,
    depthData,
    params
  );
  const count = Math.min(sampledPoints.length, max);

  for (let i = 0; i < count; i++) {
    const { x, y } = sampledPoints[i];

    // --- color ---
    let r = 1,
      g = 1,
      b = 1;
    if (imageData) {
      const px = Math.floor(x * IMAGE_WIDTH);
      const py = Math.floor(y * IMAGE_HEIGHT);
      const idx = (py * IMAGE_WIDTH + px) * 4;
      r = imageData.data[idx] / 255.0;
      g = imageData.data[idx + 1] / 255.0;
      b = imageData.data[idx + 2] / 255.0;
    }

    // --- depth ---
    let depth = 0.5;
    if (depthData) {
      const px = Math.floor(x * IMAGE_WIDTH);
      const py = Math.floor(y * IMAGE_HEIGHT);
      const idx = (py * IMAGE_WIDTH + px) * 4;
      depth = depthData.data[idx] / 255.0;
    }

    // --- normalZ ---
    let normalZ = 1.0;
    if (normalData) {
      const px = Math.floor(x * IMAGE_WIDTH);
      const py = Math.floor(y * IMAGE_HEIGHT);
      const idx = (py * IMAGE_WIDTH + px) * 4;
      normalZ = normalData.data[idx + 2] / 255.0;
    }

    // size variation + normal influence
    let sizeMultiplier = 1.0 + (Math.random() * 2 - 1) * params.sizeVariation;
    const normalScale = 0.5 + normalZ * 0.5;
    sizeMultiplier *= 1.0 - (normalScale - 1.0) * params.normalInfluence;

    // Scale size by brightness
    const brightness = (r + g + b) / 3;
    sizeMultiplier *= 0.5 + brightness * 1.5;

    // floating
    const isFloating = Math.random() < params.floatingParticles;
    const velocityY = isFloating ? 0.5 + Math.random() * 0.5 : 0.0;
    const velocityX = isFloating ? (Math.random() - 0.5) * 0.1 : 0.0;
    const timeOffset = isFloating ? Math.random() * 5.0 : 0.0;

    // mouse responsiveness
    const isMouseResponsive =
      Math.random() < params.mouseAffectedParticles ? 1.0 : 0.0;

    // curl responsiveness
    const isCurlResponsive =
      Math.random() < (params.curlAffectedParticles || 1.0) ? 1.0 : 0.0;

    // sprite variation
    const spriteVariation = Math.floor(Math.random() * 7);

    // position
    const posX = (x - 0.5) * 0.9;
    const posY = -(y - 0.5) * 0.9;

    const i3 = i * 3;
    positions[i3 + 0] = posX;
    positions[i3 + 1] = posY;
    positions[i3 + 2] = 0;

    initialPositions[i3 + 0] = posX;
    initialPositions[i3 + 1] = posY;
    initialPositions[i3 + 2] = 0;

    colors[i3 + 0] = r;
    colors[i3 + 1] = g;
    colors[i3 + 2] = b;

    depths[i] = depth;
    sizes[i] = sizeMultiplier;

    velocities[i3 + 0] = velocityX;
    velocities[i3 + 1] = velocityY;
    velocities[i3 + 2] = 0;

    timeOffsets[i] = timeOffset;
    mouseResponsive[i] = isMouseResponsive;
    curlResponsive[i] = isCurlResponsive;
    spriteVariations[i] = spriteVariation;
    brightnesses[i] = brightness;

    // Pack data
    const i4 = i * 4;
    packedData[i4 + 0] = sizeMultiplier;
    packedData[i4 + 1] = depth;
    packedData[i4 + 2] = timeOffset;
    packedData[i4 + 3] = isMouseResponsive;
  }

  // Kill unused slots
  for (let i = count; i < max; i++) {
    sizes[i] = 0;
    depths[i] = 0.5;
    const i3 = i * 3;
    const i4 = i * 4;
    colors[i3 + 0] = 0;
    colors[i3 + 1] = 0;
    colors[i3 + 2] = 0;
    positions[i3 + 0] = 0;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = 0;
    initialPositions[i3 + 0] = 0;
    initialPositions[i3 + 1] = 0;
    initialPositions[i3 + 2] = 0;
    velocities[i3 + 0] = 0;
    velocities[i3 + 1] = 0;
    velocities[i3 + 2] = 0;
    timeOffsets[i] = 0;
    mouseResponsive[i] = 0;
    curlResponsive[i] = 0;
    spriteVariations[i] = 0;
    brightnesses[i] = 0;
    packedData[i4 + 0] = 0;
    packedData[i4 + 1] = 0.5;
    packedData[i4 + 2] = 0;
    packedData[i4 + 3] = 0;
  }

  return {
    positions,
    colors,
    depths,
    sizes,
    velocities,
    initialPositions,
    timeOffsets,
    mouseResponsive,
    curlResponsive,
    spriteVariations,
    brightnesses,
    packedData,
    count,
  };
}

// Message handler
self.onmessage = async function (e) {
  const { type, reqId, data } = e.data;

  try {
    if (type === "generate") {
      const { rawBitmap, depthBitmap, normalBitmap, params, maxCount } = data;

      // Extract image data from bitmaps
      const imageData = extractImageData(rawBitmap);
      const depthData = extractImageData(depthBitmap);
      const normalData = extractImageData(normalBitmap);

      // Generate particle data
      const particleData = generateParticleData(
        imageData,
        depthData,
        normalData,
        params,
        maxCount
      );

      // Transfer arrays back (zero-copy)
      self.postMessage(
        {
          type: "complete",
          reqId,
          data: particleData,
        },
        [
          particleData.positions.buffer,
          particleData.colors.buffer,
          particleData.depths.buffer,
          particleData.sizes.buffer,
          particleData.velocities.buffer,
          particleData.initialPositions.buffer,
          particleData.timeOffsets.buffer,
          particleData.mouseResponsive.buffer,
          particleData.curlResponsive.buffer,
          particleData.spriteVariations.buffer,
          particleData.brightnesses.buffer,
          particleData.packedData.buffer,
        ]
      );
    } else if (type === "ping") {
      self.postMessage({ type: "pong", reqId });
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      reqId,
      error: error.message,
      stack: error.stack,
    });
  }
};
