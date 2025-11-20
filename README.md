# Pesi Electronics HR Workflow System Documentation

## Overview
The **Pesi Electronics HR Workflow System (表單流程系統)** is a web-based **Employee Self-Service (ESS) Portal** designed for "百一電子股份有限公司". It serves as a centralized platform for employees to manage their attendance, submit leave and overtime applications, and view payroll information.

**URL**: `https://hr.pesi.com.tw/HtmlWorkFlow/Index.html`

## System Architecture
*   **Type**: Single Page Application (SPA) / Frame-based web portal.
*   **Core Functionality**: Role-based access for attendance management and workflow approvals.
*   **User Context**: Persistent display of Employee ID and Name (e.g., `A727 劉禹成`) throughout the session.

## Navigation Structure
The application uses a hierarchical menu system driven by JavaScript (`setMenuUL_Visible`).

### 1. System (系統) `[SW0027]`
Administrative settings for the user account.
*   **Change Password (密碼變更)**: Update login credentials.
*   **Change Login Email (更改登入帳號E-Mail)**: Update contact email address.
*   **Payslip Password (餉條查詢密碼變更)**: Set/Change the secondary password required to view salary details.
*   **Agent Setting (職務代理人設定)**: Designate a temporary approver for periods of absence.

### 2. Attendance Workflow (考勤表單流程) `[SW0053]`
The primary operational module for daily attendance tasks.
*   **Overtime Application (加班申請單作業)** `[SW0028]`
    *   Apply (加班申請)
    *   Query (加班申請單查詢)
*   **Leave Application (請假申請單作業)** `[SW0029]`
    *   Apply (請假申請)
    *   Query (請假申請單查詢)
*   **Business Trip Application (公出/出差申請單作業)** `[SW0210]`
    *   Apply (公出/出差申請)
    *   Query (公出/出差申請單查詢)
*   **No Overtime Explanation (不加班說明申請作業)** `[SW0404]`
    *   Submit justifications for late clock-outs that are not claimed as overtime.
*   **Missed Clock-in Application (補卡申請作業)** `[SW0055]`
    *   Apply (補卡申請)
    *   Query (補卡申請單查詢)

### 3. Reports (報表) `[SX0020]`
Read-only access to historical data and statements.
*   **Payslip (薪資餉條)**: Monthly salary statements.
*   **Leave Balance Details (假別剩餘明細表)**: Detailed breakdown of used and remaining leave quotas.
*   **Annual Leave Settlement (特休結算明細表)**: Year-end calculations for annual leave.

### 4. Logout (登 出)
*   **Action**: `doFlowLogout()` - Securely terminates the user session.

## Dashboard & Workflow Logic
The main dashboard acts as an **Action Center**, divided into three key zones:

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
