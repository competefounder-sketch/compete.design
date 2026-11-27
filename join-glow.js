'use strict';

// A field of rainbow dots revealed by the expanding square mask at a chevron join.
function createJoinGlow(glow) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  let glowFrame;

  function makeWaveMask() {
    const size = 96;
    const mask = document.createElement('canvas');
    mask.width = mask.height = size;
    const context = mask.getContext('2d');
    const image = context.createImageData(size, size);
    const center = (size - 1) / 2;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const distance = Math.max(Math.abs(row - center), Math.abs(col - center)) / center;
        const light = distance < .6 ? (.15 + .85 * distance / .6) : (1 - (distance - .6) / .4) ** 1.4;
        image.data[(row * size + col) * 4 + 3] = Math.round(light * 255);
      }
    }
    context.putImageData(image, 0, 0);
    return mask;
  }

  function makeDotTexture(width, height) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 8;
    const dot = tile.getContext('2d');
    dot.beginPath();
    dot.arc(4, 4, 1.05, 0, 2 * Math.PI);
    dot.fill();

    const texture = document.createElement('canvas');
    texture.width = width;
    texture.height = height;
    const context = texture.getContext('2d');
    context.fillStyle = context.createPattern(tile, 'repeat');
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = 'source-in';
    const colors = ['#f34561', '#ff973c', '#e7c839', '#51ca76', '#27a8eb', '#8958ed'];
    const gradient = context.createLinearGradient(0, height * .15, width, height * .8);
    colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    return texture;
  }

  let waveMask;
  let dotTexture;
  function prepareGlow() {
    const { width, height } = glow.getBoundingClientRect();
    const pixelWidth = Math.max(1, Math.round(width));
    const pixelHeight = Math.max(1, Math.round(height));
    waveMask ??= makeWaveMask();
    if (dotTexture?.width !== pixelWidth || dotTexture.height !== pixelHeight) {
      dotTexture = makeDotTexture(pixelWidth, pixelHeight);
      glow.width = pixelWidth;
      glow.height = pixelHeight;
    }
  }

  return function releaseGlow(getOrigin) {
    if (motion.matches) return;
    const ctx = glow.getContext('2d');
    if (!ctx) return;

    cancelAnimationFrame(glowFrame);
    glow.hidden = false;
    prepareGlow();
    const { width, height } = glow;
    const start = performance.now();

    function paint(now) {
      ctx.clearRect(0, 0, width, height);
      const elapsed = (now - start) / 1000;
      const point = getOrigin();
      if (elapsed >= 1.45 || motion.matches || !point) {
        glow.hidden = true;
        return;
      }
      const {x, y} = point;
      const extent = Math.max(x, width - x, y, height - y);

      const spread = 1 - (1 - clamp(elapsed / 1.24)) ** 1.6;
      const radius = 18 + (extent * 1.7 - 18) * spread;
      ctx.globalAlpha = .84 * clamp(elapsed / .07) * (1 - clamp((elapsed - .48) / .97)) ** 1.2;
      ctx.drawImage(dotTexture, 0, 0);

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(waveMask, x - radius, y - radius, 2 * radius, 2 * radius);
      ctx.globalCompositeOperation = 'source-over';
      glowFrame = requestAnimationFrame(paint);
    }
    glowFrame = requestAnimationFrame(paint);
  };
}
