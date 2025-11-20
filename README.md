<div align="center">
  <img src="extension/icons/icon128.png" alt="Logo" width="128" height="128">

  # PESI HR UI/UX Improver
  
  **專為百一電子 (PESI Electronics) 同仁打造的 HR 系統優化工具**
  
  讓請假、公出申請不再繁瑣，一鍵完成！

  [功能介紹](#-核心功能-features) • [安裝教學](#-安裝教學-installation) • [隱私聲明](#-隱私權與安全-privacy)
</div>

<br>

## 📸 實際畫面 (Screenshots)

| 快速登入與異常通知 (Login & Alerts) | 請假申請 (Leave Application) | 公出申請 (Business Trip) |
|:---:|:---:|:---:|
| <img src="extension/screenshots/popup_panel.png" width="250"> | <img src="extension/screenshots/leave_application.png" width="250"> | <img src="extension/screenshots/business_trip_application.png" width="250"> |

---

## ✨ 核心功能 (Features)

### 🔑 1. 一鍵登入，秒速開工 (New!)
*   **自動記憶**：在擴充功能選單中設定好帳號密碼 (僅儲存於本地)。
*   **一鍵直達**：按一下 **「一鍵登入」**，系統自動開啟網頁、填寫帳密並登入，省去每天重複輸入的麻煩。

### 🚀 2. 智慧填寫，告別手動
*   **快速日期**：提供「今天」、「明天」按鈕，一鍵帶入日期。
*   **常用時間**：內建 `08:00`、`09:00`、`13:00`、`18:00` 等按鈕，快速設定上下班時間。
*   **日期同步**：點選「同開始日」，結束日期自動同步，避免手殘選錯月份。

### 📝 3. 越用越聰明的「智慧標籤」
*   **自動學習**：系統會自動記住您常輸入的 **「事由」** (如：看診、私事處理)。
*   **一鍵帶入**：下次填寫時，這些內容會變成 **「可點擊的標籤」**，按一下就填好，不用再打字！

### ⏱️ 4. 即時時數計算
*   **即時預覽**：調整日期或時間時，畫面即時顯示 **「預計時數」** (例如：*1 天 4.5 小時*)。
*   **防呆機制**：送出前就能確認時數是否正確，減少被 HR 退件的機率。

### 🎨 5. 視覺化進度追蹤
*   歷史紀錄表格自動加上顏色標記，一眼就能看出簽核狀態：
    *   🟢 **綠色**：已核准 (Approved)
    *   🟡 **橘色**：簽核中 (Signing)
    *   🔴 **紅色**：被退回 (Rejected)

### 🔔 6. 考勤異常通知 (New!)
*   **自動偵測**：開啟擴充功能時，自動掃描當前頁面是否有 **「遲到」、「早退」、「未刷卡」、「缺勤」或「加班」** 等異常紀錄。
*   **即時提醒**：在面板上直接顯示異常筆數與日期，不用在一行行檢查表格，確保考勤無誤。

---

## 📥 安裝教學 (Installation)

1.  **下載檔案**：
    *   點擊本頁面的 `Code` > `Download ZIP` 並解壓縮。
2.  **開啟擴充功能頁面**：
    *   在 Chrome 網址列輸入 `chrome://extensions/` 並按下 Enter。
3.  **開啟開發者模式**：
    *   打開右上角的 **「開發者模式 (Developer mode)」** 開關。
4.  **載入擴充功能**：
    *   點擊左上角的 **「載入未封裝項目 (Load unpacked)」**。
    *   選擇剛剛解壓縮的 `extension` 資料夾。
5.  **開始使用**：
    *   現在登入 HR 系統，您就會看到不一樣的介面囉！建議將擴充功能釘選在瀏覽器右上角以便使用「一鍵登入」。

---

## 🔒 隱私權與安全 (Privacy)

我們非常重視您的隱私與資訊安全：

*   🛡️ **資料不外流**：本程式 **完全離線運作**，不會將您的任何資料傳送到外部伺服器。
*   🔑 **帳號安全**：您的帳號密碼僅儲存在您電腦的 Chrome **本地儲存區 (Local Storage)**，僅用於自動登入功能。
*   💾 **本地紀錄**：您的常用事由僅儲存在您自己的瀏覽器中。
*   📖 **開源透明**：本專案為開源軟體，程式碼完全公開透明，歡迎檢視。

---

## 🛠️ 技術資訊 (For Developers)

*   **Target System**: PESI HR Workflow System (Legacy ASP.NET)
*   **Tech Stack**: Vanilla JavaScript (ES6+), CSS3, Chrome Extension Manifest V3
*   **Core Logic**: DOM Manipulation, MutationObserver
*   **Compatibility**: Google Chrome, Microsoft Edge

