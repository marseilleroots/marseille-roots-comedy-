const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID manquant' });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    // Get ticket
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !ticket) return res.status(404).json({ error: 'Billet introuvable' });
    if (ticket.validated) return res.status(200).json({ status: 'used', ticket });

    // Mark as validated
    await supabase.from('tickets').update({ validated: true }).eq('id', id);
    return res.status(200).json({ status: 'ok', ticket: { ...ticket, validated: true } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
