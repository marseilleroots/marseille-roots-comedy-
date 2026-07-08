const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const CAPACITE_PLATEAU = 180; // places max par plateau

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { plateau, qty, name, email } = req.body;
  const prices = { 1: 2000, 2: 2000 };
  const labels = { 1: 'Premier Plateau 19H30', 2: 'Deuxième Plateau 21H00' };
  const q = parseInt(qty) || 0;

  if (!prices[plateau]) return res.status(400).json({ error: 'Plateau invalide' });
  if (q < 1) return res.status(400).json({ error: 'Quantité invalide' });

  // Garde-fou capacité : refuser si le plateau serait dépassé
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
    const { data: existing, error } = await supabase
      .from('tickets')
      .select('qty')
      .eq('plateau', plateau);
    if (!error) {
      const sold = (existing || []).reduce((s, t) => s + (t.qty || 0), 0);
      const restant = Math.max(0, CAPACITE_PLATEAU - sold);
      if (sold >= CAPACITE_PLATEAU) {
        return res.status(409).json({ error: 'Ce plateau est complet.', complet: true, restant: 0 });
      }
      if (q > restant) {
        return res.status(409).json({ error: `Il ne reste que ${restant} place(s) sur ce plateau.`, restant });
      }
    }
  } catch (e) {
    console.error('Capacity check error:', e.message);
    // en cas d'erreur de lecture, on laisse passer (fail-open) pour ne pas bloquer les ventes
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `L'Arlequin Comedy — ${labels[plateau]}`,
            description: "Samedi 5 Septembre 2026 · L'Arlequin · 1 rue Missiri · 13014 Marseille",
          },
          unit_amount: prices[plateau],
        },
        quantity: q,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin || 'https://arlequin-comedy.vercel.app'}/?success=1&plateau=${plateau}&qty=${q}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`,
      cancel_url: `${req.headers.origin || 'https://arlequin-comedy.vercel.app'}/`,
      metadata: { plateau: String(plateau), qty: String(q), name, email },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
