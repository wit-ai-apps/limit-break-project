import { sanitizeFileName } from "./evidence-upload.js";

const LEGACY_RECORDS_KEY = "limitBreakProjectRecordsV110";

async function withRetry(operation, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }
  throw lastError;
}

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

export function mergeAuthoritativeEvidenceRecords(localRecords = [], remoteRecords = []) {
  const localPending = localRecords.filter((record) =>
    record.firebaseSyncStatus === "error" || record.firebaseSyncStatus === "syncing"
  );
  const merged = new Map(localPending.map((record) => [recordIdentity(record), record]));
  remoteRecords.forEach((record) => {
    merged.set(recordIdentity(record), {
      ...merged.get(recordIdentity(record)),
      ...record
    });
  });
  return [...merged.values()].sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
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
  const docRef = firebaseBridge.doc(firebaseBridge.db, "students", firebaseBridge.studentId, "evidence_records", recordId);

  try {
    await withRetry(() => firebaseBridge.setDoc(docRef, {
      ...recordForFirestore(remoteRecord),
      student_id: firebaseBridge.studentId,
      visible_to: ["student", "parent", "supporter", "teacher"],
      firebaseSyncStatus: "syncing",
      updated_at: firebaseBridge.serverTimestamp()
    }, { merge: true }));

    if (evidenceFile) {
      const storagePath = `students/${firebaseBridge.studentId}/evidence/${record.date}/${recordId}-${Date.now()}-${sanitizeFileName(evidenceFile.name)}`;
      const imageRef = firebaseBridge.storageRef(firebaseBridge.storage, storagePath);
      await withRetry(() => firebaseBridge.uploadBytes(imageRef, evidenceFile, {
        contentType: evidenceFile.type || "image/jpeg",
        customMetadata: {
          student_id: firebaseBridge.studentId,
          mission_id: record.missionId || "",
          subject: record.subject || "",
          test_type: record.testType || "",
          original_file_name: evidenceFile.name || "",
          submission_group_id: record.submissionGroupId || "",
          page_number: String(record.pageNumber || 1),
          page_count: String(record.pageCount || 1)
        }
      }));
      remoteRecord.evidenceImageUrl = await withRetry(() => firebaseBridge.getDownloadURL(imageRef));
      remoteRecord.evidenceStoragePath = storagePath;
    }

    const uploadResult = {
      evidenceImageUrl: remoteRecord.evidenceImageUrl || "",
      evidenceStoragePath: remoteRecord.evidenceStoragePath || "",
      firebaseSyncStatus: "synced",
      updated_at: firebaseBridge.serverTimestamp()
    };
    await withRetry(() => firebaseBridge.setDoc(docRef, uploadResult, { merge: true }));

    return {
      ...remoteRecord,
      evidenceImageData: "",
      firebaseDocumentId: recordId,
      firebaseSyncStatus: "synced",
      firebaseSyncError: ""
    };
  } catch (error) {
    try {
      await firebaseBridge.setDoc(docRef, {
        firebaseSyncStatus: "error",
        updated_at: firebaseBridge.serverTimestamp()
      }, { merge: true });
    } catch (_) {
      // Keep the local error state below when Firestore is unreachable.
    }
    return {
      ...remoteRecord,
      firebaseSyncStatus: "error",
      firebaseSyncError: String(error?.code || "FIREBASE_SYNC_FAILED")
    };
  }
}
