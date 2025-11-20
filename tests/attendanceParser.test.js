const assert = require('assert');
const parser = require('../extension/attendanceParser');

function run(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    throw err;
  }
}

run('extracts date and keyword reason', () => {
  const issue = parser.parseRow('2024/01/02 遲到 09:05', ['2024/01/02', '遲到 09:05']);
  assert.strictEqual(issue, '2024/01/02 遲到 09:05');
});

run('truncates long reasons and normalizes ROC date', () => {
  const reason = '早退 因交通塞車導致延遲回報';
  const issue = parser.parseRow('112-03-05 ' + reason, ['112-03-05', reason]);
  assert.ok(issue.startsWith('2023/03/05')); // ROC 112 => 2023
  const parts = issue.split(' ');
  assert.ok(parts[1].length <= 29); // truncated reason length (25 chars + '...')
});

run('ignores rows without keywords', () => {
  const issue = parser.parseRow('2024/01/02 正常勤務', ['2024/01/02', '正常勤務']);
  assert.strictEqual(issue, null);
});

run('ignores rows without date', () => {
  const issue = parser.parseRow('遲到 未刷卡', ['遲到 未刷卡']);
  assert.strictEqual(issue, null);
});
