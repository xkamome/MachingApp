const nodemailer = require('nodemailer');
const { db } = require('./db');

// 問卷連結（拿到連結後替換這裡，或在 .env 設定 SURVEY_URL）
const SURVEY_URL = process.env.SURVEY_URL || '#';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─────────────────────────────────────────────
// 配對成功信件
// ─────────────────────────────────────────────
function buildSuccessEmail(recipientName, partner, partnerEmail) {
  const igLine = partner.instagram
    ? `<p style="margin:0 0 10px;"><span style="color:#9ca3af;font-size:12px;font-weight:600;letter-spacing:0.5px;">IG</span><br>
       <a href="https://instagram.com/${partner.instagram.replace('@','')}"
          style="color:#db2777;font-size:15px;font-weight:600;text-decoration:none;">
         @${partner.instagram.replace('@', '')}
       </a></p>`
    : '';

  const emailLine = partnerEmail
    ? `<p style="margin:0;"><span style="color:#9ca3af;font-size:12px;font-weight:600;letter-spacing:0.5px;">EMAIL</span><br>
       <a href="mailto:${partnerEmail}"
          style="color:#db2777;font-size:15px;font-weight:600;text-decoration:none;">
         ${partnerEmail}
       </a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f0f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#f472b6,#ec4899);padding:40px 24px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">🎉</div>
    <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">配對成功！</h1>
    <p style="color:rgba(255,255,255,0.88);margin:10px 0 0;font-size:15px;">你們互相選了對方 💕</p>
  </div>

  <!-- Body -->
  <div style="padding:32px 24px;">
    <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 28px;">
      嗨 <strong>${recipientName}</strong>，<br>
      恭喜你！你在這次聯誼活動中配對成功了！
    </p>

    <!-- Partner Card -->
    <div style="background:#fff0f7;border:1.5px solid #fbcfe8;border-radius:16px;padding:24px;margin-bottom:28px;">
      <p style="color:#9ca3af;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 16px;">你的配對對象</p>

      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
        <div style="width:54px;height:54px;border-radius:50%;background:#fce7f3;color:#db2777;font-size:22px;font-weight:800;text-align:center;line-height:54px;flex-shrink:0;">
          ${partner.name.charAt(0)}
        </div>
        <div>
          <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">${partner.name}</p>
          ${partner.bio ? `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">${partner.bio}</p>` : ''}
        </div>
      </div>

      <div style="border-top:1px solid #fbcfe8;padding-top:16px;">
        ${igLine}
        ${emailLine}
      </div>
    </div>

    <!-- Survey CTA -->
    <div style="background:#fdf4ff;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px;">
        趁著這個好心情 😊，請花幾分鐘幫我們填寫意見調查，讓我們下次辦得更好！
      </p>
      <a href="${SURVEY_URL}"
         style="display:inline-block;background:#ec4899;color:#fff;font-weight:700;font-size:15px;
                padding:12px 32px;border-radius:50px;text-decoration:none;">
        📋 填寫意見調查
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #f3f4f6;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">此信件由配對系統自動發送，請勿直接回覆</p>
  </div>

</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// 配對失敗信件
// ─────────────────────────────────────────────
function buildFailureEmail(recipientName) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 24px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">💜</div>
    <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">感謝你的參與！</h1>
    <p style="color:rgba(255,255,255,0.88);margin:10px 0 0;font-size:15px;">希望你今天過得愉快 ✨</p>
  </div>

  <!-- Body -->
  <div style="padding:32px 24px;">
    <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 28px;">
      嗨 <strong>${recipientName}</strong>，<br><br>
      感謝你參加這次的配對活動！雖然這次緣分未到，但每一次相遇都是美好的開始，期待下次再見 😊
    </p>

    <!-- Survey Box -->
    <div style="background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 20px;">
        你的想法對我們很重要！<br>
        請花幾分鐘填寫意見調查，幫助我們把下次活動辦得更好 🙌
      </p>
      <a href="${SURVEY_URL}"
         style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:15px;
                padding:12px 32px;border-radius:50px;text-decoration:none;">
        📋 填寫意見調查
      </a>
    </div>

    <p style="color:#9ca3af;font-size:14px;text-align:center;margin:0;">
      期待下次活動與你相見！
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #f3f4f6;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">此信件由配對系統自動發送，請勿直接回覆</p>
  </div>

</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// 主函式：寄出所有結果 email（成功 + 失敗）
// ─────────────────────────────────────────────
async function sendResultEmails() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[Email] EMAIL_USER / EMAIL_PASS 未設定，跳過寄信');
    return { sent: 0, skipped: 0, errors: [] };
  }

  const choicesRes = await db.execute('SELECT chooser_id, chosen_id, email FROM choices');
  const choiceMap = {};
  for (const c of choicesRes.rows) {
    choiceMap[c.chooser_id] = { chosen_id: c.chosen_id, email: c.email };
  }

  // 找出所有互相配對的組合
  const matchedIds = new Set();
  const pairs = [];
  for (const [chooserId, { chosen_id }] of Object.entries(choiceMap)) {
    if (matchedIds.has(chooserId)) continue;
    const reverse = choiceMap[chosen_id];
    if (reverse && reverse.chosen_id === chooserId) {
      pairs.push([chooserId, chosen_id]);
      matchedIds.add(chooserId);
      matchedIds.add(chosen_id);
    }
  }

  let sent = 0, skipped = 0;
  const errors = [];

  const sendMail = async (to, subject, html, label) => {
    if (!to) { skipped++; return; }
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        html,
      });
      console.log(`[Email] ✅ ${label} <${to}>`);
      sent++;
    } catch (e) {
      console.error(`[Email] ❌ ${label} <${to}>:`, e.message);
      errors.push({ to, error: e.message });
    }
  };

  // ── 配對成功信
  console.log(`[Email] 找到 ${pairs.length} 對配對，寄成功通知...`);
  for (const [idA, idB] of pairs) {
    const [resA, resB] = await Promise.all([
      db.execute({ sql: 'SELECT name, bio, instagram FROM participants WHERE id = ?', args: [idA] }),
      db.execute({ sql: 'SELECT name, bio, instagram FROM participants WHERE id = ?', args: [idB] }),
    ]);
    const personA = resA.rows[0];
    const personB = resB.rows[0];
    if (!personA || !personB) { skipped += 2; continue; }

    const emailA = choiceMap[idA].email;
    const emailB = choiceMap[idB].email;

    await sendMail(emailA, `🎉 配對成功！你的對象是 ${personB.name}`,
      buildSuccessEmail(personA.name, personB, emailB), `成功 → ${personA.name}`);
    await sendMail(emailB, `🎉 配對成功！你的對象是 ${personA.name}`,
      buildSuccessEmail(personB.name, personA, emailA), `成功 → ${personB.name}`);
  }

  // ── 配對失敗感謝信
  const unmatchedIds = Object.keys(choiceMap).filter(id => !matchedIds.has(id));
  console.log(`[Email] 找到 ${unmatchedIds.length} 位未配對，寄感謝信...`);

  for (const id of unmatchedIds) {
    const email = choiceMap[id].email;
    if (!email) { skipped++; continue; }
    const res = await db.execute({ sql: 'SELECT name FROM participants WHERE id = ?', args: [id] });
    const person = res.rows[0];
    if (!person) { skipped++; continue; }

    await sendMail(email, '感謝你參加配對活動 💜',
      buildFailureEmail(person.name), `感謝 → ${person.name}`);
  }

  console.log(`[Email] 完成：寄出 ${sent} 封，略過 ${skipped} 封，失敗 ${errors.length} 封`);
  return { sent, skipped, errors };
}

module.exports = { sendResultEmails };
