import { sanitizeFileName } from "./evidence-upload.js";

const LEGACY_RECORDS_KEY = "limitBreakProjectRecordsV110";

export function loadEvidenceRecords(storageKey, storage = localStorage) {
  try {
    const currentRecords = storage.getItem(storageKey);
    if (currentRecords) return JSON.parse(currentRecords);
    return JSON.parse(storage.getItem(LEGACY_RECORDS_KEY) || "[]");
  } catch (_) {
    return [];
  }
}

export function saveEvidenceRecords(storageKey, records, storage = localStorage) {
  storage.setItem(storageKey, JSON.stringify(records));
}

export function recordIdentity(record) {
  return `${record.date || ""}_${record.missionId || ""}`;
}

export function firebaseSafeId(value) {
  return String(value || "record")
    .replace(/[\/#?[\]]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 180);
}

export function recordForFirestore(record) {
  const copy = { ...record };
  delete copy.evidenceImageData;
  Object.keys(copy).forEach((key) => {
    if (copy[key] === undefined) delete copy[key];
  });
  return copy;
}

export async function saveEvidenceRecordRemote(record, evidenceFile, firebaseBridge) {
  if (!firebaseBridge?.enabled || !firebaseBridge.currentUser) return record;
  const recordId = firebaseSafeId(recordIdentity(record));
  let remoteRecord = { ...record };

  try {
    if (evidenceFile) {
      const storagePath = `students/${firebaseBridge.studentId}/evidence/${record.date}/${recordId}-${Date.now()}-${sanitizeFileName(evidenceFile.name)}`;
      const imageRef = firebaseBridge.storageRef(firebaseBridge.storage, storagePath);
      await firebaseBridge.uploadBytes(imageRef, evidenceFile, {
        contentType: evidenceFile.type || "image/jpeg",
        customMetadata: {
          student_id: firebaseBridge.studentId,
          mission_id: record.missionId || "",
          subject: record.subject || "",
          test_type: record.testType || ""
        }
      });
      remoteRecord.evidenceImageUrl = await firebaseBridge.getDownloadURL(imageRef);
      remoteRecord.evidenceStoragePath = storagePath;
    }

    const docRef = firebaseBridge.doc(firebaseBridge.db, "students", firebaseBridge.studentId, "evidence_records", recordId);
    const firestoreRecord = {
      ...recordForFirestore(remoteRecord),
      student_id: firebaseBridge.studentId,
      visible_to: ["student", "parent", "supporter", "teacher"],
      firebaseSyncStatus: "synced",
      updated_at: firebaseBridge.serverTimestamp()
    };
    await firebaseBridge.setDoc(docRef, firestoreRecord, { merge: true });

    return {
      ...remoteRecord,
      evidenceImageData: "",
      firebaseDocumentId: recordId,
      firebaseSyncStatus: "synced",
      firebaseSyncError: ""
    };
  } catch (error) {
    return {
      ...remoteRecord,
      firebaseSyncStatus: "error",
      firebaseSyncError: error.message || String(error)
    };
  }
}
