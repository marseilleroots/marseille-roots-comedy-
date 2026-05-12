const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ tickets: data || [] });
  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
