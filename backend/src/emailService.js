const nodemailer = require('nodemailer');
const { db } = require('./db');

// 建立 transporter（Gmail SMTP）
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 產生寄給配對成功者的 HTML 信件內容
function buildMatchEmail(recipientName, partner) {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f0f5;font-family:sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f472b6,#ec4899);padding:36px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">🎉</div>
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">配對成功！</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">你們互相選了對方</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:16px;margin:0 0 24px;">
        嗨 <strong>${recipientName}</strong>，<br>
        恭喜你！這次聯誼活動的配對結果出來了 💕
      </p>

      <!-- Partner Card -->
      <div style="background:#fff0f7;border:1.5px solid #fbcfe8;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
        <div style="width:64px;height:64px;border-radius:50%;background:#fce7f3;color:#db2777;font-size:28px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          ${partner.name.charAt(0)}
        </div>
        <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 6px;">${partner.name}</h2>
        ${partner.bio ? `<p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${partner.bio}</p>` : ''}
        <div style="border-top:1px solid #fbcfe8;padding-top:16px;margin-top:4px;">
          <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">對方的聯絡 email</p>
          <a href="mailto:${partner.email}" style="color:#db2777;font-size:16px;font-weight:600;text-decoration:none;">
            ${partner.email}
          </a>
        </div>
      </div>

      <p style="color:#6b7280;font-size:14px;text-align:center;margin:0;">
        鼓起勇氣，傳個訊息打個招呼吧 😊
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;padding:16px 24px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">此信件由配對系統自動發送，請勿直接回覆</p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

// 找出所有互相配對的組合，並寄信給每一對
async function sendAllMatchEmails() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[Email] EMAIL_USER / EMAIL_PASS 未設定，跳過寄信');
    return { sent: 0, skipped: 0, errors: [] };
  }

  // 取得所有選擇記錄（含 email）
  const choicesRes = await db.execute(
    'SELECT chooser_id, chosen_id, email FROM choices'
  );
  const choices = choicesRes.rows;

  // 建立 chooser_id → { chosen_id, email } 的 map
  const choiceMap = {};
  for (const c of choices) {
    choiceMap[c.chooser_id] = { chosen_id: c.chosen_id, email: c.email };
  }

  // 找出所有互相配對的 pair（避免重複寄）
  const matched = new Set();
  const pairs = [];
  for (const [chooserId, { chosen_id }] of Object.entries(choiceMap)) {
    if (matched.has(chooserId)) continue;
    const reverse = choiceMap[chosen_id];
    if (reverse && reverse.chosen_id === chooserId) {
      pairs.push([chooserId, chosen_id]);
      matched.add(chooserId);
      matched.add(chosen_id);
    }
  }

  console.log(`[Email] 找到 ${pairs.length} 對配對，開始寄信...`);

  let sent = 0, skipped = 0;
  const errors = [];

  for (const [idA, idB] of pairs) {
    // 取得兩人的 participants 資料
    const [resA, resB] = await Promise.all([
      db.execute({ sql: 'SELECT id, name, bio, photo FROM participants WHERE id = ?', args: [idA] }),
      db.execute({ sql: 'SELECT id, name, bio, photo FROM participants WHERE id = ?', args: [idB] }),
    ]);
    const personA = resA.rows[0];
    const personB = resB.rows[0];

    if (!personA || !personB) { skipped += 2; continue; }

    const emailA = choiceMap[idA].email;  // A 自己填的 email
    const emailB = choiceMap[idB].email;  // B 自己填的 email

    // 寄給 A（告知配對對象是 B）
    if (emailA) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: emailA,
          subject: `🎉 配對成功！你的對象是 ${personB.name}`,
          html: buildMatchEmail(personA.name, { ...personB, email: emailB }),
        });
        console.log(`[Email] ✅ 寄給 ${personA.name} <${emailA}>`);
        sent++;
      } catch (e) {
        console.error(`[Email] ❌ 寄給 ${personA.name} 失敗:`, e.message);
        errors.push({ to: emailA, error: e.message });
      }
    } else {
      skipped++;
    }

    // 寄給 B（告知配對對象是 A）
    if (emailB) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: emailB,
          subject: `🎉 配對成功！你的對象是 ${personA.name}`,
          html: buildMatchEmail(personB.name, { ...personA, email: emailA }),
        });
        console.log(`[Email] ✅ 寄給 ${personB.name} <${emailB}>`);
        sent++;
      } catch (e) {
        console.error(`[Email] ❌ 寄給 ${personB.name} 失敗:`, e.message);
        errors.push({ to: emailB, error: e.message });
      }
    } else {
      skipped++;
    }
  }

  console.log(`[Email] 完成：寄出 ${sent} 封，略過 ${skipped} 封，失敗 ${errors.length} 封`);
  return { sent, skipped, errors };
}

module.exports = { sendAllMatchEmails };
