const motion = matchMedia('(prefers-reduced-motion: reduce)');
const mix = (a, b, value) => a + (b - a) * value;
const clamp = value => Math.max(0, Math.min(1, value));

const story = document.querySelector('.story');
if (story) {
  const sourceGradient = document.querySelector('#rainbow');
  for (const layer of ['story', 'interlock']) {
    const gradient = sourceGradient.cloneNode(true);
    gradient.id = layer + '-rainbow';
    gradient.classList.add('animated-spectrum');
    document.querySelector('.' + layer + '-spectrum').append(gradient);
  }
  function addSparks(host, path, count, outward = false) {
    const svg = path.ownerSVGElement;
    const layer = document.createElement('span');
    layer.className = 'story-sparks';
    layer.setAttribute('aria-hidden', 'true');
    host.append(layer);
    const palette = ['#f34561','#ff973c','#dfb92e','#51ca76','#27a8eb','#8958ed'];
    const length = path.getTotalLength();
    const origins = [];
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('i');
      const distance = length*(i+.5)/count;
      const origin = path.getPointAtLength(distance);
      let angle = i * 2.399963;
      if (outward) {
        const before = path.getPointAtLength(distance-1);
        const after = path.getPointAtLength(distance+1);
        angle = Math.atan2(after.y-before.y, after.x-before.x) + Math.PI/2;
        const probe = new DOMPoint(origin.x+2*Math.cos(angle), origin.y+2*Math.sin(angle));
        if (path.isPointInFill(probe)) angle += Math.PI;
      }
      const reach = outward ? 2 + (i % 3) * .5 : 6 + (i * 7 % 10);
      const life = 2.7 + (i % 7) * .19;
      const size = outward ? 1 + (i % 3) * .25 : 1.5 + (i % 4) * .38;
      Object.assign(spark.style, {width:size+'px',height:size+'px',background:palette[i%palette.length]});
      spark.style.setProperty('--dx',Math.cos(angle)*reach+'px');
      spark.style.setProperty('--dy',Math.sin(angle)*reach+'px');
      spark.style.setProperty('--life',life+'s');
      spark.style.setProperty('--phase',-life*((i*.618034)%1)+'s');
      origins.push(origin);
      layer.append(spark);
    }
    function place() {
      const view = svg.viewBox.baseVal;
      // SVGs are centered horizontally in their hosts; the heading SVG fills its host.
      const w = svg.clientWidth, h = svg.clientHeight;
      const left = (host.clientWidth-w)/2;
      origins.forEach((point,i)=>{
        const spark = layer.children[i];
        spark.style.left = left+(point.x-view.x)*w/view.width+'px';
        spark.style.top = (point.y-view.y)*h/view.height+'px';
      });
    }
    new ResizeObserver(place).observe(svg);
    place();
  }
  addSparks(story.querySelector('.story-half--rainbow'),story.querySelector('.story-half--rainbow .story-mark path'),90);
  addSparks(story.querySelector('h2'),story.querySelector('#better-outer-outline'),54,true);

  const storyMarks = [...story.querySelectorAll('.story-mark')];
  const storyHeading = story.querySelector('.story-copy h2');
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
    const titleReveal = storyHeading.animate([
      {opacity: 0, transform: 'translateY(12px)'},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 460, delay: 455, easing: 'ease-out', fill: 'backwards'});
    storyAnimations.push(titleReveal);
    titleReveal.onfinish = () => {
      if (storyEntered) gridWaves.emit(storyHeading.querySelector('svg'), 3850, -315);
    };
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

  const svg = interlock.querySelector('.interlock-mark');
  function seedParticles(layer, outline, count, letters) {
    const length = outline.getTotalLength();
    const palette = ['#f34561','#ff973c','#dfb92e','#51ca76','#27a8eb','#8958ed'];
    const samples = [];
    for (let i=0; i<count; i++) {
      const at = length*(i+.5)/count;
      const p = outline.getPointAtLength(at);
      let angle = i*2.399963;
      if (letters) {
        const a = outline.getPointAtLength(at-.03), b = outline.getPointAtLength(at+.03);
        angle = Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2;
        if (outline.isPointInFill(new DOMPoint(p.x+.05*Math.cos(angle),p.y+.05*Math.sin(angle)))) angle += Math.PI;
      }
      const dot = document.createElementNS(svg.namespaceURI,'circle');
      dot.setAttribute('cx',p.x);
      dot.setAttribute('cy',p.y);
      dot.setAttribute('fill',palette[i%palette.length]);
      const life = 2.7+(i%7)*.19;
      dot.style.setProperty('--life',life+'s');
      dot.style.setProperty('--phase',-life*((i*.618034)%1)+'s');
      layer.append(dot);
      samples.push({dot,angle,reach:letters?2+i%3*.5:6+i*7%10});
    }
    function resize() {
      const unit = svg.viewBox.baseVal.width / (svg.clientWidth || 570);
      for(const {dot,angle,reach} of samples) {
        dot.setAttribute('r',(letters ? .65 : 1)*unit);
        dot.style.setProperty('--dx',Math.cos(angle)*reach*unit+'px');
        dot.style.setProperty('--dy',Math.sin(angle)*reach*unit+'px');
      }
    }
    new ResizeObserver(resize).observe(svg);
    resize();
  }
  seedParticles(interlock.querySelector('.winner-piece-sparks'),interlock.querySelector('#interlock-chevron'),90,false);
  seedParticles(interlock.querySelector('.winner-letter-sparks'),interlock.querySelector('#winner-outline'),54,true);

  let interlockFrame;
  let interlockEntered = false;
  if (!motion.matches) drawInterlock(0);
  const interlockObserver = new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio >= .36 && !interlockEntered) {
      interlockEntered = true;
      interlock.classList.add("is-visible");
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
        else gridWaves.join(svg, 268, 253);
      }
      interlockFrame = requestAnimationFrame(turn);
    } else if (entry.intersectionRatio <= .12 && interlockEntered) {
      interlockEntered = false;
      interlock.classList.remove("is-visible");
      cancelAnimationFrame(interlockFrame);
      drawInterlock(motion.matches ? 1 : 0);
    }
  }, {threshold: [.12, .36]});
  interlockObserver.observe(interlock);
}
