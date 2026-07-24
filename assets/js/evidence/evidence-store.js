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

function uploadWithTimeout(imageRef, evidenceFile, metadata, firebaseBridge, log, timeoutMs = 45000) {
  if (!firebaseBridge.uploadBytesResumable) {
    return firebaseBridge.uploadBytes(imageRef, evidenceFile, metadata);
  }
  return new Promise((resolve, reject) => {
    const task = firebaseBridge.uploadBytesResumable(imageRef, evidenceFile, metadata);
    let lastProgressBucket = -1;
    const timer = setTimeout(() => {
      task.cancel();
      reject(Object.assign(new Error("UPLOAD_TIMEOUT"), { code: "storage/retry-limit-exceeded" }));
    }, timeoutMs);
    task.on("state_changed",
      (snapshot) => {
        const progress = snapshot.totalBytes
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        const bucket = Math.floor(progress / 10);
        if (bucket !== lastProgressBucket) {
          lastProgressBucket = bucket;
          log("evidence.storage.progress", { progress });
        }
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
      () => {
        clearTimeout(timer);
        resolve(task.snapshot);
      }
    );
  });
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
  const log = (event, details = {}) => firebaseBridge.diagnosticLog?.(event, details);
  const recordId = firebaseSafeId(recordIdentity(record));
  let remoteRecord = { ...record };
  const docRef = firebaseBridge.doc(firebaseBridge.db, "students", firebaseBridge.studentId, "evidence_records", recordId);

  try {
    log("evidence.firestore.start", { recordId, fileName: evidenceFile?.name || "" });
    await withRetry(() => firebaseBridge.setDoc(docRef, {
      ...recordForFirestore(remoteRecord),
      student_id: firebaseBridge.studentId,
      visible_to: ["student", "parent", "supporter", "teacher"],
      firebaseSyncStatus: "syncing",
      updated_at: firebaseBridge.serverTimestamp()
    }, { merge: true }));
    log("evidence.firestore.ready", { recordId });

    if (evidenceFile) {
      const storagePath = `students/${firebaseBridge.studentId}/evidence/${record.date}/${recordId}-${Date.now()}-${sanitizeFileName(evidenceFile.name)}`;
      const imageRef = firebaseBridge.storageRef(firebaseBridge.storage, storagePath);
      log("evidence.storage.start", {
        recordId,
        fileName: evidenceFile.name,
        fileType: evidenceFile.type,
        fileSize: evidenceFile.size
      });
      await withRetry(() => uploadWithTimeout(imageRef, evidenceFile, {
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
      }, firebaseBridge, log), 2);
      log("evidence.storage.complete", { recordId, storagePath });
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
    log("evidence.sync.complete", { recordId });

    return {
      ...remoteRecord,
      evidenceImageData: "",
      firebaseDocumentId: recordId,
      firebaseSyncStatus: "synced",
      firebaseSyncError: ""
    };
  } catch (error) {
    log("evidence.sync.error", {
      recordId,
      code: String(error?.code || "FIREBASE_SYNC_FAILED"),
      message: String(error?.message || "Firebase sync failed").slice(0, 240)
    });
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
