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
  const N = Math.max(1, parseInt(qty) || 1);
  const unit = Number(price) / N; // prix unitaire (ex. 20)

  // Un sous-billet (donc un QR) par place
  const seats = Array.from({ length: N }, (_, i) => ({ seatId: `${id}-${i + 1}`, index: i + 1 }));

  // Enregistrement : N lignes, une par place, chacune validable une seule fois
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
    const rows = seats.map(s => ({
      id: s.seatId, plateau, name, email,
      phone: req.body.phone || '',
      qty: 1, price: unit, timestamp, validated: false,
    }));
    await supabase.from('tickets').upsert(rows);
  } catch (err) {
    console.error('Supabase error:', err.message);
  }

  // Un bloc QR par place
  const qrBlocks = seats.map(s => {
    const data = encodeURIComponent(JSON.stringify({ id: s.seatId, p: plateau, ts: timestamp }));
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}&bgcolor=FFFFFF&color=141414&margin=10`;
    return `<div style="text-align:center;margin:8px 0 18px;padding-bottom:16px;border-bottom:1px dashed #ECECEC">
        ${N > 1 ? `<div style="font-size:12px;color:#FF2D8B;font-weight:700;letter-spacing:1px;margin-bottom:8px">PLACE ${s.index} / ${N}</div>` : ''}
        <img src="${qrUrl}" width="170" height="170" alt="QR place ${s.index}" style="border-radius:8px;border:1px solid #ECECEC"/>
        <div style="font-family:monospace;font-size:12px;color:#8A8A8A;letter-spacing:2px;margin-top:8px">${s.seatId}</div>
      </div>`;
  }).join('');

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "L'Arlequin Comedy <billets@marseillerootscomedy.fr>",
      to: email,
      subject: `🎭 ${N > 1 ? 'Vos billets' : 'Votre billet'} — L'Arlequin Comedy · ${p.time}`,
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
        .info{background:#E4F9F5;border:1px solid #A8E6DA;border-radius:10px;padding:14px;color:#00897B;font-size:13px;margin:16px 0}
        .footer{text-align:center;color:#8A8A8A;font-size:11px;margin-top:24px;border-top:1px solid #ECECEC;padding-top:16px}
      </style></head><body>
      <div class="container">
        <div class="header">
          <div class="title">L'Arlequin Comedy</div>
          <div class="subtitle">Confirmation de réservation</div>
        </div>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Votre paiement a bien été reçu. Voici ${N > 1 ? `vos <strong>${N} billets</strong>` : 'votre billet'} :</p>
        <div class="ticket">
          <div class="ticket-header">
            <div style="font-size:22px;font-weight:900;color:#FFFFFF;letter-spacing:2px">${p.time}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:4px">${p.label}</div>
          </div>
          <div class="ticket-body">
            <div class="label">Date</div><div class="value">Samedi 5 Septembre 2026</div>
            <div class="label">Lieu</div><div class="value">L'Arlequin · 1 rue Missiri · 13014 Marseille</div>
            <div class="label">Titulaire</div><div class="value">${name}</div>
            <div class="label">Places</div><div class="value" style="font-size:28px;color:#FF2D8B">${N}</div>
            <div class="label">Total</div><div class="value">${Number(price).toFixed(2).replace('.', ',')} €</div>
            ${N > 1 ? `<div style="background:#FFE6F1;color:#C4116A;border-radius:10px;padding:12px;font-size:13px;font-weight:600;text-align:center;margin:8px 0 4px">Un QR code par personne — chacun scannable une seule fois</div>` : ''}
            ${qrBlocks}
          </div>
        </div>
        <div class="info">📱 <strong>${N > 1 ? 'Chaque personne présente SON QR code à l\'entrée' : 'Présentez ce QR code à l\'entrée'}</strong> — sur téléphone ou imprimé.</div>
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
