const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, plateau, name, email, qty, price, timestamp } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Données manquantes' });

  const PL = {
    1: { time: '19H30', label: 'Premier Plateau' },
    2: { time: '21H00', label: 'Deuxième Plateau' },
  };
  const p = PL[plateau] || PL[1];
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(JSON.stringify({ id, p: plateau, ts: timestamp }))}&bgcolor=FFFFFF&color=141414&margin=10`;

  // Save to Supabase
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );
    await supabase.from('tickets').upsert({
      id, plateau, name, email,
      phone: req.body.phone || '',
      qty, price, timestamp,
      validated: false
    });
  } catch (err) {
    console.error('Supabase error:', err.message);
  }

  // Send email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "L'Arlequin Comedy <billets@marseillerootscomedy.fr>",
      to: email,
      subject: `🎭 Votre billet — L'Arlequin Comedy · ${p.time}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;color:#141414;margin:0;padding:0}
        .container{max-width:520px;margin:0 auto;padding:30px 20px}
        .header{text-align:center;border-bottom:1px solid #ECECEC;padding-bottom:20px;margin-bottom:24px}
        .title{font-size:28px;font-weight:800;color:#FF2D8B;margin:0 0 4px;letter-spacing:-0.5px}
        .subtitle{font-size:13px;color:#8A8A8A;letter-spacing:2px;text-transform:uppercase}
        .ticket{background:#ffffff;border:1px solid #ECECEC;border-radius:16px;overflow:hidden;margin:20px 0}
        .ticket-header{background:linear-gradient(135deg,#C4116A,#FF2D8B);padding:20px;text-align:center}
        .ticket-body{padding:20px}
        .label{font-size:10px;color:#8A8A8A;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px}
        .value{font-size:16px;font-weight:700;color:#141414;margin-bottom:14px}
        .qr-block{text-align:center;margin:16px 0}
        .ticket-id{font-family:monospace;font-size:12px;color:#8A8A8A;letter-spacing:2px;text-align:center;margin-top:8px}
        .info{background:#E4F9F5;border:1px solid #A8E6DA;border-radius:10px;padding:14px;color:#00897B;font-size:13px;margin:16px 0}
        .footer{text-align:center;color:#8A8A8A;font-size:11px;margin-top:24px;border-top:1px solid #ECECEC;padding-top:16px}
      </style></head><body>
      <div class="container">
        <div class="header">
          <div class="title">L'Arlequin Comedy</div>
          <div class="subtitle">Confirmation de réservation</div>
        </div>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Votre paiement a bien été reçu. Voici votre billet :</p>
        <div class="ticket">
          <div class="ticket-header">
            <div style="font-size:22px;font-weight:900;color:#FFFFFF;letter-spacing:2px">${p.time}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:4px">${p.label}</div>
          </div>
          <div class="ticket-body">
            <div class="label">Date</div><div class="value">Samedi 5 Septembre 2026</div>
            <div class="label">Lieu</div><div class="value">L'Arlequin · 1 rue Missiri · 13014 Marseille</div>
            <div class="label">Titulaire</div><div class="value">${name}</div>
            <div class="label">Places</div><div class="value" style="font-size:28px;color:#FF2D8B">${qty}</div>
            <div class="label">Total</div><div class="value">${Number(price).toFixed(2).replace('.', ',')} €</div>
            <div class="qr-block">
              <img src="${qrUrl}" width="180" height="180" alt="QR Code" style="border-radius:8px;border:1px solid #ECECEC"/>
              <div class="ticket-id">${id}</div>
            </div>
          </div>
        </div>
        <div class="info">📱 <strong>Présentez ce QR code à l'entrée</strong> — sur téléphone ou imprimé.</div>
        <p style="font-size:13px;color:#8A8A8A">🍕 <strong style="color:#141414">Pizzeria Maison NPLTN</strong> &amp; <strong style="color:#141414">Bar L'Angelis</strong> ouverts toute la soirée. DJ pour l'after !</p>
        <div class="footer">L'Arlequin Comedy · L'Arlequin · 13014 Marseille<br/>MAISON NPLTN · L'Angelis · L'Arlequin</div>
      </div></body></html>`,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
