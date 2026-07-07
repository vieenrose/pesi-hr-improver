# 百一電子 表單流程 UX 增強（PESI HR UX Enhancer）

替百一電子（日城資訊）舊版 HR 系統 `https://hr.pesi.com.tw` 與 EIP `https://eip.pesi.com.tw`
加上現代化、適合手機操作的介面。**完全在瀏覽器端運作、不需要伺服器權限**，停用後每張表單都會
原封不動地還原。同一套程式碼同時提供 **Tampermonkey 使用者腳本** 與 **Chrome／Firefox 擴充功能** 兩種形式。

> 目前版本：**v0.13.0**
>
> 📖 完整操作說明請見 **[使用手冊（docs/USER_GUIDE.zh-TW.md）](docs/USER_GUIDE.zh-TW.md)**，
> 或開啟含畫面示意的 **[圖文版手冊（docs/user-guide.html）](docs/user-guide.html)**（可直接以瀏覽器開啟）。

---

## 功能總覽

### 表單體驗優化（hr.pesi.com.tw）

| 表單 | 代號 | 增強內容 |
|------|------|----------|
| 請假申請 | SW0009 | 乾淨的操作介面：假別下拉重新排序、原生日期／時間選擇器、半天快捷、**即時顯示剩餘假別餘額**、常用事由記憶標籤 |
| 加班申請 | SW0005 | 加班時數欄位加上原生日期／時間選擇器 |
| 公出／出差申請 | SW0212 | 乾淨介面（公出／出差下拉 + 原生選擇器 + 時段快捷 + 事由記憶） |
| 補卡申請／忘打卡 | SW0013 | 乾淨介面（打卡類型 + 原生日期／時間 + 事由） |
| 不加班說明申請 | SW0405 | 預設合理日期範圍 + 原生選擇器 + 自動載入需說明的日期 |
| 請假申請單查詢 | SW0037 | 查詢範圍預設放寬為近 6 個月並自動查詢 |

### 考勤異常批次處理儀表板

- 一鍵檢視考勤異常清單，快速帶入對應的補件表單。
- 可選的**背景桌面通知**，提醒尚未處理的異常（需要 `notifications`／`alarms`／`storage` 權限）。

### 工具列快捷選單（點擊擴充功能圖示）

- **出缺勤系統** — 直接開啟 HR 首頁。
- **預約管理** — 直接進入 EIP 預約模組（會議室／公務車／來賓車位）。
- **請假 / 公出出差 / 忘記打卡** — 一鍵開啟對應申請表單。
- **查詢今日刷卡** — 顯示今天的刷卡紀錄（上班第一筆 → 下班最後一筆，含所有進出時間）。

### EIP 預約表單優化（eip.pesi.com.tw）

- 會議室預約表單加上日期／時間伴隨選擇器與常用事由記憶標籤。

### Google 日曆整合

- 送出 請假／公出／出差 申請時，可選擇同時建立一筆對應的 Google 日曆事件。

### 登入輔助

- 自動帶入帳號與公司代號 —— **絕不儲存或帶入密碼**（密碼一律交由瀏覽器自己的密碼管理員處理）。

---

## 安裝指南

擴充功能（推薦，功能最完整）與使用者腳本擇一即可。

### 方式 A：Chrome／Edge 擴充功能

1. 下載 [最新 Release](https://github.com/vieenrose/pesi-hr-improver/releases/latest) 中的
   `pesi-hr-chrome-<version>.zip` 並解壓縮；或直接使用原始碼中的 `extension/dist/chrome/` 資料夾。
2. 開啟 `chrome://extensions`。
3. 開啟右上角的 **開發人員模式**。
4. 點 **載入未封裝項目**，選擇解壓後的資料夾（含 `manifest.json` 的那一層）。
5. 首次安裝會出現一次性的「存取 hr.pesi.com.tw／eip.pesi.com.tw 資料」與通知權限提示，允許即可。
6. 開啟任一 PESI 表單，優化後的介面即會出現。

### 方式 B：Firefox 擴充功能

1. 下載 Release 中的 `pesi-hr-firefox-<version>.zip` 並解壓縮。
2. 開啟 `about:debugging#/runtime/this-firefox`。
3. 點 **載入暫時附加元件…**，選擇解壓後的 `manifest.json`。
4. （暫時附加元件會在 Firefox 重新啟動後移除。）

### 方式 C：Tampermonkey 使用者腳本

1. 於瀏覽器安裝 [Tampermonkey](https://www.tampermonkey.net/)。
2. 安裝 [`pesi-leave-enhancer.user.js`](pesi-leave-enhancer.user.js)（點進檔案 → Raw，Tampermonkey 會自動偵測）。
3. 開啟任一 PESI 表單即生效。

> 使用者腳本涵蓋表單優化與 EIP 預約優化；工具列快捷選單、考勤異常儀表板與背景通知為擴充功能專屬。

---

## 開發者：單一程式碼來源

所有邏輯只寫在一個地方，兩種產物由 `sync.sh` 自動產生並保證兩者主體位元完全相同。

```
src/enhancer.js            ← 唯一的原始碼，只改這裡
src/header.userscript.txt  ← Tampermonkey banner（@version 會被套版）
src/header.content.txt     ← 擴充功能 content-script 標頭
sync.sh                    ← 由 src/ 重新產生兩種產物（改完必跑）

pesi-leave-enhancer.user.js   ← 產生的使用者腳本（請勿手改）
extension/content.js          ← 產生的 content script（請勿手改）
extension/manifest.json       ← MV3 manifest + 唯一的版本號
extension/build.sh            ← 打包 Chrome／Firefox 的 dist/ zip
extension/README.md           ← 擴充功能技術說明
```

### 開發流程

1. 編輯 `src/enhancer.js`（必要時一併改標頭／manifest）。
2. 在 `extension/manifest.json` 更新版本號（版本號只存在這一處）。
3. 執行 **`./sync.sh`** —— 重新產生兩份檔案、套上版本號、對兩者跑 `node --check`，並斷言共用主體位元相同（一旦分歧會明確報錯）。
4. 執行 **`cd extension && ./build.sh`** —— 重新打包兩種瀏覽器的 `dist/` zip。

請勿直接編輯上述兩份產生檔 —— `sync.sh` 會覆蓋它們。位元相同的守門機制確保使用者腳本與擴充功能不會悄悄分歧。

擴充功能的技術細節與已知限制請見 [`extension/README.md`](extension/README.md)。
