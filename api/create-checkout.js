const Stripe = require('stripe');

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

  if (!prices[plateau]) return res.status(400).json({ error: 'Plateau invalide' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Marseille Roots Comedy — ${labels[plateau]}`,
            description: "4 Juillet 2026 · L'Arlequin · 1 rue Missiri · 13014 Marseille",
          },
          unit_amount: prices[plateau],
        },
        quantity: parseInt(qty),
      }],
      mode: 'payment',
      success_url: `${req.headers.origin || 'https://marseille-roots-comedy.vercel.app'}/?success=1&plateau=${plateau}&qty=${qty}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`,
      cancel_url: `${req.headers.origin || 'https://marseille-roots-comedy.vercel.app'}/`,
      metadata: { plateau: String(plateau), qty: String(qty), name, email },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
