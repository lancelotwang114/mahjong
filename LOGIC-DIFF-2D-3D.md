## ✅ 更新（2026-05-29）：3D 連線層已移植

3D 的傳輸/控制層已從 2D 完整移植，現在 `index-3d.html`：
- 加入 PeerJS（cdnjs 1.5.2）
- `window.Online`（含 16 種訊息 case 的 _handleMsg + _processAction 房主仲裁 + broadcastState + _rotateState + 大廳建立/加入流程）由 stub 換成 2D 完整實作
- `window.MahjongNetwork`（PeerJS 包裝）由 stub 換成 2D 完整實作
- 結算「下一局」按鈕補上 `id="wov-next-btn"` 並接 `nextRoundFromOverlay`（單機行為不變）

3D Game 本來就 online-aware（newRound/_proceedNewRound/_readyPlayers/_peers… 與 2D 相同），所以只需補傳輸層。已通過 `node --check`，16 種訊息 case 與 2D 逐一對齊。**待 push 後做 live 雙人實測。**

---

# 2D ↔ 3D 遊戲邏輯比對報告

> 比對對象：`index.html`(2D) vs `index-3d.html`(3D)
> 方法：brace-matching 抽出函式 → 去註解、壓空白後正規化比對
> 日期：2026-05-29

## 結論一句話

**所有遊戲規則、計分、AI、單機流程、計時器、鳴牌併發鎖邏輯，兩版「逐字相同」。唯一實質分歧在「連線/P2P 層」——3D 的連線對戰其實沒接上。**

---

## 逐函式比對表

### 純規則 / 計分輔助 — 全部相同 ✅

| 函式 | 結果 |
|------|------|
| canWin / canForm / is7p / isShiSanYaoHand | ✅ 相同 |
| meldOpts / tenpaiTiles / discRemaining / sortH | ✅ 相同 |
| calcBlockScore / calcShanten / calcShantenStd | ✅ 相同 |
| selfKongPreservesTenpai | ✅ 相同 |

### 遊戲流程 / 計時 / 鳴牌 — 幾乎全相同 ✅

| 函式 | 結果 |
|------|------|
| doTurn (159行) / doDiscard / checkReactions / doMeld | ✅ 相同 |
| **doWin (222行，含全部台型計分)** | ✅ 相同 |
| nextTurn / doSelfKong / checkTenpai | ✅ 相同 |
| startTimer / stopTimer / clearBtns | ✅ 相同 |
| _setupNonHostTurn | ✅ 相同 |
| _offerNonHostMeld / _startMeldLock / _submitMeldResponse / _resolveMeldLock | ✅ 相同 |
| **offerMeld** | ⚠️ 差異（**純 UI**，見下） |

### AI — 全部相同 ✅

| 函式 | 結果 |
|------|------|
| AI.meld / AI.discard / AI.selfKong | ✅ 相同 |

### 連線 / P2P — 實質分歧 ❗

| 項目 | 2D | 3D |
|------|----|----|
| `_processAction`(房主處理收到的動作) | ✅ 有完整定義 | ❗ **完全沒有** |
| `case 'meld_offer'` / `'action'` / `'game_state'` 訊息分發 | ✅ 各 1 處 | ❗ **各 0 處** |
| `broadcastState()`(房主廣播狀態) | ✅ 完整實作(9行) | ❗ **空殼 `broadcastState(){}`** |
| `_rotateState`(座位旋轉) | ✅ 有 | ✅ 有（相同） |
| `_offerNonHostMeld` / `_startMeldLock` 等 | ✅ 有 | ✅ 有（相同，但下游缺 `_processAction` 無法運作） |

---

## 兩處差異的說明

### 1. offerMeld — 只是 UI 差異，不是邏輯差異

3D 在 v1.7.13 刻意**移除了「碰 / 吃 / 明槓」三顆按鈕**（改成只能點手牌候選或 popup 字卡確認）。被移除的只有那三段 `createElement('button')`；**胡按鈕、跳過按鈕、候選牌高亮、鳴牌倒數邏輯兩版仍相同**。屬於你說的「UI 不動」範圍，無需同步。

### 2. 連線層 — 3D 的線上對戰沒接上（重點）

3D 保留了大廳的「連線對戰（開房間）」按鈕與 21 處 `MahjongNetwork` 參照，也保留了 `_offerNonHostMeld / _startMeldLock` 等下游函式，**但缺了最關鍵的三塊**：

- 沒有 `_processAction` → 房主收到客戶端的出牌/鳴牌/胡牌封包後**沒有任何處理**。
- 沒有 `case 'meld_offer' / 'action' / 'game_state'` 的訊息分發 switch。
- `broadcastState()` 是**空函式** → 房主**永遠不會把牌局狀態廣播給其他人**。

也就是說：**3D 目前實際上只能單機玩，連線是半成品。** 若要讓 3D 連線可用，需要把 2D 的連線層移植過去（`_processAction` + 訊息分發 switch + 真正的 `broadcastState`；`_rotateState` 已存在）。

---

## 給你的同步建議

1. **規則 / 計分 / AI / 單機流程**：兩版已完全同步。日後若改其中一個共用函式（例如新增台型、修 AI），**同一份改動原封不動套到另一版即可**（它們逐字相同）。
2. **連線層**：這是唯一需要決策的地方——
   - 若 3D 只打算當單機 3D 版 → 可考慮把大廳「連線對戰」按鈕隱藏，避免使用者點了沒反應。
   - 若要 3D 也能連線 → 需移植 2D 的 `_processAction` + 訊息分發 + `broadcastState`（這是一項獨立任務，要動較多碼）。
3. 先前修的胡牌榮和 bug 雖然在 3D 也改了，但因 3D 連線層未接上，該 bug 在 3D 其實還不會觸發；改了是為了之後接上連線時就是對的，且單機無副作用。
