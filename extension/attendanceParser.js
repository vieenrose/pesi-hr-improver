// Shared attendance parsing helper for content script and popup injections.
// Exposes PesiAttendanceParser on window; also exports for Node tests.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PesiAttendanceParser = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const KEYWORDS = ["遲到", "早退", "曠職", "未刷卡", "異常", "缺勤", "加班"];
  const DATE_REGEXES = [
    /\d{3,4}\s*[\/\-\.]\s*\d{2}\s*[\/\-\.]\s*\d{2}/, // 2024/01/02 or 112-01-02
    /\d{2}\s*[\/\-\.]\s*\d{2}/, // 01/02
  ];

  function normalizeWhitespace(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function normalizeDate(dateStr) {
    if (!dateStr) return null;
    const cleaned = dateStr.replace(/\s/g, "");
    const parts = cleaned.split(/[\/\.\-]/).filter(Boolean);
    if (parts.length === 2) {
      const [m, d] = parts;
      const year = new Date().getFullYear();
      return `${year}/${m.padStart(2, "0")}/${d.padStart(2, "0")}`;
    }
    if (parts.length === 3) {
      let [y, m, d] = parts;
      if (y.length === 3) {
        // ROC year to AD (approx)
        const adYear = 1911 + parseInt(y, 10);
        y = `${adYear}`;
      }
      return `${y}/${m.padStart(2, "0")}/${d.padStart(2, "0")}`;
    }
    return cleaned;
  }

  function findDate(text) {
    if (!text) return null;
    const match = DATE_REGEXES.map((rx) => text.match(rx)).find(Boolean);
    return match ? normalizeDate(match[0]) : null;
  }

  function findReason(cellsText) {
    for (const cellText of cellsText) {
      if (KEYWORDS.some((kw) => cellText.includes(kw))) {
        return cellText;
      }
    }
    return null;
  }

  function parseRow(text, cellsText) {
    const normalizedRow = normalizeWhitespace(text);
    if (!normalizedRow) return null;
    const hasKeyword = KEYWORDS.some((kw) => normalizedRow.includes(kw));
    if (!hasKeyword) return null;

    const date = findDate(normalizedRow);
    if (!date) return null;

    const normalizedCells = (cellsText || []).map(normalizeWhitespace);
    let reason = findReason(normalizedCells);
    if (!reason) {
      const match = normalizedRow.match(new RegExp(`(${KEYWORDS.join("|")})`));
      reason = match ? match[0] : "";
    }
    reason = normalizeWhitespace(reason);
    if (!reason) return null;
    if (reason.length > 25) reason = `${reason.slice(0, 25)}...`;

    return `${date} ${reason}`;
  }

  function parseIssuesFromDom(rootDoc) {
    const rows = Array.from((rootDoc || document).querySelectorAll("tr"));
    const issues = [];
    rows.forEach((row) => {
      const rowText = row.innerText || row.textContent || "";
      const cellsText = Array.from(row.querySelectorAll("td")).map(
        (td) => td.innerText || td.textContent || ""
      );
      const issue = parseRow(rowText, cellsText);
      if (issue) issues.push(issue);
    });
    return Array.from(new Set(issues)); // dedupe
  }

  return {
    parseRow,
    parseIssuesFromDom,
  };
});
