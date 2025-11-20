# Pesi HR UI/UX Improver (Pesi HR 系統優化小幫手)

這是一個專為 **百一電子 (Pesi Electronics)** 員工設計的 Chrome 擴充功能，旨在優化 HR 系統的操作體驗，讓請假與公出申請變得更快速、更直覺。

![Logo](extension/icons/icon128.png)

## ✨ 主要功能 (Features)

### 1. 一鍵快速填寫 (One-Click Filling)
*   **快速日期按鈕**：提供「今天」、「明天」按鈕，一鍵帶入日期。
*   **日期同步**：獨家「同開始日」按鈕，自動將結束日期設為與開始日期相同。
*   **常用時間預設**：內建 08:00、09:00、10:00、13:00、18:00 等常用上下班時間。

### 2. 智慧輸入標籤 (Smart Input Chips)
*   自動記憶您常用的輸入內容（如「事由」或「假別」）。
*   下次填寫時，只需點擊標籤即可完成輸入，無需重複打字。

### 3. 即時時數計算 (Real-time Duration Calculator)
*   當您調整日期或時間時，系統會自動計算並顯示總時數（例如：*「預計時數：1 天 4.5 小時」*）。

### 4. 申請狀態色彩標示 (Visual History Enhancements)
*   自動為歷史紀錄表格加上顏色標記：
    *   🟢 **綠色**：已核准 (Approved)
    *   🟡 **橘色**：簽核中 (Signing/Pending)
    *   🔴 **紅色**：退回/駁回 (Rejected/Return)

---

## 🚀 安裝指南 (Installation Guide)

### 方法一：從 Chrome 線上應用程式商店安裝 (推薦)
*(待上架後提供連結)*

### 方法二：手動安裝 (開發者模式)

如果您下載了原始碼或 ZIP 檔案，請按照以下步驟安裝：

1.  **下載並解壓縮**：
    *   下載本專案的 ZIP 檔案並解壓縮到您的電腦上。

2.  **開啟擴充功能管理頁面**：
    *   在 Chrome 瀏覽器網址列輸入 `chrome://extensions/` 並按下 Enter。

3.  **開啟開發者模式**：
    *   在頁面右上角，開啟 **「開發者模式」 (Developer mode)** 開關。

4.  **載入未封裝項目**：
    *   點擊左上角的 **「載入未封裝項目」 (Load unpacked)** 按鈕。
    *   選擇您剛剛解壓縮的 `extension` 資料夾。

5.  **完成！**
    *   現在您登入 Pesi HR 系統時，擴充功能就會自動運作。

---

## 🛠️ 開發與貢獻 (Development)

本專案使用純 JavaScript (Vanilla JS) 開發，無需編譯。

*   **核心邏輯**：`content.js`
*   **樣式表**：`styles.css`
*   **設定檔**：`manifest.json`

---

## 隱私權聲明 (Privacy Policy)
本擴充功能僅將您的輸入歷史（如常用的請假事由）儲存在您個人的瀏覽器中 (`localStorage`)，不會將任何資料傳送到外部伺服器。

---

### A. Leave Status Banner
Provides a real-time summary of the employee's Annual Leave (特休):
*   **Previous Year Remainder**: Days carried over.
*   **Current Year New**: Newly accrued days.
*   **Validity Period**: The effective date range for the current quota (e.g., `114/01/01~114/12/31`).
*   **Calculation**: `(Previous + New) - Used = Remaining`.

### B. Quick Actions
Shortcut links to frequently used functions, bypassing the menu tree:
*   Overtime Apply/Query
*   Leave Apply/Query
*   Missed Clock-in Apply
*   Payslip View

### C. Anomaly Resolution (考勤異常通知)
An intelligent workflow feature that automatically flags discrepancies between **Clock Data** (actual punches) and **Approved Forms**.

*   **Detection**: Identifies issues such as:
    *   `加班單時數小於卡鐘時數`: Worked hours exceed approved overtime.
    *   `缺勤時數大於請假單`: Absence duration exceeds approved leave.
    *   `有缺勤時數無請假單時數`: Absence detected with no corresponding leave request.
*   **Resolution Workflow**:
    *   Displays a table of issues by Date and Employee.
    *   **Actionable Links**: Each issue contains a "Filter Condition" link.
    *   **Smart Pre-filling**: Clicking the link triggers `setSelectedFormCloseNav`, opening the specific form required to fix the issue and pre-filling it with the exact **Date**, **Time**, and **Employee ID**.

## Technical Details
*   **Navigation Logic**: Relies heavily on inline JavaScript functions like `setMenuUL_Visible('ID')` to toggle menu visibility.
*   **Data Formats**:
    *   **Dates**: Passed as Excel serial date numbers (e.g., `45978` for Nov 2025).
    *   **Time**: Passed as fractional days (e.g., `0.33333` for 08:00 AM) for precise calculations.
*   **Form Integration**: The anomaly resolution links pass complex objects directly to the form opening function to ensure context is preserved.

## Chrome Extension: Pesi HR UI/UX Improver

A Chrome Extension project has been started to improve the UI/UX of the Leave and Business Trip application forms.

### Installation
1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the `extension` folder in this project (`/home/luigi/dayoff/extension`).

### Features (Milestone 1)
*   **Target Pages**: Leave Application (`SW0029`) and Business Trip Application (`SW0210`).
*   **Enhancements**:
    *   Injects modern CSS variables and styling.
    *   Detects when the target forms are loaded.
    *   Applies a cleaner, card-based layout to forms.
