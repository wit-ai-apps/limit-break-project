import test from "node:test";
import assert from "node:assert/strict";
import { saveEvidenceRecordRemote } from "../assets/js/evidence/evidence-store.js";

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
