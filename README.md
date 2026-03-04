# 🀇 台灣麻將 Online

純前端 P2P 多人麻將遊戲，可部署到 GitHub Pages。

## 🚀 部署到 GitHub Pages

1. 建立一個新的 GitHub Repository（例如 `mahjong`）
2. 將所有檔案上傳：
   - `index.html`
   - `js/tiles.js`
   - `js/ai.js`
   - `js/network.js`
   - `js/game.js`
   - `README.md`
3. 進入 Repository → Settings → Pages
4. Source 選 `main` branch，資料夾選 `/ (root)`
5. 等幾分鐘，你的網址就是：`https://你的名字.github.io/mahjong/`

## 🎮 如何遊玩

### 房主（建立房間）
1. 輸入暱稱
2. 點「建立新房間」
3. 複製畫面上的邀請連結，分享給朋友

### 加入者（加入房間）
1. 點朋友分享的連結
2. 輸入暱稱
3. 點「加入房間」

### 開始遊戲
- 房主等玩家加入（1-3位真人）
- 點「開始遊戲（可加入AI補位）」
- 不足4人的座位自動由AI填補

## 🃏 遊戲規則

**台灣麻將（16張）**
- 每人初始16張牌
- 花牌補牌
- 支援：碰、吃、槓、胡
- 計分：基礎3台 + 花牌 + 自摸加成

## 📋 功能

- ✅ P2P 多人連線（無需伺服器）
- ✅ AI 電腦玩家補位
- ✅ 聊天功能
- ✅ 計分系統
- ✅ 遊戲記錄
- ✅ 邀請連結一鍵分享

## ⚠️ 注意事項

- 使用 [PeerJS](https://peerjs.com/) 實現 P2P 連線
- 需要瀏覽器支援 WebRTC（現代瀏覽器均支援）
- 房主需要保持連線，遊戲才能進行
- 不支援跨 NAT 的部分網路環境（可改用 Firebase 版本）
