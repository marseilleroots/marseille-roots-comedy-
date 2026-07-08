const { createClient } = require('@supabase/supabase-js');
const SECRET = 'PURGE-9x7Qz2Kv-arlequin-2026-tmp';
module.exports = async function handler(req, res) {
  if ((req.query.key || '') !== SECRET) return res.status(403).json({ error: 'forbidden' });
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
    await supabase.from('tickets').delete().neq('id', '___never___');
    const { count } = await supabase.from('tickets').select('*', { count: 'exact', head: true });
    return res.status(200).json({ ok: true, remaining: count });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
