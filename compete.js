const motion = matchMedia('(prefers-reduced-motion: reduce)');
const mix = (a, b, value) => a + (b - a) * value;
const clamp = value => Math.max(0, Math.min(1, value));

const story = document.querySelector('.story');
if (story) {
  const sourceGradient = document.querySelector('#rainbow');
  for (const layer of ['story', 'halo', 'interlock']) {
    const gradient = sourceGradient.cloneNode(true);
    gradient.id = layer + '-rainbow';
    gradient.classList.add('animated-spectrum');
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
