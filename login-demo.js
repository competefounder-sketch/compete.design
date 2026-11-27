'use strict';
const form = document.querySelector('.login');
const field = form.querySelector('.email-field');
const email = document.querySelector('#demo-email');
const password = document.querySelector('#demo-password');
const next = form.querySelector('.send-step');
const label = document.querySelector('#step-label');
const releaseGlow = createJoinGlow(document.querySelector('.glow'));
const motion = matchMedia('(prefers-reduced-motion: reduce)');

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
      releaseGlow(() => {
        const box = field.getBoundingClientRect();
        return {x: box.left + box.width / 2, y: box.top + box.height / 2};
      });
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
