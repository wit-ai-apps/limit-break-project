import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeAuthoritativeEvidenceRecords,
  recordIdentity,
  saveEvidenceRecordRemote
} from "../assets/js/evidence/evidence-store.js";

test("ログイン中はFirebase記録を正本にして別端末の古い画像を混ぜない", () => {
  const records = mergeAuthoritativeEvidenceRecords(
    [
      { date: "2026-07-03", missionId: "M1", evidenceImageName: "端末だけの古い画像.png" },
      { date: "2026-07-24", missionId: "M2", evidenceImageName: "再送待ち.png", firebaseSyncStatus: "error" }
    ],
    [
      { date: "2026-07-24", missionId: "M1", evidenceImageName: "Firebaseの画像.png", firebaseSyncStatus: "synced" }
    ]
  );
  assert.deepEqual(records.map((record) => record.evidenceImageName), ["再送待ち.png", "Firebaseの画像.png"]);
});

test("同じ提出の複数ページを固有missionIdで保持する", () => {
  const pages = [
    {
      date: "2026-07-24",
      missionId: "random_batch_p1",
      submissionGroupId: "random_batch",
      pageNumber: 1,
      pageCount: 2,
      evidenceImageName: "page-1.jpg"
    },
    {
      date: "2026-07-24",
      missionId: "random_batch_p2",
      submissionGroupId: "random_batch",
      pageNumber: 2,
      pageCount: 2,
      evidenceImageName: "page-2.jpg"
    }
  ];
  const merged = mergeAuthoritativeEvidenceRecords([], pages);
  assert.equal(merged.length, 2);
  assert.deepEqual(new Set(merged.map(recordIdentity)).size, 2);
  assert.deepEqual(merged.map((record) => record.submissionGroupId), ["random_batch", "random_batch"]);
});

test("creates the queued record before upload and never overwrites AI fields afterward", async () => {
  const calls = [];
  const bridge = {
    enabled: true,
    currentUser: { uid: "test-user" },
    studentId: "STU_TEST",
    db: {},
    storage: {},
    doc: (...parts) => parts.join("/"),
    setDoc: async (_ref, data) => calls.push(["setDoc", data]),
    serverTimestamp: () => "SERVER_TIME",
    storageRef: (_storage, storagePath) => storagePath,
    uploadBytes: async () => calls.push(["uploadBytes"]),
    getDownloadURL: async () => "https://example.invalid/image.png"
  };
  const record = {
    date: "2026-07-23",
    missionId: "random_test",
    subject: "AI解析待ち",
    course: "AI解析待ち",
    aiAnalysisStatus: "queued",
    evidenceImageData: "data:image/png;base64,not-saved"
  };
  const file = { name: "test.png", type: "image/png" };

  const result = await saveEvidenceRecordRemote(record, file, bridge);

  assert.equal(calls[0][0], "setDoc");
  assert.equal(calls[0][1].aiAnalysisStatus, "queued");
  assert.equal(calls[1][0], "uploadBytes");
  assert.equal(calls[2][0], "setDoc");
  assert.equal("aiAnalysisStatus" in calls[2][1], false);
  assert.equal("subject" in calls[2][1], false);
  assert.equal("course" in calls[2][1], false);
  assert.equal(result.firebaseSyncStatus, "synced");
  assert.equal(result.evidenceImageData, "");
});
