const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. who is calling?
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Not signed in' });

  // 2. must be super admin
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!me || me.role !== 'super_admin') return res.status(403).json({ error: 'Super admin only' });

  const body = req.body || {};
  const ROLES = ['admin', 'super_admin'];

  try {
    if (req.method === 'GET') {
      const { data: profiles } = await admin.from('profiles').select('id, role, created_at');
      const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (error) throw error;
      const emails = Object.fromEntries(list.users.map(u => [u.id, u.email]));
      return res.json((profiles || []).map(p => ({ ...p, email: emails[p.id] || '?', self: p.id === user.id })));
    }

    if (req.method === 'POST') {
      const { email, password, role } = body;
      if (!email || !password || password.length < 8) return res.status(400).json({ error: 'Email and an 8+ character password needed' });
      if (!ROLES.includes(role)) return res.status(400).json({ error: 'Bad role' });
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error;
      const { error: pErr } = await admin.from('profiles').insert({ id: data.user.id, role });
      if (pErr) { await admin.auth.admin.deleteUser(data.user.id); throw pErr; }
      return res.json({ ok: true });
    }

    if (req.method === 'PATCH') {
      const { id, role } = body;
      if (!ROLES.includes(role)) return res.status(400).json({ error: 'Bad role' });
      if (id === user.id) return res.status(400).json({ error: "You can't change your own role" });
      const { error } = await admin.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id needed' });
      if (id === user.id) return res.status(400).json({ error: "You can't delete yourself" });
      const { error } = await admin.auth.admin.deleteUser(id); // profile row cascades
      if (error) throw error;
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Something went wrong' });
  }
};
