/* ===================================================================
   BJX site — nav, motion, ambient sound, ember particles, vouches
   =================================================================== */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- nav scroll state + active link ---------- */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 20);
  updateProgress();
  toggleTopBtn();
}, { passive: true });

/* ---------- mobile burger ---------- */
const burger = document.getElementById('nav-burger');
const navLinks = document.getElementById('nav-links');
burger?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
});
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  burger?.classList.remove('open');
}));

/* ---------- active section highlight ---------- */
const sections = ['about', 'services', 'stats', 'vouches', 'contact']
  .map(id => document.getElementById(id)).filter(Boolean);
const navAnchors = document.querySelectorAll('[data-nav]');
const sectionIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    const link = document.querySelector(`[data-nav][href="#${e.target.id}"]`);
    if (!link) return;
    if (e.isIntersecting) {
      navAnchors.forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    }
  });
}, { rootMargin: '-45% 0px -45% 0px' });
sections.forEach(s => sectionIO.observe(s));

/* ---------- scroll progress + back to top ---------- */
const progressFill = document.getElementById('progress-fill');
function updateProgress() {
  const h = document.documentElement;
  const scrolled = h.scrollTop;
  const height = h.scrollHeight - h.clientHeight;
  if (progressFill) progressFill.style.width = (height > 0 ? (scrolled / height) * 100 : 0) + '%';
}
const toTopBtn = document.getElementById('to-top');
function toggleTopBtn() { toTopBtn?.classList.toggle('show', window.scrollY > 480); }
toTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }));

/* ---------- reveal on scroll ---------- */
const revealEls = document.querySelectorAll('.reveal');
if (prefersReduced) {
  revealEls.forEach(el => el.classList.add('show'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('show');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach((el) => io.observe(el));
}

/* ---------- tilt-on-hover cards ---------- */
if (!prefersReduced && matchMedia('(hover:hover)').matches) {
  document.querySelectorAll('.tilt').forEach((card) => {
    let raf = null;
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `perspective(700px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-2px)`;
      });
    });
    card.addEventListener('mouseleave', () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = '';
    });
  });
}

/* ---------- year ---------- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- animated stat counters ---------- */
const statNums = document.querySelectorAll('.stat-num[data-count]');
const countIO = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const counter = entry.target;
    const target = Number(counter.getAttribute('data-count')) || 0;
    if (prefersReduced) {
      counter.textContent = target.toLocaleString() + '+';
    } else {
      let n = 0;
      const step = Math.max(1, Math.floor(target / 60));
      const tick = () => {
        n = Math.min(target, n + step);
        counter.textContent = n.toLocaleString() + (n >= target ? '+' : '');
        if (n < target) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    countIO.unobserve(counter);
  });
}, { threshold: 0.4 });
statNums.forEach(n => countIO.observe(n));

/* ===================================================================
   Ambient background sound — procedural pad, no audio file required
   =================================================================== */
const musicBtn = document.getElementById('music-toggle');
let audioCtx = null;
let ambientNodes = null;
let musicOn = false;

function buildAmbient(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // soft evolving pad: two detuned oscillators through a slow-moving filter
  const padGain = ctx.createGain();
  padGain.gain.value = 0.16;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.6;

  const notes = [110, 164.81, 196]; // A2, E3, G3 — calm open chord
  const oscs = notes.map((freq, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'sine' : 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 0.5 : 0.28;
    o.connect(g).connect(filter);
    o.start();
    return o;
  });

  // slow LFO sweeping the filter cutoff for a breathing feel
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 260;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  filter.connect(padGain).connect(master);

  // sparse pentatonic plucks for a light gamer atmosphere
  const pluckScale = [440, 493.88, 587.33, 659.25, 783.99];
  let pluckTimer = null;
  function scheduleNextPluck() {
    const delay = 3200 + Math.random() * 5200;
    pluckTimer = setTimeout(() => {
      if (!musicOn) return;
      const freq = pluckScale[Math.floor(Math.random() * pluckScale.length)];
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 1.7);
      scheduleNextPluck();
    }, delay);
  }
  scheduleNextPluck();

  return {
    master,
    stopAll() {
      clearTimeout(pluckTimer);
      oscs.forEach(o => { try { o.stop(); } catch (e) {} });
      try { lfo.stop(); } catch (e) {}
    }
  };
}

musicBtn?.addEventListener('click', async () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    if (!musicOn) {
      if (!ambientNodes) ambientNodes = buildAmbient(audioCtx);
      const now = audioCtx.currentTime;
      ambientNodes.master.gain.cancelScheduledValues(now);
      ambientNodes.master.gain.setValueAtTime(ambientNodes.master.gain.value, now);
      ambientNodes.master.gain.linearRampToValueAtTime(1, now + 1.2);
      musicOn = true;
      musicBtn.classList.add('on');
      musicBtn.setAttribute('aria-pressed', 'true');
      musicBtn.querySelector('.music-label').textContent = 'On';
    } else {
      const now = audioCtx.currentTime;
      ambientNodes.master.gain.cancelScheduledValues(now);
      ambientNodes.master.gain.setValueAtTime(ambientNodes.master.gain.value, now);
      ambientNodes.master.gain.linearRampToValueAtTime(0, now + 0.6);
      musicOn = false;
      musicBtn.classList.remove('on');
      musicBtn.setAttribute('aria-pressed', 'false');
      musicBtn.querySelector('.music-label').textContent = 'Sound';
    }
  } catch (err) {
    // Web Audio unavailable — fail silently, sound is a nice-to-have.
  }
});

/* ===================================================================
   Ember particle background
   =================================================================== */
(function emberField() {
  const canvas = document.getElementById('embers');
  if (!canvas || prefersReduced) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  const COUNT = window.innerWidth < 700 ? 22 : 42;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  function makeParticle() {
    return {
      x: Math.random() * w,
      y: h + Math.random() * h * 0.4,
      r: Math.random() * 1.8 + 0.6,
      speed: Math.random() * 0.35 + 0.12,
      drift: (Math.random() - 0.5) * 0.3,
      hue: Math.random() > 0.6 ? '79,231,193' : (Math.random() > 0.5 ? '255,182,39' : '255,90,46'),
      alpha: Math.random() * 0.5 + 0.15,
      flicker: Math.random() * Math.PI * 2
    };
  }
  function init() {
    resize();
    particles = Array.from({ length: COUNT }, makeParticle);
  }
  function tick() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.y -= p.speed;
      p.x += Math.sin((p.y + p.flicker) * 0.01) * p.drift;
      p.flicker += 0.02;
      if (p.y < -10) Object.assign(p, makeParticle(), { y: h + 10 });
      const a = p.alpha * (0.6 + 0.4 * Math.sin(p.flicker));
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.hue},${a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  window.addEventListener('resize', resize, { passive: true });
  init();
  requestAnimationFrame(tick);
})();

/* ===================================================================
   Vouches: load, ticker, search, paginate, lightbox
   =================================================================== */
const grid = document.getElementById('vouch-grid');
const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbCap = document.getElementById('lb-cap');
const pageInfo = document.getElementById('page-info');
const searchInput = document.getElementById('vouch-search');
const fileCountEl = document.getElementById('vouch-file-count');
const tickerTrack = document.getElementById('ticker-track');

const PAGE_SIZE = 24;
let allVouches = [];
let filtered = [];
let page = 0;

document.querySelector('.lb-close')?.addEventListener('click', closeLb);
lb?.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });

function openLb(src, caption) {
  lbImg.src = src;
  lbCap.textContent = caption || '';
  lb.classList.remove('hidden');
}
function closeLb() { lb.classList.add('hidden'); }

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function applyFilter() {
  const q = (searchInput?.value || '').trim().toLowerCase();
  filtered = !q ? allVouches.slice() : allVouches.filter(v =>
    `${v.name || ''} ${v.note || ''} ${v.image || ''}`.toLowerCase().includes(q));
  page = 0;
  renderPage();
}

function renderPage() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (page >= totalPages) page = totalPages - 1;
  if (page < 0) page = 0;
  const start = page * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  if (!slice.length) {
    grid.innerHTML = '<p class="muted">No vouches match this filter.</p>';
  } else {
    grid.innerHTML = '';
    slice.forEach((v) => {
      const card = document.createElement('article');
      card.className = 'vouch';
      const imgPath = v.image ? 'vouches/' + v.image : '';
      const thumb = imgPath
        ? '<div class="vouch-img-wrap" data-src="' + imgPath + '"><img src="' + imgPath + '" alt="' + escapeHtml(v.name || 'Vouch') + '" loading="lazy" /></div>'
        : '<div class="vouch-img-wrap"><span class="placeholder-thumb">No image</span></div>';
      card.innerHTML = thumb + '<div class="vouch-body"><h4>' + escapeHtml(v.name || 'Vouch') + '</h4><p>' + escapeHtml(v.note || '') + '</p>' + (v.date ? '<span class="vouch-date">' + escapeHtml(v.date) + '</span>' : '') + '</div>';
      grid.appendChild(card);
      const wrap = card.querySelector('.vouch-img-wrap[data-src]');
      if (wrap) wrap.addEventListener('click', () => openLb(wrap.dataset.src, ((v.name || '') + ' — ' + (v.note || '')).trim()));
    });
  }
  if (pageInfo) pageInfo.textContent = 'Page ' + (page + 1) + ' / ' + totalPages + ' · ' + filtered.length + ' vouches';
}

document.getElementById('prev-page')?.addEventListener('click', () => { page -= 1; renderPage(); document.getElementById('vouches')?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' }); });
document.getElementById('next-page')?.addEventListener('click', () => { page += 1; renderPage(); document.getElementById('vouches')?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' }); });
searchInput?.addEventListener('input', applyFilter);

function buildTicker(list) {
  if (!tickerTrack) return;
  if (!list.length) { tickerTrack.innerHTML = '<span class="ticker-loading">No vouches yet.</span>'; return; }
  const sample = list.slice(0, 20);
  const itemsHtml = sample.map(v => `<span class="item"><strong>${escapeHtml(v.name || 'Vouch')}</strong> ${escapeHtml(v.note || 'Community vouch')}</span>`).join('');
  // duplicate content so the CSS keyframe (-50%) loops seamlessly
  tickerTrack.innerHTML = itemsHtml + itemsHtml;
}

async function loadVouches() {
  try {
    const res = await fetch('vouches.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    allVouches = Array.isArray(data) ? data : [];
    if (fileCountEl) fileCountEl.textContent = String(allVouches.length);
    filtered = allVouches.slice();
    renderPage();
    buildTicker(allVouches);
  } catch (e) {
    grid.innerHTML = '<p class="muted">Could not load vouches.json (' + escapeHtml(e.message) + ').</p>';
    if (tickerTrack) tickerTrack.innerHTML = '<span class="ticker-loading">Vouch feed unavailable.</span>';
  }
}
loadVouches();
