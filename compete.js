const left = document.querySelector('#left');
const right = document.querySelector('#right');
const rainbowDot = document.querySelector('#rainbow-dot');
const clip = document.querySelector('#window');
const replay = document.querySelector('.replay');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const logo = document.querySelector('.logo');
const glow = document.querySelector('.glow');
const login = document.querySelector('.login');
const email = login?.querySelector('input');

const square = [[0,0],[65,0],[65,32],[65,64],[0,64],[0,32]];
const chevron = [[0,0],[88,0],[205,118],[88,235],[0,235],[118,118]];
let frame;
let glowFrame;
let closure = 0;
let targetClosure = 0;

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

function draw(leftX, rightX, morph, alpha, scale = 1, clipInset = 0) {
  left.setAttribute('transform', 'translate(' + leftX + ' 0)');
  const top = mix(296, 146, morph);
  const points = square.map(([x, y], index) =>
    [rightX + mix(x, chevron[index][0], morph), top + mix(y, chevron[index][1], morph)].join(',')
  ).join(' ');
  right.setAttribute('points', points);
  right.setAttribute('opacity', alpha);
  rainbowDot.setAttribute('points', points);
  rainbowDot.setAttribute('opacity', alpha);
  const start = Math.max(329, 325 + leftX + 3);
  const end = Math.min(1396, rightX - 3);
  clip.setAttribute('x', start);
  clip.setAttribute('width', Math.max(0, end - start - clipInset));
  logo.style.transform = 'scale(' + scale + ')';
}

function drawHandoff(lift, reveal) {
  const visible = clamp(reveal);
  replay.style.transform = 'translateY(' + mix(43, 0, lift) + 'px)';
  login.style.opacity = visible;
  login.style.transform = 'translateY(' + mix(16, 0, reveal) + 'px)';
  login.style.clipPath = visible === 1 ? 'none' : 'inset(0 ' + (1 - visible) * 50 + '%)';
}

const morphEnd = .4;

function drawClosure(progress, recoil = 0) {
  closure = clamp(progress);
  const morph = clamp(closure / morphEnd);
  const travel = clamp((closure - morphEnd) / (1 - morphEnd));
  draw(mix(0, 474, travel), mix(1416, 811, travel),
    morph, 1, .82 - recoil, 6 * travel);
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
  const mark = logo.getBoundingClientRect();
  const x = mark.left + mark.width * (805 / 1600);
  const y = mark.top + mark.height * (189 / 415);
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

function animateClosure(target) {
  if (target === targetClosure) return;

  targetClosure = target;
  if (!login) replay.setAttribute('aria-pressed', Boolean(target));
  cancelAnimationFrame(frame);
  if (motion.matches) {
    drawClosure(target);
    return;
  }

  const from = closure;
  const morphing = target === 1 && from < morphEnd;
  const morphDuration = .23;
  const pause = .12;
  const travelStart = morphing ? morphDuration + pause : 0;
  const travelFrom = morphing ? morphEnd : from;
  let reached = false;
  const start = performance.now();
  function advance(now) {
    const seconds = (now - start) / 1000;
    if (seconds < travelStart) {
      const time = clamp(seconds / morphDuration);
      const ease = time * time * (3 - 2 * time);
      drawClosure(mix(from, morphEnd, ease));
      frame = requestAnimationFrame(advance);
      return;
    }

    const travelTime = seconds - travelStart;
    if (travelTime >= .64) {
      drawClosure(target);
      if (!reached && target === 1) releaseGlow();
      return;
    }

    const travel = snap(travelTime);
    const recoil = Math.max(0, travel - 1) * .28;
    const impact = !reached && travel >= 1;
    reached ||= impact;
    drawClosure(reached ? target : mix(travelFrom, target, travel), recoil);
    if (impact && target === 1) releaseGlow();
    frame = requestAnimationFrame(advance);
  }
  frame = requestAnimationFrame(advance);
}

function play() {
  cancelAnimationFrame(frame);
  if (motion.matches) {
    targetClosure = email.value.length > 0 ? 1 : 0;
    drawClosure(targetClosure);
    drawHandoff(1, 1);
    login.inert = false;
    replay.disabled = true;
    return;
  }

  replay.disabled = false;
  login.inert = true;
  drawHandoff(0, 0);
  draw(576, 803, 0, 0);
  const start = performance.now();

  function advance(now) {
    const seconds = (now - start) / 1000;
    if (seconds < .14) {
      draw(576, 803, 0, 0);
    } else if (seconds < .94) {
      const time = seconds - .14;
      const travel = snap(time * .82);
      draw(mix(576, 0, travel), mix(803, 1416, travel), 0, clamp(travel * 2));
    } else if (seconds < 1.86) {
      const time = Math.max(0, seconds - 1.06);
      const lift = spring(time, 8.8, 13);
      const reveal = spring(Math.max(0, time - .08), 9, 12);
      draw(0, 1416, 0, 1, mix(1, .82, lift));
      drawHandoff(lift, reveal);
    } else {
      targetClosure = 0;
      drawClosure(0);
      drawHandoff(1, 1);
      login.inert = false;
      prepareGlow();
      syncClosure();
      return;
    }
    frame = requestAnimationFrame(advance);
  }
  frame = requestAnimationFrame(advance);
}


function syncClosure() {
  if (!login.inert) animateClosure(Number(email.value.length > 0));
}

if (login) {
  const viewport = window.visualViewport;
  function fitKeyboard() {
    if (document.activeElement !== email) return;
    document.body.style.setProperty('--keyboard-height', (viewport?.height ?? innerHeight) + 'px');
    document.body.style.setProperty('--keyboard-top', (viewport?.offsetTop ?? 0) + 'px');
    document.body.classList.add('editing');
  }
  email.addEventListener('focus', fitKeyboard);
  viewport?.addEventListener('resize', fitKeyboard);
  viewport?.addEventListener('scroll', fitKeyboard);
  email.addEventListener('blur', () => document.body.classList.remove('editing'));
  email.addEventListener('input', syncClosure);
  replay.addEventListener('click', play);
  motion.addEventListener('change', play);
  play();
} else {
  drawClosure(0);
  const hover = matchMedia('(any-hover: hover)');
  replay.addEventListener('pointerenter', event => {
    if (hover.matches && event.pointerType !== 'touch') animateClosure(1);
  });
  replay.addEventListener('pointerleave', event => {
    if (hover.matches && event.pointerType !== 'touch') animateClosure(0);
  });
  replay.addEventListener('click', event => {
    if (event.detail === 0 || event.pointerType === 'touch' || !hover.matches) {
      animateClosure(1 - targetClosure);
    }
  });
  motion.addEventListener('change', () => {
    cancelAnimationFrame(frame);
    drawClosure(targetClosure);
  });
}

const story = document.querySelector('.story');
if (story) {
  const sourceGradient = document.querySelector('#rainbow');
  for (const layer of ['story', 'halo', 'interlock']) {
    const gradient = sourceGradient.cloneNode(true);
    gradient.id = layer + '-rainbow';
    document.querySelector('.' + layer + '-spectrum').append(gradient);
  }
  const particleMask = story.querySelector('#halo-particles');
  const particles = document.createDocumentFragment();
  const particleCount = 168;
  for (let index = 0; index < particleCount; index++) {
    const reach = (index + .6) / particleCount;
    const variation = (Math.sin(index * 37.17) + 1) / 2;
    const dx = -(24 + 121 * reach ** .82);
    const spread = 10 + 41 * reach;
    const dy = Math.sin(index * 2.399963) * spread * (.52 + .48 * variation) - 7 * reach;
    const peak = (.50 + .46 * variation) * (1 - .59 * reach);
    const life = 1.65 + .9 * variation;
    const phase = life * ((index * .618034) % 1);

    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    particle.setAttribute('cx', 173 + dx);
    particle.setAttribute('cy', 80 + dy);
    particle.setAttribute('r', .45 + (1 + .55 * (1 - reach)) * variation);
    particle.setAttribute('opacity', peak);
    particle.setAttribute('fill', 'white');
    particle.style.setProperty('--peak', peak);
    particle.style.setProperty('--life', life + 's');
    particle.style.setProperty('--phase', -phase + 's');
    particle.style.setProperty('--from-x', -dx + 'px');
    particle.style.setProperty('--from-y', -dy + 'px');
    particle.style.setProperty('--to-x', dx * .13 + 'px');
    particle.style.setProperty('--to-y', dy * .13 + 'px');
    particles.append(particle);
  }
  particleMask.append(particles);

  const storyMarks = [...story.querySelectorAll('.story-mark')];
  const storyCopy = [...story.querySelectorAll('.story-copy')];
  let storyAnimations = [];
  let storyEntered = false;

  function animateStory() {
    story.removeAttribute('data-waiting');
    if (motion.matches) return;

    storyAnimations = storyMarks.map((mark, index) => {
      const side = index === 0 ? -1 : 1;
      return mark.animate([
        {transform: 'translate3d(' + side * 30 + 'vw,0,-210px) rotateY(' + side * 180 + 'deg)', opacity: 0},
        {opacity: 1, offset: .34},
        {transform: 'translate3d(0,0,0) rotateY(0deg)', opacity: 1}
      ], {duration: 980, delay: 110, easing: 'cubic-bezier(.16,1,.30,1)', fill: 'backwards'});
    });
    storyAnimations.push(...storyCopy.map(copy => copy.animate([
      {opacity: 0, transform: 'translateY(12px)'},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 460, delay: 455, easing: 'ease-out', fill: 'backwards'})));
  }

  const storyObserver = new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio >= .36 && !storyEntered) {
      storyEntered = true;
      animateStory();
    } else if (entry.intersectionRatio <= .12 && storyEntered) {
      storyEntered = false;
      story.setAttribute('data-waiting', '');
      storyAnimations.forEach(animation => animation.cancel());
      storyAnimations = [];
    }
  }, {threshold: [.12, .36]});

  storyObserver.observe(story);
}

const interlock = document.querySelector('.interlock');
if (interlock && !interlock.hidden) {
  const interlockLeft = interlock.querySelector('.interlock-left');
  const interlockRight = interlock.querySelector('.interlock-right');
  const interlockCopy = interlock.querySelector('.interlock-copy');
  function drawInterlock(progress) {
    const leftX = mix(62, 105, progress);
    const leftY = mix(250, 222, progress);
    const rightX = mix(508, 465, progress);
    // At 45°, the two horizontal arms share the same top and bottom edges.
    const rightY = mix(250, 222 + 88 / Math.SQRT2, progress);
    const angle = 45 * progress;
    interlockCopy.setAttribute('opacity', clamp((progress - .94) / .06));
    interlockLeft.setAttribute('transform', 'translate(' + leftX + ' ' + leftY + ') rotate(' + angle + ') translate(0 -117.5)');
    interlockRight.setAttribute('transform', 'translate(' + rightX + ' ' + rightY + ') rotate(' + angle + ') translate(-205.5 -117.5)');
  }

  let interlockFrame;
  let interlockEntered = false;
  if (!motion.matches) drawInterlock(0);
  const interlockObserver = new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio >= .36 && !interlockEntered) {
      interlockEntered = true;
      if (motion.matches) {
        drawInterlock(1);
        return;
      }
      const start = performance.now();
      function turn(now) {
        if (motion.matches) {
          drawInterlock(1);
          return;
        }
        const time = clamp((now - start) / 850);
        drawInterlock(1 - (1 - time) ** 3.4);
        if (time < 1) interlockFrame = requestAnimationFrame(turn);
      }
      interlockFrame = requestAnimationFrame(turn);
    } else if (entry.intersectionRatio <= .12 && interlockEntered) {
      interlockEntered = false;
      cancelAnimationFrame(interlockFrame);
      drawInterlock(motion.matches ? 1 : 0);
    }
  }, {threshold: [.12, .36]});
  interlockObserver.observe(interlock);
}
