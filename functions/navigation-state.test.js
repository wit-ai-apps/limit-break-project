import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNavigationStepIndex } from "./navigation-state.js";

test("学習位置は0以上の整数だけ保存する", () => {
  assert.equal(normalizeNavigationStepIndex(8), 8);
  assert.equal(normalizeNavigationStepIndex(-1), 0);
  assert.equal(normalizeNavigationStepIndex("abc"), 0);
});

test("異常に大きい学習位置を上限内へ収める", () => {
  assert.equal(normalizeNavigationStepIndex(9999), 500);
});
