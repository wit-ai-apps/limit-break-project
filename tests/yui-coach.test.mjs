import test from "node:test";
import assert from "node:assert/strict";
import { buildYuiBriefing, dailyDialogueKey } from "../assets/js/coach/yui-coach.js";

test("学習記録がない生徒には今日使える時間を質問する", () => {
  const briefing = buildYuiBriefing({ name: "テスト", submitted: 0 }, "student");
  assert.match(briefing.question, /何分/);
  assert.equal(briefing.choices.length, 3);
});

test("低正答率の生徒には弱点復習を提案する", () => {
  const briefing = buildYuiBriefing({
    submitted: 1,
    averageScore: 55,
    weakness: "関係詞の語順",
    dueMemory: 2
  }, "student");
  assert.match(briefing.message, /関係詞の語順/);
  assert.equal(briefing.choices.some((choice) => choice.view === "memory"), true);
});

test("保護者には結果より適切な声かけを案内する", () => {
  const briefing = buildYuiBriefing({ submitted: 2, averageScore: 75 }, "parent");
  assert.match(briefing.detail, /ほめる/);
  assert.equal(briefing.question, "");
});

test("提出画像ボタンは実際の画像がある役割だけに出す", () => {
  const withoutImage = buildYuiBriefing({ submitted: 0, hasEvidence: false }, "parent");
  const withImage = buildYuiBriefing({ submitted: 1, hasEvidence: true }, "teacher");
  assert.equal(withoutImage.actions.length, 0);
  assert.equal(withImage.actions.some((action) => action.view === "evidence"), true);
});

test("ユイ先生の1日は日本時間の午前8時55分に切り替わる", () => {
  assert.match(dailyDialogueKey(new Date("2026-07-28T23:54:59.000Z")), /:2026-07-28$/);
  assert.match(dailyDialogueKey(new Date("2026-07-28T23:55:00.000Z")), /:2026-07-29$/);
});
