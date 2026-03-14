// === 貼到 Google Apps Script 編輯器裡 ===
// 這個 script 會接收 POST 請求，用你的 Gmail 寄信

const SECRET = 'matching-app-email-secret-2026';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.secret !== SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    GmailApp.sendEmail(data.to, data.subject, '', {
      htmlBody: data.html,
      name: '聯誼活動',
      replyTo: data.replyTo || ''
    });

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
