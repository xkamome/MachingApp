const nodemailer = require('nodemailer');
const dns = require('dns');
const { db } = require('./db');

dns.setDefaultResultOrder('ipv4first');

const SURVEY_URL = process.env.SURVEY_URL || 'https://docs.google.com/forms/d/e/1FAIpQLSfGrqUEUneigS7_PLf_lD-_rnYWoF7WH8DrcHlY558P5K6RqQ/viewform?usp=header';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─────────────────────────────────────────────
// 配對成功信件
// ─────────────────────────────────────────────
function buildSuccessEmail(recipientName, partner) {
  const igLine = partner.instagram
    ? `<p style="margin:16px 0 0;font-size:15px;color:#374151;">對方的 Instagram：<strong>@${partner.instagram.replace('@', '')}</strong></p>`
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
    <p style="color:#374151;font-size:16px;line-height:1.8;margin:0 0 24px;">
      親愛的 <strong>${recipientName}</strong>，<br><br>
      感謝你參加這次的聯誼活動！<br><br>
      恭喜你——配對成功了 🎉<br>
      你們兩個互相選了對方，真的很有緣分！
    </p>

    <!-- Info Card -->
    <div style="background:#fff0f7;border:1.5px solid #fbcfe8;border-radius:16px;padding:24px;margin-bottom:28px;">
      <p style="color:#374151;font-size:15px;margin:0;">你是：<strong>${recipientName}</strong></p>
      <p style="color:#374151;font-size:15px;margin:12px 0 0;">你的配對對象是：<strong>${partner.name}</strong></p>
      ${igLine}
    </div>

    <p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 28px;">
      請你們主動出擊、互相聯絡吧，祝你們有個美好的開始 💕
    </p>

    <!-- Survey CTA -->
    <div style="background:#fdf4ff;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px;">
        趁著這個好心情 😊，請花一點時間幫我們填寫問卷，讓我們下次辦得更好！
      </p>
      <a href="${SURVEY_URL}"
         style="display:inline-block;background:#ec4899;color:#fff;font-weight:700;font-size:15px;
                padding:12px 32px;border-radius:50px;text-decoration:none;">
        📋 點我填寫問卷
      </a>
    </div>

    <p style="color:#6b7280;font-size:14px;text-align:center;margin:0;">聯誼工作人員敬上</p>
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
    <p style="color:rgba(255,255,255,0.88);margin:10px 0 0;font-size:15px;">希望你今天過得開心 ✨</p>
  </div>

  <!-- Body -->
  <div style="padding:32px 24px;">
    <p style="color:#374151;font-size:16px;line-height:1.8;margin:0 0 28px;">
      親愛的 <strong>${recipientName}</strong>，<br><br>
      感謝你參加這次的聯誼活動！<br><br>
      這次緣分雖然差了一點點，但每一次的相遇都是美好的經驗，希望你今天過得開心 😊<br><br>
      世界很小，緣分說不定只是還沒到，期待未來有機會再相見！
    </p>

    <!-- Survey Box -->
    <div style="background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 20px;">
        麻煩幫我們填寫問卷，讓我們下次把活動辦得更好 🙌
      </p>
      <a href="${SURVEY_URL}"
         style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:15px;
                padding:12px 32px;border-radius:50px;text-decoration:none;">
        📋 點我填寫問卷
      </a>
    </div>

    <p style="color:#6b7280;font-size:14px;text-align:center;margin:0;">聯誼工作人員敬上</p>
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
      await transporter.sendMail({ from: `"聯誼活動" <${process.env.EMAIL_USER}>`, to, subject, html, replyTo: process.env.EMAIL_USER });
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
      buildSuccessEmail(personA.name, personB), `成功 → ${personA.name}`);
    await sendMail(emailB, `🎉 配對成功！你的對象是 ${personA.name}`,
      buildSuccessEmail(personB.name, personA), `成功 → ${personB.name}`);
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

module.exports = { sendResultEmails, buildSuccessEmail, buildFailureEmail };
