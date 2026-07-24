import test from "node:test";
import assert from "node:assert/strict";
import {
  canApprove,
  canInvite,
  canRevokeInvite,
  inviteClaimState,
  inviteHash,
  normalizedEmail
} from "./invite-policy.js";

test("招待トークンは保存用ハッシュへ変換され、元の値を保存しない", () => {
  const token = "one-time-secret-token";
  const hash = inviteHash(token);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.equal(inviteHash(token), hash);
});

test("発行中かつ期限内の招待だけを一度使用できる", () => {
  const future = { status: "issued", expires_at: 2000 };
  assert.equal(inviteClaimState(future, 1000), "claimable");
  assert.equal(inviteClaimState({ ...future, status: "pending_approval" }, 1000), "already_used");
  assert.equal(inviteClaimState({ ...future, expires_at: 999 }, 1000), "expired");
});

test("連携中の保護者または統括教師だけが招待・承認できる", () => {
  const parent = { role: "parent", linked_student_ids: ["STU_1"] };
  assert.equal(canInvite(parent, "STU_1"), true);
  assert.equal(canApprove(parent, "STU_2"), false);
  assert.equal(canInvite({ role: "lead_teacher" }, "STU_2"), true);
  assert.equal(canInvite({ role: "supporter", linked_student_ids: ["STU_1"] }, "STU_1"), false);
});

test("発行者または承認権限者だけが未完了招待を取り消せる", () => {
  const invite = { status: "issued", invited_by_uid: "parent-1", student_id: "STU_1" };
  assert.equal(canRevokeInvite(invite, { role: "supporter" }, "parent-1"), true);
  assert.equal(canRevokeInvite(invite, { role: "parent", linked_student_ids: ["STU_1"] }, "parent-2"), true);
  assert.equal(canRevokeInvite({ ...invite, status: "approved" }, { role: "lead_teacher" }, "lead"), false);
});

test("メール照合は大文字・前後空白を正規化する", () => {
  assert.equal(normalizedEmail("  USER@Example.COM "), "user@example.com");
});
