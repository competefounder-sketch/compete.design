'use strict';
const form = document.querySelector('.login');
const field = form.querySelector('.email-field');
const email = document.querySelector('#demo-email');
const password = document.querySelector('#demo-password');
const next = form.querySelector('.send-step');
const label = document.querySelector('#step-label');
const glow = document.querySelector('.glow');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let glowFrame;

const mix = (a, b, value) => a + (b - a) * value;
const clamp = value => Math.max(0, Math.min(1, value));

// Unit step response of an underdamped spring initially at rest.
function spring(seconds, decay, frequency) {
  return 1 - Math.exp(-decay * seconds) *
    (Math.cos(frequency * seconds) + decay / frequency * Math.sin(frequency * seconds));
}

// Build momentum slowly, then run through the spring's snap and recoil.
function snap(seconds) {
  const rampedTime = seconds * (seconds / .43) ** 1.6;
  return spring(rampedTime, 8.5, 13);
}

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
      const light = distance < .6 ? mix(.15, 1, distance / .6) : (1 - (distance - .6) / .4) ** 1.4;
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

function releaseGlow() {
  const ctx = glow.getContext('2d');
  if (!ctx) return;

  cancelAnimationFrame(glowFrame);
  prepareGlow();
  const { width, height } = glow;
  const mark = field.getBoundingClientRect();
  const x = mark.left + mark.width / 2;
  const y = mark.top + mark.height / 2;
  const extent = Math.max(x, width - x, y, height - y);
  const start = performance.now();

  function paint(now) {
    ctx.clearRect(0, 0, width, height);
    const elapsed = (now - start) / 1000;
    if (elapsed >= 1.45 || motion.matches) return;

    const spread = 1 - (1 - clamp(elapsed / 1.24)) ** 1.6;
    const radius = mix(18, extent * 1.7, spread);
    ctx.globalAlpha = .84 * clamp(elapsed / .07) * (1 - clamp((elapsed - .48) / .97)) ** 1.2;
    ctx.drawImage(dotTexture, 0, 0);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(waveMask, x - radius, y - radius, 2 * radius, 2 * radius);
    ctx.globalCompositeOperation = 'source-over';
    glowFrame = requestAnimationFrame(paint);
  }
  glowFrame = requestAnimationFrame(paint);
}


function joinMarks() {
  if (motion.matches) {
    field.style.setProperty('--join', '1');
    return;
  }
  const start = performance.now();
  let reached = false;
  function draw(now) {
    const seconds = (now - start) / 1000;
    const movement = snap(seconds);
    const settled = seconds >= .64 || motion.matches;
    const progress = settled || reached ? 1 : clamp(movement);
    field.style.setProperty('--join', progress);
    const recoil = settled ? 0 : Math.max(0, movement - 1) * .28;
    field.style.transform = recoil ? 'scale(' + (1 - recoil) + ')' : '';
    if (!reached && progress === 1) {
      reached = true;
      if (!motion.matches) releaseGlow();
    }
    if (!settled) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (form.dataset.step === 'email') {
    form.dataset.step = 'password';
    email.value = '';
    email.hidden = email.disabled = true;
    password.hidden = password.disabled = false;
    label.textContent = 'Password';
    next.setAttribute('aria-label', 'Completa il test');
    password.focus();
  } else if (form.dataset.step === 'password') {
    form.dataset.step = 'done';
    password.value = '';
    password.hidden = password.disabled = true;
    next.hidden = next.disabled = true;
    form.querySelector('[role="status"]').textContent = 'Accesso di prova completato';
    joinMarks();
  }
});
