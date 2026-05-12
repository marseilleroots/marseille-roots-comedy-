const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, plateau, name, email, qty, price, timestamp } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Données manquantes' });

  const PL = {
    1: { time: '19H30', label: 'Premier Plateau' },
    2: { time: '21H00', label: 'Deuxième Plateau' },
  };
  const p = PL[plateau] || PL[1];
  const date = new Date(timestamp).toLocaleDateString('fr-FR');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify({ id, p: plateau, ts: timestamp }))}&bgcolor=EDD9A8&color=090806&margin=8`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Marseille Roots Comedy <onboarding@resend.dev>',
      to: 'walaceprod@gmail.com',
      subject: `🎭 Votre billet — Marseille Roots Comedy · ${p.time}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #0A0806; color: #F5F0E8; margin: 0; padding: 0; }
  .container { max-width: 520px; margin: 0 auto; padding: 30px 20px; }
  .header { text-align: center; border-bottom: 1px solid #2A2018; padding-bottom: 20px; margin-bottom: 24px; }
  .title { font-size: 28px; font-weight: 900; color: #E8820C; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #8A7560; letter-spacing: 2px; text-transform: uppercase; }
  .ticket { background: #130F0A; border: 1.5px solid rgba(232,130,12,0.4); border-radius: 16px; overflow: hidden; margin: 20px 0; }
  .ticket-header { background: linear-gradient(135deg, #8A4A00, #E8820C); padding: 20px; }
  .ticket-body { padding: 20px; }
  .label { font-size: 10px; color: #8A7560; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
  .value { font-size: 16px; font-weight: 700; color: #F5F0E8; margin-bottom: 14px; }
  .qr-block { text-align: center; margin: 16px 0; }
  .qr-block img { border-radius: 8px; }
  .ticket-id { font-family: monospace; font-size: 12px; color: #8A7560; letter-spacing: 2px; text-align: center; margin-top: 8px; }
  .info { background: #0F1A0F; border: 1px solid #2A4A2A; border-radius: 10px; padding: 14px; color: #7DC87D; font-size: 13px; margin: 16px 0; }
  .footer { text-align: center; color: #8A7560; font-size: 11px; margin-top: 24px; border-top: 1px solid #2A2018; padding-top: 16px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <div class="title">Marseille Roots Comedy</div>
    <div class="subtitle">Confirmation de réservation</div>
  </div>
  <p>Bonjour <strong>${name}</strong>,</p>
  <p>Votre paiement a bien été reçu. Voici votre billet pour le spectacle :</p>
  <div class="ticket">
    <div class="ticket-header">
      <div style="font-size:22px;font-weight:900;color:#FFF0D8;letter-spacing:2px">${p.time}</div>
      <div style="font-size:12px;color:rgba(255,240,216,0.8);margin-top:4px">${p.label}</div>
    </div>
    <div class="ticket-body">
      <div class="label">Date</div>
      <div class="value">Samedi 4 Juillet 2026</div>
      <div class="label">Lieu</div>
      <div class="value">L'Arlequin · 1 rue Missiri, La Batarelle · 13014 Marseille</div>
      <div class="label">Titulaire</div>
      <div class="value">${name}</div>
      <div class="label">Places</div>
      <div class="value" style="font-size:28px;color:#E8820C">${qty}</div>
      <div class="label">Total payé</div>
      <div class="value">${(price / 100).toFixed(2).replace('.', ',')} €</div>
      <div class="qr-block">
        <img src="${qrUrl}" width="180" height="180" alt="QR Code" />
        <div class="ticket-id">${id}</div>
      </div>
    </div>
  </div>
  <div class="info">
    📱 <strong>Présentez ce QR code à l'entrée</strong> — sur votre téléphone ou imprimé.
  </div>
  <p style="font-size:13px;color:#8A7560">
    🍕 La <strong style="color:#F5F0E8">Pizzeria Maison NPLTN</strong> et le <strong style="color:#F5F0E8">Bar L'Angelis</strong> 
    seront ouverts toute la soirée. DJ pour l'after !
  </p>
  <div class="footer">
    Marseille Roots Comedy · L'Arlequin · 13014 Marseille<br/>
    En partenariat avec MAISON NPLTN · L'Angelis · L'Arlequin
  </div>
</div>
</body>
</html>`,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
