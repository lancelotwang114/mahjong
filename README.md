# 🀇 台灣麻將 Online

> 純前端台灣 16 張麻將，無需安裝、無需伺服器，直接在瀏覽器玩。支援單機 AI 對戰與 P2P 連線多人對戰。

**🎮 線上試玩：[https://lancelotwang114.github.io/mahjong/](https://lancelotwang114.github.io/mahjong/)**

---

## 畫面截圖

![遊戲畫面](preview.jpg)

---

## 功能特色

- 🀄 **完整台灣麻將規則** — 16 張、花牌自動補牌、碰／吃／槓／胡
- 🤖 **三位 AI 對手** — 單機模式，可調整速度（慢／正常／快）
- 🌐 **P2P 連線多人** — 建立房間分享代碼，4 人連線對戰
- 🔊 **語音報牌** — 中文語音播報（Web Speech API）
- 💰 **完整計分系統** — 底台、花台、對對胡、清一色等台數計算
- ⏱️ **出牌計時器** — 可設定 8～20 秒限制
- 🎯 **聽牌偵測** — 自動顯示等待牌與剩餘張數
- 📱 **自動縮放** — 適應任意視窗大小

---

## 快速開始

### 線上遊玩

直接開啟：**[https://lancelotwang114.github.io/mahjong/](https://lancelotwang114.github.io/mahjong/)**

### 本地執行

```bash
git clone https://github.com/lancelotwang114/mahjong.git
cd mahjong
python3 -m http.server 8080
# 瀏覽器開啟 http://localhost:8080/
```

---

## 遊戲模式

### 🎮 單機對戰（AI）
進入大廳後點「單機對戰」，設定籌碼後選擇東風局（4 局）或南風局（8 局）開始。

### 🌐 連線對戰
點「連線對戰」→「建立房間」，複製房間代碼傳給朋友，4 人到齊後開始。
加入方點「加入房間」輸入代碼即可連線（使用 PeerJS P2P，無需伺服器）。

---

## 操作說明

| 動作 | 操作 |
|------|------|
| 打牌 | 點擊手牌中的牌 |
| 碰／吃／槓 | 輪到時自動出現按鈕，點擊選擇 |
| 胡牌 | 摸牌自摸或別家出牌時，出現「胡！」按鈕 |
| 跳過 | 點「不要」或按 Space 跳過碰吃機會 |
| 排序手牌 | 按 S 鍵 |

---

## 專案結構

```
mahjong/
├── index.html          # 主遊戲入口（HTML+CSS+JS 單一檔案，v1.6.0）
├── mahjong-solo.html   # 同 index.html（備用連結）
├── tiles-sprite.css    # 牌圖 Sprite 樣式
├── images/             # 牌圖資源（萬/筒/條/字/花）
├── CHANGELOG.md        # 版本更新紀錄
├── CLAUDE.md           # AI 開發指引
└── README.md           # 本文件
```

---

## 技術細節

- **純前端**：單一 `.html` 檔，零後端依賴
- **版面**：1280×720 固定設計尺寸，JS `transform: scale()` 自動適配視窗
- **連線**：PeerJS（WebRTC P2P），使用 peerjs.92k.de 中繼
- **音效**：Web Audio API 合成音 + BGM
- **語音**：Web Speech API（需瀏覽器支援）
- **AI**：貪婪策略 + 防守機率計算

---

## 瀏覽器支援

| 瀏覽器 | 支援 |
|--------|------|
| Chrome / Edge | ✅ 完整支援（建議） |
| Firefox | ✅ 支援（語音效果依系統而異） |
| Safari | ⚠️ 語音需使用者互動後才可啟動 |

---

## License

MIT License — 自由使用、修改、分發。
