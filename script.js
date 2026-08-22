document.getElementById('year').textContent = new Date().getFullYear();

const counter = document.querySelector('[data-count]');
if (counter) {
  const target = Number(counter.getAttribute('data-count')) || 2000;
  let n = 0;
  const step = Math.max(1, Math.floor(target / 60));
  const tick = () => {
    n = Math.min(target, n + step);
    counter.textContent = n.toLocaleString() + (n >= target ? '+' : '');
    if (n < target) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const grid = document.getElementById('vouch-grid');
const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbCap = document.getElementById('lb-cap');
const pageInfo = document.getElementById('page-info');
const searchInput = document.getElementById('vouch-search');
const fileCountEl = document.getElementById('vouch-file-count');

const PAGE_SIZE = 24;
let allVouches = [];
let filtered = [];
let page = 0;

document.querySelector('.lb-close')?.addEventListener('click', () => lb.classList.add('hidden'));
lb?.addEventListener('click', (e) => { if (e.target === lb) lb.classList.add('hidden'); });

function openLb(src, caption) {
  lbImg.src = src;
  lbCap.textContent = caption || '';
  lb.classList.remove('hidden');
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function applyFilter() {
  const q = (searchInput?.value || '').trim().toLowerCase();
  filtered = !q ? allVouches.slice() : allVouches.filter(v =>
    `${v.name||''} ${v.note||''} ${v.image||''}`.toLowerCase().includes(q));
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
        ? '<div class="vouch-img-wrap" data-src="'+imgPath+'"><img src="'+imgPath+'" alt="'+escapeHtml(v.name||'Vouch')+'" loading="lazy" /></div>'
        : '<div class="vouch-img-wrap"><span class="placeholder-thumb">No image</span></div>';
      card.innerHTML = thumb + '<div class="vouch-body"><h4>'+escapeHtml(v.name||'Vouch')+'</h4><p>'+escapeHtml(v.note||'')+'</p>'+(v.date?'<span class="vouch-date">'+escapeHtml(v.date)+'</span>':'')+'</div>';
      grid.appendChild(card);
      const wrap = card.querySelector('.vouch-img-wrap[data-src]');
      if (wrap) wrap.addEventListener('click', () => openLb(wrap.dataset.src, ((v.name||'')+' — '+(v.note||'')).trim()));
    });
  }
  if (pageInfo) pageInfo.textContent = 'Page '+(page+1)+' / '+totalPages+' · '+filtered.length+' vouches';
}

document.getElementById('prev-page')?.addEventListener('click', () => { page -= 1; renderPage(); document.getElementById('vouches')?.scrollIntoView({behavior:'smooth', block:'start'}); });
document.getElementById('next-page')?.addEventListener('click', () => { page += 1; renderPage(); document.getElementById('vouches')?.scrollIntoView({behavior:'smooth', block:'start'}); });
searchInput?.addEventListener('input', applyFilter);

async function loadVouches() {
  try {
    const res = await fetch('vouches.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    allVouches = Array.isArray(data) ? data : [];
    if (fileCountEl) fileCountEl.textContent = String(allVouches.length);
    filtered = allVouches.slice();
    renderPage();
  } catch (e) {
    grid.innerHTML = '<p class="muted">Could not load vouches.json ('+escapeHtml(e.message)+').</p>';
  }
}
loadVouches();
