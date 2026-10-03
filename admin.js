(() => {
const C = window.SITE_CONFIG;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
if (!C || /YOUR/i.test(C.SUPABASE_URL)) {
  $('#err').textContent = 'Fill in config.js with your Supabase URL and anon key first.';
}
const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
let role = 'admin', me = null;

const toast = (m, bad) => {
  const t = $('#toast'); t.textContent = m; t.className = bad ? 'bad' : ''; t.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => t.style.display = 'none', 2600);
};
const run = async (fn) => { try { await fn(); } catch (e) { toast(e.message || 'Failed', true); } };
const must = r => { if (r.error) throw r.error; return r.data; };

// ---------- auth ----------
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) boot(session.user);
})();

$('#loginForm').onsubmit = async e => {
  e.preventDefault(); $('#err').textContent = '';
  const { data, error } = await sb.auth.signInWithPassword({ email: $('#em').value, password: $('#pw').value });
  if (error) return $('#err').textContent = error.message;
  boot(data.user);
};
$('#out').onclick = async () => { await sb.auth.signOut(); location.reload(); };

async function boot(user) {
  const { data: p } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!p) { await sb.auth.signOut(); $('#err').textContent = 'This account has no admin access.'; return; }
  me = user; role = p.role;
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  $('#me').textContent = user.email;
  $('#role').textContent = role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN';
  const tabs = [['content', '✏️ Content'], ['gallery', '🖼 Gallery'], ['videos', '🎬 Videos'], ['locations', '📍 Locations']];
  if (role === 'super_admin') tabs.push(['users', '👥 Users']);
  $('#tabs').innerHTML = tabs.map(([k, l]) => `<button class="ghost" data-k="${k}">${l}</button>`).join('');
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.k); };
  go('content');
}

function go(k) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  $('#view').innerHTML = '<p>Loading…</p>';
  run(() => views[k]());
}

// ---------- helpers ----------
async function upload(file) {
  const path = `assets/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${file.name.replace(/[^\w.]+/g, '_')}`;
  must(await sb.storage.from('gallery').upload(path, file, { contentType: file.type }));
  return sb.storage.from('gallery').getPublicUrl(path).data.publicUrl;
}
const nextSort = async table => {
  const { data } = await sb.from(table).select('sort').order('sort', { ascending: false }).limit(1);
  return ((data && data[0] && data[0].sort) || 0) + 1;
};
const apiUsers = async (method, body, qs = '') => {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch('/api/users' + qs, {
    method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
};

// ---------- views ----------
const CONTENT_DEFAULTS = {
  owner_image: 'assets/Rainbow%20Feathered%20Chick%20Mascot.png',
  owner_name: 'Salon owner. Colour captain. Vibe curator.',
  owner_bio: 'Big colour, good energy, zero boring hair days. Every look gets a little more you and a lot more wow.',
  hero_caption: 'Hair. Colour. Chaos.',
  hero_sub: 'Walk in chick, walk out icon.',
  sticker1: 'Cuts', sticker2: '🎨 Colour', sticker3: '✨ Glow up',
  tags: 'HAIR,COLOUR,STYLE,GLOW,CHAOS,SLAY',
  instagram: 'https://www.instagram.com/colour_kozhi_kunji_saloon',
  youtube: 'https://youtube.com/@colourkozhikuji',
  facebook: 'https://www.facebook.com/profile.php?id=100063850134309',
  phone: ''
};

const CONTENT_GROUPS = [
  { title: 'Owner profile', fields: [['owner_image', 'Owner photo', 'image'], ['owner_name', 'Owner name'], ['owner_bio', 'Owner story']] },
  { title: 'Hero section', fields: [['hero_caption', 'Hero caption'], ['hero_sub', 'Small caption']] },
  { title: 'Hero stickers', fields: [['sticker1', 'Sticker 1'], ['sticker2', 'Sticker 2'], ['sticker3', 'Sticker 3']] },
  { title: 'Marquee', fields: [['tags', 'Marquee words (comma separated)']] },
  { title: 'Social & contact', fields: [['instagram', 'Instagram link'], ['youtube', 'YouTube link'], ['facebook', 'Facebook link (footer)'], ['phone', 'Phone (optional)']] }
];

const views = {
  async content() {
    const rows = must(await sb.from('settings').select('*'));
    const S = { ...CONTENT_DEFAULTS };
    rows.forEach(row => { if (row.value) S[row.key] = row.value; });
    $('#view').innerHTML = CONTENT_GROUPS.map((group, index) => `<div class="card">
      <h2 class="f">${group.title}</h2>
      ${group.fields.map(([key, label, type]) => `<div class="row"><label>${label}</label><input data-k="${key}" value="${esc(S[key])}">${type === 'image' ? `<input type="file" accept="image/*" data-up="${key}" style="padding:6px">` : '<span></span>'}</div>`).join('')}
      <button type="button" data-save-group="${index}">Save ${group.title}</button></div>`).join('');
    $('#view').querySelectorAll('[data-up]').forEach(f => f.onchange = () => run(async () => {
      if (!f.files[0]) return;
      toast('Uploading…');
      document.querySelector(`#view input[data-k="${f.dataset.up}"]`).value = await upload(f.files[0]);
      toast('Uploaded — save Owner profile to apply');
    }));
    $('#view').querySelectorAll('[data-save-group]').forEach(button => button.onclick = () => run(async () => {
      const group = CONTENT_GROUPS[+button.dataset.saveGroup];
      const out = group.fields.map(([key]) => ({ key, value: $(`#view input[data-k="${key}"]`).value.trim() }));
      must(await sb.from('settings').upsert(out));
      toast(`${group.title} saved`);
    }));
  },

  async gallery() {
    const rows = must(await sb.from('gallery').select('*').order('sort').order('id'));
    $('#view').innerHTML = `<div class="card"><h2 class="f">Add images</h2><p class="hint">Uploads are stored in Supabase Storage: gallery/assets/.</p>
      <div class="inline"><input type="file" id="files" accept="image/*" multiple><button id="upl">Upload</button></div>
      <div class="inline"><input id="urlIn" placeholder="…or paste an image link"><button id="addUrl" class="ghost">Add link</button></div></div>
      <div class="card"><h2 class="f">${rows.length} images</h2><p class="hint">First 10 appear in the horizontal strip. Use ◀ ▶ to reorder.</p>
      <div class="grid">${rows.map((r, i) => `<div class="g"><img src="${esc(r.url)}" loading="lazy"><div class="b">
        <input value="${esc(r.caption)}" placeholder="caption" data-cap="${r.id}">
        <div><button class="ghost" data-mv="${i},-1">◀</button><button class="ghost" data-mv="${i},1">▶</button><button class="danger" data-del="${i}">🗑</button></div></div></div>`).join('')}</div></div>`;
    $('#upl').onclick = () => run(async () => {
      const fs = [...$('#files').files]; if (!fs.length) return toast('Pick images first', true);
      let s = await nextSort('gallery');
      for (const f of fs) { toast(`Uploading ${f.name}…`); must(await sb.from('gallery').insert({ url: await upload(f), sort: s++ })); }
      toast('Uploaded ✨'); go('gallery');
    });
    $('#addUrl').onclick = () => run(async () => {
      const u = $('#urlIn').value.trim(); if (!u) return;
      must(await sb.from('gallery').insert({ url: u, sort: await nextSort('gallery') })); go('gallery');
    });
    $('#view').onchange = e => { const id = e.target.dataset.cap; if (id) run(async () => { must(await sb.from('gallery').update({ caption: e.target.value }).eq('id', id)); toast('Saved'); }); };
    $('#view').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mv) run(async () => {
        const [i, d] = b.dataset.mv.split(',').map(Number), j = i + d; if (j < 0 || j >= rows.length) return;
        [rows[i], rows[j]] = [rows[j], rows[i]];
        await Promise.all(rows.map((r, k) => r.sort !== k ? sb.from('gallery').update({ sort: k }).eq('id', r.id) : null));
        go('gallery');
      });
      if (b.dataset.del) run(async () => {
        if (!confirm('Delete this image?')) return;
        const r = rows[+b.dataset.del];
        must(await sb.from('gallery').delete().eq('id', r.id));
        const m = r.url.match(/\/object\/public\/gallery\/(.+)$/);
        if (m) await sb.storage.from('gallery').remove([decodeURIComponent(m[1])]);
        go('gallery');
      });
    };
  },

  async videos() {
    const rows = must(await sb.from('videos').select('*').order('sort').order('id'));
    const kind = u => /instagram\.com/.test(u) ? 'Instagram' : /youtu/.test(u) ? 'YouTube' : '?';
    $('#view').innerHTML = `<div class="card"><h2 class="f">Add Instagram video</h2>
      <p class="hint">Use a public Instagram post or reel link.</p>
      <div class="inline"><input id="instagramUrl" type="url" placeholder="Instagram URL"><input id="instagramTitle" placeholder="Title (optional)"><button type="button" data-video-add="instagram">Add Instagram</button></div></div>
      <div class="card"><h2 class="f">Add YouTube video</h2>
      <p class="hint">Use a YouTube video, short, or live link.</p>
      <div class="inline"><input id="youtubeUrl" type="url" placeholder="YouTube URL"><input id="youtubeTitle" placeholder="Title (optional)"><button type="button" data-video-add="youtube">Add YouTube</button></div></div>
      <div class="card"><h2 class="f">${rows.length} videos</h2><div class="list">${rows.map(r =>
        `<div><span class="tag">${kind(r.url)}</span><input type="url" value="${esc(r.url)}" data-video-url="${r.id}" aria-label="${kind(r.url)} URL"><input value="${esc(r.title)}" placeholder="Title (optional)" data-video-title="${r.id}" aria-label="Video title"><button type="button" class="ghost" data-video-save="${r.id}">Save</button><button type="button" class="danger" data-d="${r.id}">🗑</button></div>`).join('')}</div></div>`;
    $('#view').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.videoAdd) run(async () => {
        const platform = b.dataset.videoAdd;
        const url = $(`#${platform}Url`).value.trim();
        const title = $(`#${platform}Title`).value.trim();
        const expected = platform === 'instagram' ? 'Instagram' : 'YouTube';
        if (kind(url) !== expected) return toast(`Enter a valid ${expected} URL`, true);
        must(await sb.from('videos').insert({ url, title, sort: await nextSort('videos') }));
        go('videos');
      });
      if (b.dataset.videoSave) run(async () => {
        const id = b.dataset.videoSave;
        const url = $(`#view [data-video-url="${id}"]`).value.trim();
        const title = $(`#view [data-video-title="${id}"]`).value.trim();
        if (kind(url) === '?') return toast('Enter an Instagram or YouTube URL', true);
        must(await sb.from('videos').update({ url, title }).eq('id', id));
        toast('Video updated');
      });
      if (b.dataset.d && confirm('Delete?')) run(async () => { must(await sb.from('videos').delete().eq('id', b.dataset.d)); go('videos'); });
    };
  },

  async locations() {
    const rows = must(await sb.from('locations').select('*').order('sort').order('id'));
    $('#view').innerHTML = `<div class="card"><h2 class="f">Add location</h2>
      <p class="hint">Address = place name, address, "lat,lng", or paste Google Maps → Share → Embed a map (the &lt;iframe&gt; code). Maps link = the normal share link (for the "Open in Maps" button).</p>
      <div class="inline"><input id="ln" placeholder="Branch name"><input id="la" placeholder="Address / lat,lng / iframe code"><input id="lm" placeholder="Maps link"><button id="ladd">Add</button></div></div>
      <div class="card"><h2 class="f">${rows.length} locations</h2>${rows.map(r => `<div class="inline" data-id="${r.id}">
        <input value="${esc(r.name)}" data-f="name"><input value="${esc(r.address)}" data-f="address"><input value="${esc(r.maps_url)}" data-f="maps_url">
        <button data-s="${r.id}">Save</button><button class="danger" data-d="${r.id}">🗑</button></div>`).join('')}</div>`;
    $('#ladd').onclick = () => run(async () => {
      if (!$('#ln').value.trim()) return toast('Name needed', true);
      must(await sb.from('locations').insert({ name: $('#ln').value.trim(), address: $('#la').value.trim(), maps_url: $('#lm').value.trim(), sort: await nextSort('locations') })); go('locations');
    });
    $('#view').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.s) run(async () => {
        const o = {}; b.parentElement.querySelectorAll('[data-f]').forEach(i => o[i.dataset.f] = i.value.trim());
        must(await sb.from('locations').update(o).eq('id', b.dataset.s)); toast('Saved');
      });
      if (b.dataset.d && confirm('Delete location?')) run(async () => { must(await sb.from('locations').delete().eq('id', b.dataset.d)); go('locations'); });
    };
  },

  async users() {
    const list = await apiUsers('GET');
    $('#view').innerHTML = `<div class="card"><h2 class="f">Create admin</h2>
      <div class="inline"><input id="ne" type="email" placeholder="Email"><input id="np" type="text" placeholder="Password (8+ chars)">
      <select id="nr" style="max-width:160px"><option value="admin">Admin</option><option value="super_admin">Super admin</option></select><button id="nc">Create</button></div></div>
      <div class="card"><h2 class="f">${list.length} users</h2><div class="list">${list.map(u => `<div>
        <b>${esc(u.email)} ${u.self ? '<span class="tag">you</span>' : ''}</b>
        ${u.self ? `<span class="tag">${u.role}</span>` : `<select data-r="${u.id}" style="max-width:160px"><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option><option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super admin</option></select><button class="danger" data-d="${u.id}">🗑</button>`}
      </div>`).join('')}</div></div>`;
    $('#nc').onclick = () => run(async () => {
      await apiUsers('POST', { email: $('#ne').value.trim(), password: $('#np').value, role: $('#nr').value }); toast('User created ✨'); go('users');
    });
    $('#view').onchange = e => { const id = e.target.dataset.r; if (id) run(async () => { await apiUsers('PATCH', { id, role: e.target.value }); toast('Role updated'); }); };
    $('#view').onclick = e => { const b = e.target.closest('[data-d]'); if (b && confirm('Delete this user?')) run(async () => { await apiUsers('DELETE', null, '?id=' + b.dataset.d); go('users'); }); };
  }
};
})();
