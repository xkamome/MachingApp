# 聯誼配對系統

手機介面的 Web 配對系統，適用於聯誼活動。

---

## 安裝與啟動

### 前置需求
請先安裝 [Node.js](https://nodejs.org/) (建議 v18 以上)

### 1. 安裝後端
```bash
cd backend
npm install
npm run dev
```
後端預設跑在 `http://localhost:3001`

### 2. 安裝前端（另開終端機）
```bash
cd frontend
npm install
npm run dev
```
前端預設跑在 `http://localhost:5173`

### 3. 開啟 Admin 後台
瀏覽器開啟 `http://localhost:5173/admin`
預設密碼：`admin1234`（可在 `backend/.env` 修改）

---

## 活動流程

```
Admin 上傳名單
  ↓
Admin 切換到「投票中」
  ↓
參與者用手機掃 QR/開網址
  ↓
選擇自己 → 輸入密碼 → 選擇對象
  ↓
Admin 確認所有人都選好
  ↓
Admin 切換到「已揭曉」
  ↓
每人看到自己的結果
```

---

## Debug 方法

| 問題 | 解法 |
|------|------|
| 有人選錯了 | Admin 後台 → 儀表板 → 找到那人 → 點「重設」→ 請他重新選 |
| 要退回讓大家重選 | Admin 後台 → 切換回「投票中」 |
| 想預覽某人的結果 | Admin 後台 → 儀表板 → 點「預覽」 |
| 看操作記錄 | Admin 後台 → 記錄 tab |
| 參與者資料打錯 | Admin 後台 → 名單 tab → 刪除後重新新增 |

---

## 環境變數 (`backend/.env`)

```
ADMIN_PASSWORD=admin1234   # Admin 密碼
JWT_SECRET=xxxxx           # JWT 簽名密鑰（正式環境請換掉）
PORT=3001                  # 後端 port
```

---

## 手機使用方式

1. 確保手機和電腦在同一個 WiFi
2. 找到電腦的 IP（例如 192.168.1.100）
3. 手機瀏覽器開啟 `http://192.168.1.100:5173`
4. 或使用 ngrok 等工具讓外網也能連

---

## 專案結構

```
Matching App/
├── backend/            # Node.js + Express + SQLite
│   ├── src/
│   │   ├── db.js      # 資料庫初始化
│   │   ├── routes/
│   │   │   ├── public.js   # 公開 API
│   │   │   └── admin.js    # Admin API
│   │   └── index.js        # 主程式
│   ├── data/          # SQLite 資料庫（自動建立）
│   └── .env           # 環境變數
└── frontend/          # React + Vite + Tailwind
    └── src/
        ├── pages/
        │   ├── SelectSelf.jsx    # 選擇「這是我」
        │   ├── SelectMatch.jsx   # 選擇配對對象
        │   ├── Waiting.jsx       # 等待揭曉
        │   ├── Result.jsx        # 配對結果
        │   └── Admin.jsx         # 管理者後台
        └── api.js                # API 封裝
```
