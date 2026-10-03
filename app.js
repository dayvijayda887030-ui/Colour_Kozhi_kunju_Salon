(() => {
const C = window.SITE_CONFIG || {};
const live = C.SUPABASE_URL && C.SUPABASE_ANON_KEY && !/YOUR/i.test(C.SUPABASE_URL);
const CHICK_ASSET = 'assets/Rainbow%20Feathered%20Chick%20Mascot.png';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- data ----------
const get = async (table, order = '&order=sort.asc,id.asc') => {
  if (!live) return null;
  try {
    const r = await fetch(`${C.SUPABASE_URL}/rest/v1/${table}?select=*${order}`, {
      headers: { apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY }
    });
    if (!r.ok) throw 0;
    return await r.json();
  } catch (e) { return null; }
};

const DEFAULTS = {
  settings: {
    owner_image: CHICK_ASSET,
    owner_name: 'The heart behind the salon',
    owner_bio: 'A little colour, a lot of care, and a warm welcome are at the heart of every visit.',
    hero_caption: 'Hair. Colour. Chaos.',
    hero_sub: 'Walk in chick, walk out icon.',
    sticker1: 'Cuts', sticker2: '🎨 Colour', sticker3: '✨ Glow up',
    tags: 'HAIR,COLOUR,STYLE,GLOW,CHAOS,SLAY',
    instagram: 'https://www.instagram.com/colour_kozhi_kunji_saloon',
    youtube: 'https://youtube.com/@colourkozhikuji',
    facebook: 'https://www.facebook.com/profile.php?id=100063850134309',
    phone: ''
  },
  gallery: Array.from({ length: 18 }, (_, i) => ({ url: `https://picsum.photos/seed/kozhi${i}/700/${[900, 700, 1000][i % 3]}` })),
  videos: [],
  locations: [{ name: 'Main Branch', address: 'Colour Kozhi Kunji Saloon', maps_url: 'https://maps.app.goo.gl/AY6CrwbKxryHAgsn7' }]
};

// ---------- link helpers ----------
const ytId = u => (String(u).match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/) || [])[1];
const igEmbed = u => {
  const m = String(u).match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/);
  return m ? `https://www.instagram.com/${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/embed` : null;
};
const mapSrc = l => {
  const a = (l.address || '').trim();
  if (/^<iframe/i.test(a)) { const m = a.match(/src="([^"]+)"/); if (m) return m[1]; }
  if (/google\.[^/]+\/maps\/embed/.test(a)) return a;
  return `https://www.google.com/maps?q=${encodeURIComponent(a || l.name)}&output=embed`;
};

// ---------- render ----------
function render(S, G, V, L) {
  $('#ownerImg').src = S.owner_image;
  $('#aboutOwnerImg').src = S.owner_image || CHICK_ASSET;
  $('#ownerName').textContent = S.owner_name || DEFAULTS.settings.owner_name;
  $('#ownerBio').textContent = S.owner_bio || DEFAULTS.settings.owner_bio;
  $('#heroCap').textContent = S.hero_caption;
  $('#heroSub').textContent = S.hero_sub;
  ['1', '2', '3'].forEach(n => $('#st' + n).textContent = S['sticker' + n] || '');

  const tags = S.tags.split(',').map(t => t.trim()).filter(Boolean);
  const row = tags.map(t => `<span>${esc(t)}</span><span>✦</span>`).join('');
  $('#mq1').innerHTML = row.repeat(8);
  $('#mq2').innerHTML = row.repeat(8);

  $('#hTrack').innerHTML = `<div class="big f">LOOKS</div>` +
    G.slice(0, 10).map((g, i) => `<div class="hcard" data-i="${i}" data-cursor="VIEW"><img src="${esc(g.url)}" alt="${esc(g.caption || '')}" loading="lazy"></div>`).join('');

  const cols = [[], [], []];
  G.forEach((g, i) => cols[i % 3].push(`<img src="${esc(g.url)}" alt="${esc(g.caption || '')}" data-i="${i}" data-cursor="VIEW" loading="lazy">`));
  $('#cols').innerHTML = cols.map(c => `<div class="col">${c.join('')}</div>`).join('');

  const ig = V.map(v => igEmbed(v.url)).filter(Boolean);
  $('#igSlider').innerHTML = (ig.length
    ? ig.map(src => `<div class="ig"><iframe data-src="${src}" title="Instagram" scrolling="no" allowtransparency="true"></iframe></div>`).join('')
    : '') + `<a class="cta f" href="${esc(S.instagram)}" target="_blank" rel="noopener">More on Instagram ➜</a>`;

  const ytOnly = V.filter(v => ytId(v.url) && !igEmbed(v.url)).map(v => ({ id: ytId(v.url), t: v.title }));
  $('#ytSlider').innerHTML = ytOnly.map(v =>
    `<div class="yt" data-id="${v.id}" data-cursor="PLAY"><img src="https://img.youtube.com/vi/${v.id}/hqdefault.jpg" alt="${esc(v.t || 'video')}" loading="lazy"><div class="play">▶️</div></div>`
  ).join('') + `<a class="cta f" href="${esc(S.youtube)}" target="_blank" rel="noopener">More on YouTube ➜</a>`;

  // maps
  $('#mapTabs').innerHTML = L.map((l, i) => `<button class="tab f ${i ? '' : 'on'}" data-i="${i}">${esc(l.name)}</button>`).join('');
  const showMap = i => {
    const l = L[i];
    $$('.tab').forEach((t, k) => t.classList.toggle('on', k === i));
    const f = $('#mapFrame'); f.style.opacity = 0;
    setTimeout(() => { f.src = mapSrc(l); f.onload = () => f.style.opacity = 1; }, 200);
    $('#mapOpen').href = l.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address || l.name)}`;
  };
  $('#mapTabs').onclick = e => { const b = e.target.closest('.tab'); if (b) showMap(+b.dataset.i); };
  showMap(0);

  $('#fIg').href = S.instagram; $('#fYt').href = S.youtube; $('#fFb').href = S.facebook;
  if (S.phone) { const p = $('#fPh'); p.href = 'tel:' + S.phone.replace(/\s/g, ''); p.style.display = ''; }
}

// ---------- behaviours ----------
function lazyIframes() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.src = e.target.dataset.src; io.unobserve(e.target); }
  }), { rootMargin: '400px' });
  $$('iframe[data-src]').forEach(f => io.observe(f));
}

function sliders() {
  $$('.slsec').forEach(sec => {
    const sl = $('.slider', sec);
    $$('.arr', sec).forEach(b => b.onclick = () => sl.scrollBy({ left: +b.dataset.dir * sl.clientWidth * .6, behavior: 'smooth' }));
    let down = false, sx = 0, sl0 = 0, moved = false;
    sl.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl0 = sl.scrollLeft; sl.style.scrollSnapType = 'none';
    });
    addEventListener('pointermove', e => { if (!down) return; const d = e.clientX - sx; if (Math.abs(d) > 4) moved = true; sl.scrollLeft = sl0 - d; });
    addEventListener('pointerup', () => { if (!down) return; down = false; sl.style.scrollSnapType = ''; });
    sl.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });
  $('#ytSlider').addEventListener('click', e => {
    const c = e.target.closest('.yt'); if (!c || c.querySelector('iframe')) return;
    c.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${c.dataset.id}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });
}

function lightbox(G) {
  const st = document.createElement('style');
  st.textContent = `.lb{position:fixed;inset:0;z-index:9500;background:rgba(13,13,13,.94);display:none;place-items:center}
  .lb.on{display:grid}.lb img{max-width:92vw;max-height:88vh;border-radius:24px;border:5px solid #c6ff00;animation:lbin .35s}
  @keyframes lbin{from{transform:scale(.7) rotate(-6deg);opacity:0}}
  .lb button{position:absolute;font-size:44px;color:#c6ff00;padding:14px}.lb .x{top:10px;right:16px}.lb .p{left:10px}.lb .n{right:10px}`;
  document.head.append(st);
  const lb = document.createElement('div'); lb.className = 'lb';
  lb.innerHTML = '<button class="x">✕</button><button class="p">‹</button><img alt=""><button class="n">›</button>';
  document.body.append(lb);
  let i = 0;
  const show = n => { i = (n + G.length) % G.length; $('img', lb).src = G[i].url; lb.classList.add('on'); };
  document.addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (t && (t.closest('#cols') || t.closest('#hTrack'))) show(+t.dataset.i); });
  $('.x', lb).onclick = () => lb.classList.remove('on');
  $('.p', lb).onclick = () => show(i - 1);
  $('.n', lb).onclick = () => show(i + 1);
  lb.onclick = e => { if (e.target === lb) lb.classList.remove('on'); };
  addEventListener('keydown', e => { if (!lb.classList.contains('on')) return; if (e.key === 'Escape') lb.classList.remove('on'); if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
  let tx = 0;
  lb.addEventListener('touchstart', e => tx = e.touches[0].clientX);
  lb.addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) show(i + (d < 0 ? 1 : -1)); });
}

function cursorAndFun() {
  const cur = $('#cur');
  addEventListener('pointermove', e => {
    cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
    const t = e.target.closest && e.target.closest('[data-cursor],a,button');
    cur.classList.toggle('big', !!t);
    cur.textContent = t ? (t.dataset.cursor || '') : '';
  });
  addEventListener('click', e => {
    const effects = [
      { image: CHICK_ASSET },
      ...['✂️', '✨', '💅', '🎨'].map(text => ({ text }))
    ];
    effects.forEach(({ image, text }, k) => {
      const s = document.createElement(image ? 'img' : 'span'); s.className = image ? 'pop chick-pop' : 'pop';
      if (image) { s.src = image; s.alt = ''; } else s.textContent = text;
      s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; document.body.append(s);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 80;
      s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 40}px) scale(.3) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 800, easing: 'ease-out' }).onfinish = () => s.remove();
    });
  });
}

function animate() {
  if (!window.gsap) { $('#loader').remove(); return; }
  gsap.registerPlugin(ScrollTrigger);

  // split giant text into letters
  $$('.giant span').forEach(sp => { sp.innerHTML = [...sp.textContent].map(c => `<span class="ch">${c}</span>`).join(''); });

  const tl = gsap.timeline({ delay: .15 });
  tl.to('#loader', { yPercent: -100, duration: .9, ease: 'power4.inOut', delay: .5 })
    .from('.giant .ch', { yPercent: 120, rotate: 18, opacity: 0, stagger: .04, duration: .9, ease: 'back.out(1.8)' }, '-=.3')
    .from('.owner', { yPercent: 100, duration: 1, ease: 'power4.out' }, '-=.8')
    .from('.stk', { scale: 0, rotate: -40, stagger: .12, duration: .6, ease: 'back.out(2.5)' }, '-=.4')
    .from('.cap, .sub, .hero .btn, .badge', { y: 40, opacity: 0, stagger: .1 }, '-=.4')
    .add(() => $('#loader').remove());

  // hero scroll + mouse parallax
  gsap.to('.giant', { scale: 1.08, yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.owner', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  $('.hero').addEventListener('pointermove', e => {
    const x = (e.clientX / innerWidth - .5), y = (e.clientY / innerHeight - .5);
    $$('[data-depth]').forEach(el => gsap.to(el, { x: x * el.dataset.depth, y: y * el.dataset.depth, duration: .8, overwrite: 'auto' }));
  });

  // pinned horizontal gallery
  const sec = $('#looks'), track = $('#hTrack');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const hTween = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, pin: true, scrub: 1, end: () => '+=' + dist(), invalidateOnRefresh: true } });
  $$('.hcard img').forEach(img => gsap.fromTo(img, { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true } }));

  // wall: columns drift at different speeds
  $$('.col').forEach((c, i) => gsap.fromTo(c, { y: i === 1 ? 140 : 0 }, { y: i === 1 ? -80 : 90, ease: 'none', scrollTrigger: { trigger: '#wall', start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.col img').forEach(img => gsap.from(img, { scale: .85, opacity: 0, rotate: () => gsap.utils.random(-6, 6), duration: .7, ease: 'back.out(1.6)', scrollTrigger: { trigger: img, start: 'top 92%' } }));

  // big titles
  $$('.sec').forEach(h => gsap.from(h, { yPercent: 60, rotate: -4, opacity: 0, duration: .9, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));

  // marquees speed up while scrolling
  ScrollTrigger.create({ onUpdate: s => gsap.to('.mq', { timeScale: 1 + Math.abs(s.getVelocity()) / 400, duration: .3, overwrite: true }) });

  // sliders cards pop in
  $$('.ig, .yt, .cta').forEach(c => gsap.from(c, { y: 90, opacity: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 95%' } }));

  // map + footer
  gsap.from('.mapbox', { scale: .85, rotate: -2, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.mapbox', start: 'top 85%' } });
  gsap.from('footer .big', { yPercent: 40, opacity: 0, duration: 1, scrollTrigger: { trigger: 'footer', start: 'top 80%' } });
  gsap.from('.soc a', { scale: 0, stagger: .1, ease: 'back.out(2)', scrollTrigger: { trigger: '.soc', start: 'top 90%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
}

// ---------- boot ----------
(async () => {
  const [s, g, v, l] = await Promise.all([get('settings', ''), get('gallery'), get('videos'), get('locations')]);
  const S = { ...DEFAULTS.settings };
  if (Array.isArray(s)) s.forEach(r => { if (r.value) S[r.key] = r.value; });
  const G = Array.isArray(g) && g.length ? g : DEFAULTS.gallery;
  const V = Array.isArray(v) ? v : DEFAULTS.videos;
  const L = Array.isArray(l) && l.length ? l : DEFAULTS.locations;
  render(S, G, V, L);
  lazyIframes(); sliders(); lightbox(G); cursorAndFun(); animate();
})();
})();
