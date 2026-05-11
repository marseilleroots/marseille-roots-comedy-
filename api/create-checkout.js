import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plateau, qty, name, email } = req.body;

  const PL = {
    1: { time: '19H30', label: 'Premier Plateau', price: 2000 },
    2: { time: '21H00', label: 'Deuxième Plateau', price: 2000 },
  };

  const p = PL[plateau];
  if (!p) return res.status(400).json({ error: 'Plateau invalide' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Marseille Roots Comedy — ${p.label} ${p.time}`,
              description: `4 Juillet 2026 · L'Arlequin · 1 rue Missiri · 13014 Marseille`,
            },
            unit_amount: p.price,
          },
          quantity: qty,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}&plateau=${plateau}&qty=${qty}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`,
      cancel_url: `${req.headers.origin}`,
      metadata: { plateau: String(plateau), qty: String(qty), name, email },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
