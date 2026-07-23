import {
  APP_VERSION,
  RELEASE_NOTES,
  STORAGE_KEY,
  LOGIN_KEY,
  LOGIN_NAME_KEY,
  LOGIN_EMAIL_KEY,
  AUTH_UID_KEY,
  ROLE_KEY,
  NAV_STEP_KEY,
  SUPPORT_TYPE_KEY,
  MEMORY_RESULT_KEY,
  EXTERNAL_PROGRESS_KEY,
  AI_TEACHER_LOG_KEY,
  COUNSELOR_NOTES_KEY,
  VIEW_KEY,
  NOTICE_CONTACTS_KEY,
  NOTICE_QUEUE_KEY,
  CUSTOM_COUNTDOWNS_KEY,
  STUDY_START_DATE_KEY,
  DEFAULT_STUDY_START_DATE,
  FIREBASE_CONFIG_PATH,
  BASELINE_DATE,
  APP_VIEWS
} from "../../config/app_config.js?v=4.9.0";
import { PUBLIC_ROLE_KEYS, ROLES, SUPPORTER_TYPES } from "./auth/roles.js";
import {
  FALLBACK_EXAMS,
  buildCountdownTargets,
  dateDaysBetween,
  dateDaysUntil,
  todayJapanKey
} from "./utils/countdown.js";
import { escapeHtml } from "./utils/helpers.js";
import {
  loadEvidenceRecords,
  recordIdentity,
  saveEvidenceRecordRemote,
  saveEvidenceRecords
} from "./evidence/evidence-store.js?v=4.8.3";
import { renderAppNavigation } from "./ui/navigation.js";
import {
  closeDevDrawerPanel,
  openDevDrawerPanel,
  renderDevDrawerPanel
} from "./ui/dev-drawer.js";
import {
  closeScheduleDrawerPanel,
  openScheduleDrawerPanel,
  renderCountdownCards,
  renderScheduleDrawerPanel
} from "./ui/schedule-drawer.js";
import { fileToDataUrl } from "./evidence/evidence-upload.js";
import {
  bindEvidencePreviewDialog,
  openEvidencePreviewRecord
} from "./evidence/evidence-preview.js";
import { evidenceTypeForUnit, hasEvidence } from "./evidence/evidence-policy.js";
import { renderEvidenceLogs } from "./evidence/evidence-render.js";
import {
  canDeleteSchedule,
  downloadSchedulesIcs
} from "./schedule/schedule-store.js?v=4.9.0";

import {
  FALLBACK_DAILY,
  FALLBACK_SUMMER,
  FALLBACK_LEVELS,
  FALLBACK_MATERIALS,
  FALLBACK_MATERIALS_OUTLINE,
  FALLBACK_SUBJECT_BALANCE,
  FALLBACK_REVERSE_PROGRESS,
  FALLBACK_REVIEW_SCHEDULE,
  FALLBACK_MEMORY,
  FALLBACK_EXTERNAL,
  FALLBACK_AI_TEACHER,
  FALLBACK_COURSE_PACING,
  FALLBACK_COUNSELOR_NOTES,
  FALLBACK_NOTICE_CONTACTS,
  FALLBACK_COURSE_ROUTE
} from "./data/fallbacks.js";

    let dailyPlan = FALLBACK_DAILY;
    let examSchedule = FALLBACK_EXAMS;
    let summerPlan = FALLBACK_SUMMER;
    let levelTasks = FALLBACK_LEVELS;
    let materialsCatalog = FALLBACK_MATERIALS;
    let materialsOutline = FALLBACK_MATERIALS_OUTLINE;
    let subjectBalance = FALLBACK_SUBJECT_BALANCE;
    let reverseProgress = FALLBACK_REVERSE_PROGRESS;
    let reviewSchedule = FALLBACK_REVIEW_SCHEDULE;
    let memoryData = FALLBACK_MEMORY;
    let externalProgress = loadExternalProgress();
    let aiTeacherConfig = FALLBACK_AI_TEACHER;
    let coursePacing = FALLBACK_COURSE_PACING;
    let courseRoute = FALLBACK_COURSE_ROUTE;
    let counselorNotes = loadCounselorNotes();
    let noticeContacts = loadNoticeContacts();
    let noticeQueue = loadNoticeQueue();
    let customCountdowns = loadCustomCountdowns();
    let studyStartDate = localStorage.getItem(STUDY_START_DATE_KEY) || DEFAULT_STUDY_START_DATE;
    let firebaseBridge = {
      enabled: false,
      status: "not_configured",
      message: "公開検証では、メールアドレスとパスワードで新規登録またはログインできます。",
      studentId: "STU_0001",
      currentUser: null,
      userDoc: null
    };
    let evidenceUnsubscribe = null;
    let scheduleUnsubscribe = null;
    let isLoggedIn = localStorage.getItem(LOGIN_KEY) === "true";
    let loginName = localStorage.getItem(LOGIN_NAME_KEY) || "";
    let currentRole = localStorage.getItem(ROLE_KEY) || "student";
    if (currentRole === "counselor") currentRole = "supporter";
    let currentSupportType = localStorage.getItem(SUPPORT_TYPE_KEY) || "family";
    let activeView = localStorage.getItem(VIEW_KEY) || "home";
    let navigationStepIndex = Number(localStorage.getItem(NAV_STEP_KEY) || 0);
    let records = loadEvidenceRecords(STORAGE_KEY);
    let memoryResults = loadMemoryResults();
    let aiTeacherLog = loadAiTeacherLog();

    const loginForm = document.querySelector("#loginForm");
    const loginNameInput = document.querySelector("#loginName");
    const loginPasscodeInput = document.querySelector("#loginPasscode");
    const loginVersionBadge = document.querySelector("#loginVersionBadge");
    const loginStatus = document.querySelector("#loginStatus");
    const loginRoleOptions = document.querySelector("#loginRoleOptions");
    const loginSupportTypePanel = document.querySelector("#loginSupportTypePanel");
    const accountPanel = document.querySelector("#accountPanel");
    const headerLogoutButton = document.querySelector("#headerLogoutButton");
    const appNav = document.querySelector("#appNav");
    const versionBadge = document.querySelector("#versionBadge");
    const devDrawer = document.querySelector("#devDrawer");
    const devDrawerBackdrop = document.querySelector("#devDrawerBackdrop");
    const devVersionBadge = document.querySelector("#devVersionBadge");
    const devVersionList = document.querySelector("#devVersionList");
    const countdownGrid = document.querySelector("#countdownGrid");
    const scheduleDrawer = document.querySelector("#scheduleDrawer");
    const scheduleDrawerBackdrop = document.querySelector("#scheduleDrawerBackdrop");
    const scheduleDrawerOpen = document.querySelector("#scheduleDrawerOpen");
    const scheduleDrawerClose = document.querySelector("#scheduleDrawerClose");
    const scheduleDrawerCountdowns = document.querySelector("#scheduleDrawerCountdowns");
    const scheduleCalendar = document.querySelector("#scheduleCalendar");
    const scheduleMonthTitle = document.querySelector("#scheduleMonthTitle");
    const scheduleQuickForm = document.querySelector("#scheduleQuickForm");
    const scheduleQuickStatus = document.querySelector("#scheduleQuickStatus");
    const downloadScheduleIcsButton = document.querySelector("#downloadScheduleIcs");
    const missionList = document.querySelector("#missionList");
    const journeyMap = document.querySelector("#journeyMap");
    const routeSummary = document.querySelector("#routeSummary");
    const roleDashboard = document.querySelector("#roleDashboard");
    const roleDashboardBadge = document.querySelector("#roleDashboardBadge");
    const longPlanList = document.querySelector("#longPlanList");
    const weekPlanList = document.querySelector("#weekPlanList");
    const reviewList = document.querySelector("#reviewList");
    const subjectBars = document.querySelector("#subjectBars");
    const permissionList = document.querySelector("#permissionList");
    const notificationPanel = document.querySelector("#notificationPanel");
    const logList = document.querySelector("#logList");
    const examList = document.querySelector("#examList");
    const levelList = document.querySelector("#levelList");
    const summerWeekList = document.querySelector("#summerWeekList");
    const materialList = document.querySelector("#materialList");
    const settingsList = document.querySelector("#settingsList");
    const paceList = document.querySelector("#paceList");
    const studyLoadGrid = document.querySelector("#studyLoadGrid");
    const memorySummary = document.querySelector("#memorySummary");
    const memoryList = document.querySelector("#memoryList");
    const retentionList = document.querySelector("#retentionList");
    const externalList = document.querySelector("#externalList");
    const teacherChat = document.querySelector("#teacherChat");
    const counselorList = document.querySelector("#counselorList");
    const recordDialog = document.querySelector("#recordDialog");
    const recordForm = document.querySelector("#recordForm");
    const evidencePreviewDialog = document.querySelector("#evidencePreviewDialog");
    const evidencePreviewTitle = document.querySelector("#evidencePreviewTitle");
    const evidencePreviewMeta = document.querySelector("#evidencePreviewMeta");
    const evidencePreviewImage = document.querySelector("#evidencePreviewImage");
    if (loginNameInput && !loginNameInput.value) {
      loginNameInput.value = localStorage.getItem(LOGIN_EMAIL_KEY) || loginName;
    }
    if (loginVersionBadge) loginVersionBadge.textContent = APP_VERSION;

    async function init() {
      renderRoleOptions();
      try {
        const [dailyResponse, examResponse] = await Promise.all([
          fetch("data/daily_missions.json", { cache: "no-store" }),
          fetch("data/exam_schedule.json", { cache: "no-store" })
        ]);
        if (dailyResponse.ok) dailyPlan = await dailyResponse.json();
        if (examResponse.ok) {
          const payload = await examResponse.json();
          examSchedule = payload.exams || FALLBACK_EXAMS;
        }
        const [summerResponse, levelsResponse, materialsResponse] = await Promise.all([
          fetch("data/summer_plan_2026.json", { cache: "no-store" }),
          fetch("data/level_tasks.json", { cache: "no-store" }),
          fetch("data/materials_catalog.json", { cache: "no-store" })
        ]);
        if (summerResponse.ok) summerPlan = await summerResponse.json();
        if (levelsResponse.ok) levelTasks = await levelsResponse.json();
        if (materialsResponse.ok) materialsCatalog = await materialsResponse.json();
        const [reverseResponse, reviewResponse, memoryResponse, externalResponse, aiTeacherResponse, counselorResponse, pacingResponse, outlineResponse, balanceResponse, routeResponse] = await Promise.all([
          fetch("data/reverse_progress.json", { cache: "no-store" }),
          fetch("data/review_schedule.json", { cache: "no-store" }),
          fetch("data/memory_items.json", { cache: "no-store" }),
          fetch("data/external_progress.json", { cache: "no-store" }),
          fetch("data/ai_teacher_config.json", { cache: "no-store" }),
          fetch("data/counselor_notes.json", { cache: "no-store" }),
          fetch("data/course_pacing.json", { cache: "no-store" }),
          fetch("data/materials_outline.json", { cache: "no-store" }),
          fetch("data/subject_balance.json", { cache: "no-store" }),
          fetch("data/course_route.json", { cache: "no-store" })
        ]);
        if (reverseResponse.ok) reverseProgress = await reverseResponse.json();
        if (reviewResponse.ok) reviewSchedule = await reviewResponse.json();
        if (memoryResponse.ok) memoryData = await memoryResponse.json();
        if (externalResponse.ok && !localStorage.getItem(EXTERNAL_PROGRESS_KEY)) externalProgress = await externalResponse.json();
        if (aiTeacherResponse.ok) aiTeacherConfig = await aiTeacherResponse.json();
        if (counselorResponse.ok && !localStorage.getItem(COUNSELOR_NOTES_KEY)) counselorNotes = await counselorResponse.json();
        if (pacingResponse.ok) coursePacing = await pacingResponse.json();
        if (outlineResponse.ok) materialsOutline = await outlineResponse.json();
        if (balanceResponse.ok) subjectBalance = await balanceResponse.json();
        if (routeResponse.ok) courseRoute = await routeResponse.json();
      } catch (_) {
        dailyPlan = FALLBACK_DAILY;
        examSchedule = FALLBACK_EXAMS;
        summerPlan = FALLBACK_SUMMER;
        levelTasks = FALLBACK_LEVELS;
        materialsCatalog = FALLBACK_MATERIALS;
        reverseProgress = FALLBACK_REVERSE_PROGRESS;
        reviewSchedule = FALLBACK_REVIEW_SCHEDULE;
        memoryData = FALLBACK_MEMORY;
        externalProgress = loadExternalProgress();
        aiTeacherConfig = FALLBACK_AI_TEACHER;
        coursePacing = FALLBACK_COURSE_PACING;
        courseRoute = FALLBACK_COURSE_ROUTE;
        materialsOutline = FALLBACK_MATERIALS_OUTLINE;
        subjectBalance = FALLBACK_SUBJECT_BALANCE;
        counselorNotes = loadCounselorNotes();
      }
      await initFirebaseBridge();
      render();
    }

    async function initFirebaseBridge() {
      try {
        const response = await fetch(FIREBASE_CONFIG_PATH, { cache: "no-store" });
        if (!response.ok) return;
        const config = await response.json();
        if (!config.enabled || !config.firebase) {
          firebaseBridge.message = "Firebase設定は読み込みましたが、enabled=falseです。";
          return;
        }
        const [
          firebaseApp,
          firebaseFirestore,
          firebaseStorage,
          firebaseAuth
        ] = await Promise.all([
          import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
          import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
          import("https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js"),
          import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js")
        ]);
        const app = firebaseApp.initializeApp(config.firebase);
        const db = firebaseFirestore.getFirestore(app);
        const storage = firebaseStorage.getStorage(app);
        const auth = firebaseAuth.getAuth(app);
        firebaseBridge = {
          enabled: true,
          status: "connected",
          message: "登録済みの人はログイン、はじめて使う人は新規登録してください。",
          studentId: config.student_id || "STU_0001",
          currentUser: null,
          userDoc: null,
          app,
          db,
          storage,
          auth,
          collection: firebaseFirestore.collection,
          doc: firebaseFirestore.doc,
          getDoc: firebaseFirestore.getDoc,
          getDocs: firebaseFirestore.getDocs,
          onSnapshot: firebaseFirestore.onSnapshot,
          addDoc: firebaseFirestore.addDoc,
          setDoc: firebaseFirestore.setDoc,
          deleteDoc: firebaseFirestore.deleteDoc,
          serverTimestamp: firebaseFirestore.serverTimestamp,
          signInWithEmailAndPassword: firebaseAuth.signInWithEmailAndPassword,
          createUserWithEmailAndPassword: firebaseAuth.createUserWithEmailAndPassword,
          signOut: firebaseAuth.signOut,
          storageRef: firebaseStorage.ref,
          uploadBytes: firebaseStorage.uploadBytes,
          getDownloadURL: firebaseStorage.getDownloadURL
        };
        if (auth.currentUser) {
          await applyFirebaseUser(auth.currentUser);
        }
      } catch (error) {
        firebaseBridge.enabled = false;
        firebaseBridge.status = "error";
        firebaseBridge.message = `Firebase接続に失敗しました。localStorageで保存します。${error.message || error}`;
      }
    }

    async function applyFirebaseUser(user) {
      if (!firebaseBridge.enabled || !user) return;
      firebaseBridge.currentUser = user;
      const userRef = firebaseBridge.doc(firebaseBridge.db, "users", user.uid);
      const userSnap = await firebaseBridge.getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      firebaseBridge.userDoc = userData;
      firebaseBridge.studentId = Array.isArray(userData.linked_student_ids) && userData.linked_student_ids[0]
        ? userData.linked_student_ids[0]
        : firebaseBridge.studentId;
      currentRole = userData.role || currentRole || "student";
      loginName = userData.displayName || user.displayName || user.email || loginName;
      localStorage.setItem(LOGIN_KEY, "true");
      localStorage.setItem(LOGIN_NAME_KEY, loginName);
      localStorage.setItem(LOGIN_EMAIL_KEY, user.email || "");
      localStorage.setItem(AUTH_UID_KEY, user.uid);
      localStorage.setItem(ROLE_KEY, currentRole);
      isLoggedIn = true;
      firebaseBridge.status = userSnap.exists() ? "authenticated" : "profile_missing";
      firebaseBridge.message = userSnap.exists()
        ? "Firebaseログイン済み。提出画像はStorage、記録はFirestoreへ保存します。"
        : "Firebaseログイン済みですが、users/{uid} が未作成です。管理者に確認してください。";
      await writeLoginLog(user, userData);
      subscribeFirebaseRecords();
      subscribeFirebaseSchedules();
    }

    function defaultUserProfile(user) {
      const role = currentRole || "student";
      const roleLabel = ROLES[role]?.label || "生徒";
      const emailName = String(user.email || "").split("@")[0];
      const profile = {
        uid: user.uid,
        email: user.email || "",
        displayName: loginName || emailName || roleLabel,
        role,
        linked_student_ids: ["STU_0001"],
        classroom_ids: ["room_001"],
        status: "active",
        created_at: firebaseBridge.serverTimestamp(),
        last_login_at: firebaseBridge.serverTimestamp(),
        login_count: 1
      };
      if (role === "supporter") {
        profile.supporter_type = currentSupportType || "family";
      }
      return profile;
    }

    async function createFirebaseAccount(email, password) {
      if (!firebaseBridge.enabled || !firebaseBridge.createUserWithEmailAndPassword) {
        throw new Error("Firebaseが未接続です。公開URLで再読み込みしてから登録してください。");
      }
      const credential = await firebaseBridge.createUserWithEmailAndPassword(firebaseBridge.auth, email, password);
      const user = credential.user;
      const userRef = firebaseBridge.doc(firebaseBridge.db, "users", user.uid);
      await firebaseBridge.setDoc(userRef, defaultUserProfile(user), { merge: true });
      await applyFirebaseUser(user);
      return user;
    }

    async function writeLoginLog(user, userData) {
      if (!firebaseBridge.enabled || !firebaseBridge.addDoc || !user) return;
      try {
        await firebaseBridge.addDoc(firebaseBridge.collection(firebaseBridge.db, "login_logs"), {
          uid: user.uid,
          email: user.email || "",
          role: userData.role || currentRole || "student",
          linked_student_id: firebaseBridge.studentId,
          login_at: firebaseBridge.serverTimestamp(),
          user_agent: navigator.userAgent,
          source: "web"
        });
      } catch (_) {
        // Login logs are useful but should never block the student workflow.
      }
    }

    async function syncFirebaseRecords() {
      if (!firebaseBridge.enabled || !firebaseBridge.currentUser) return;
      try {
        const collectionRef = firebaseBridge.collection(firebaseBridge.db, "students", firebaseBridge.studentId, "evidence_records");
        const snapshot = await firebaseBridge.getDocs(collectionRef);
        const remoteRecords = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          firebaseDocumentId: docSnap.id,
          firebaseSyncStatus: "synced"
        }));
        if (!remoteRecords.length) return;
        const merged = new Map(records.map((record) => [recordIdentity(record), record]));
        remoteRecords.forEach((record) => {
          merged.set(recordIdentity(record), {
            ...merged.get(recordIdentity(record)),
            ...record
          });
        });
        records = [...merged.values()].sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
        saveEvidenceRecords(STORAGE_KEY, records);
      } catch (error) {
        firebaseBridge.status = "read_error";
        firebaseBridge.message = `Firestore読込に失敗しました。localStorage表示を継続します。${error.message || error}`;
      }
    }

    function mergeFirebaseRecords(snapshot) {
      const remoteRecords = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        firebaseDocumentId: docSnap.id,
        firebaseSyncStatus: docSnap.data().firebaseSyncStatus || "synced"
      }));
      const merged = new Map(records.map((record) => [recordIdentity(record), record]));
      remoteRecords.forEach((record) => {
        merged.set(recordIdentity(record), {
          ...merged.get(recordIdentity(record)),
          ...record
        });
      });
      records = [...merged.values()].sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
      saveEvidenceRecords(STORAGE_KEY, records);
    }

    function subscribeFirebaseRecords() {
      if (evidenceUnsubscribe) {
        evidenceUnsubscribe();
        evidenceUnsubscribe = null;
      }
      if (!firebaseBridge.enabled || !firebaseBridge.currentUser || !firebaseBridge.onSnapshot) return;
      const collectionRef = firebaseBridge.collection(firebaseBridge.db, "students", firebaseBridge.studentId, "evidence_records");
      evidenceUnsubscribe = firebaseBridge.onSnapshot(collectionRef, (snapshot) => {
        mergeFirebaseRecords(snapshot);
        if (isLoggedIn) render();
      }, () => {
        firebaseBridge.status = "read_error";
        firebaseBridge.message = "提出記録の自動更新に失敗しました。再ログインしてお試しください。";
        if (isLoggedIn) render();
      });
    }

    function subscribeFirebaseSchedules() {
      if (scheduleUnsubscribe) {
        scheduleUnsubscribe();
        scheduleUnsubscribe = null;
      }
      if (!firebaseBridge.enabled || !firebaseBridge.currentUser || !firebaseBridge.onSnapshot) return;
      const collectionRef = firebaseBridge.collection(firebaseBridge.db, "students", firebaseBridge.studentId, "schedules");
      scheduleUnsubscribe = firebaseBridge.onSnapshot(collectionRef, (snapshot) => {
        const remoteSchedules = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
          custom_id: docSnap.id,
          source: "custom",
          firebaseSyncStatus: "synced"
        }));
        const unsyncedLocal = customCountdowns.filter((item) => item.firebaseSyncStatus !== "synced");
        const merged = new Map(unsyncedLocal.map((item) => [item.id, item]));
        remoteSchedules.forEach((item) => merged.set(item.id, item));
        customCountdowns = [...merged.values()];
        saveCustomCountdowns();
        if (isLoggedIn) render();
      }, () => {
        if (scheduleQuickStatus) scheduleQuickStatus.textContent = "共有予定を読み込めませんでした。再ログインしてください。";
      });
    }

    function loadMemoryResults() {
      try {
        return JSON.parse(localStorage.getItem(MEMORY_RESULT_KEY) || "{}");
      } catch (_) {
        return {};
      }
    }

    function saveMemoryResults() {
      localStorage.setItem(MEMORY_RESULT_KEY, JSON.stringify(memoryResults));
    }

    function loadExternalProgress() {
      try {
        return JSON.parse(localStorage.getItem(EXTERNAL_PROGRESS_KEY) || JSON.stringify(FALLBACK_EXTERNAL));
      } catch (_) {
        return FALLBACK_EXTERNAL;
      }
    }

    function saveExternalProgress() {
      localStorage.setItem(EXTERNAL_PROGRESS_KEY, JSON.stringify(externalProgress));
    }

    function loadAiTeacherLog() {
      try {
        return JSON.parse(localStorage.getItem(AI_TEACHER_LOG_KEY) || "[]");
      } catch (_) {
        return [];
      }
    }

    function saveAiTeacherLog() {
      localStorage.setItem(AI_TEACHER_LOG_KEY, JSON.stringify(aiTeacherLog));
    }

    function loadCounselorNotes() {
      try {
        return JSON.parse(localStorage.getItem(COUNSELOR_NOTES_KEY) || JSON.stringify(FALLBACK_COUNSELOR_NOTES));
      } catch (_) {
        return FALLBACK_COUNSELOR_NOTES;
      }
    }

    function saveCounselorNotes() {
      localStorage.setItem(COUNSELOR_NOTES_KEY, JSON.stringify(counselorNotes));
    }

    function loadNoticeContacts() {
      try {
        return normalizeNoticeContacts(JSON.parse(localStorage.getItem(NOTICE_CONTACTS_KEY) || JSON.stringify(FALLBACK_NOTICE_CONTACTS)));
      } catch (_) {
        return normalizeNoticeContacts(FALLBACK_NOTICE_CONTACTS);
      }
    }

    function saveNoticeContacts() {
      localStorage.setItem(NOTICE_CONTACTS_KEY, JSON.stringify(noticeContacts));
    }

    function normalizeNoticeContacts(value) {
      const defaults = FALLBACK_NOTICE_CONTACTS.recipients.map((contact) => ({ ...contact, methods: [...contact.methods] }));
      const incoming = Array.isArray(value?.recipients) ? value.recipients : [];
      return {
        phase: value?.phase || FALLBACK_NOTICE_CONTACTS.phase,
        recipients: defaults.map((base) => {
          const found = incoming.find((contact) => contact.role === base.role) || {};
          const methods = Array.isArray(found.methods) && found.methods.length ? found.methods : base.methods;
          return {
            ...base,
            ...found,
            email: found.email || "",
            line: found.line || "",
            phone: found.phone || "",
            other: found.other || "",
            methods
          };
        })
      };
    }

    function currentNotificationRole() {
      return currentRole === "counselor" ? "supporter" : currentRole;
    }

    function visibleNoticeContacts() {
      const contacts = normalizeNoticeContacts(noticeContacts).recipients;
      if (currentRole === "admin") return contacts;
      return contacts.filter((contact) => contact.role === currentNotificationRole());
    }

    function loadNoticeQueue() {
      try {
        return JSON.parse(localStorage.getItem(NOTICE_QUEUE_KEY) || "[]");
      } catch (_) {
        return [];
      }
    }

    function saveNoticeQueue() {
      localStorage.setItem(NOTICE_QUEUE_KEY, JSON.stringify(noticeQueue));
    }

    function loadCustomCountdowns() {
      try {
        const payload = JSON.parse(localStorage.getItem(CUSTOM_COUNTDOWNS_KEY) || "[]");
        return Array.isArray(payload) ? payload : [];
      } catch (_) {
        return [];
      }
    }

    function saveCustomCountdowns() {
      localStorage.setItem(CUSTOM_COUNTDOWNS_KEY, JSON.stringify(customCountdowns));
    }

    function allCountdownTargets() {
      return buildCountdownTargets(examSchedule, customCountdowns);
    }

    async function addCustomCountdown(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const nameInput = form.querySelector('[name="scheduleName"]');
      const dateInput = form.querySelector('[name="scheduleDate"]');
      const notesInput = form.querySelector('[name="scheduleNotes"]');
      const name = nameInput?.value.trim();
      const targetDate = dateInput?.value;
      if (!name || !targetDate) return;
      const item = {
        id: `goal_${Date.now()}`,
        exam_name: name,
        exam_type: "custom_goal",
        date_start: targetDate,
        date_end: targetDate,
        countdown_target: targetDate,
        priority: 20 + customCountdowns.length,
        notes: notesInput?.value.trim() || "短期目標",
        source: "custom",
        created_by_uid: firebaseBridge.currentUser?.uid || "local",
        created_by_role: currentRole,
        created_by_name: loginName || ROLES[currentRole]?.label || "利用者",
        student_id: firebaseBridge.studentId,
        visibility: "shared",
        firebaseSyncStatus: firebaseBridge.currentUser ? "syncing" : "local"
      };
      customCountdowns.push(item);
      saveCustomCountdowns();
      form.reset();
      if (scheduleQuickStatus) scheduleQuickStatus.textContent = firebaseBridge.currentUser
        ? "共有予定へ保存中です..."
        : "この端末内へ保存しました。ログインするとFirebase共有を利用できます。";
      if (firebaseBridge.enabled && firebaseBridge.currentUser) {
        try {
          const scheduleRef = firebaseBridge.doc(firebaseBridge.db, "students", firebaseBridge.studentId, "schedules", item.id);
          await firebaseBridge.setDoc(scheduleRef, {
            ...item,
            firebaseSyncStatus: "synced",
            created_at: firebaseBridge.serverTimestamp(),
            updated_at: firebaseBridge.serverTimestamp()
          }, { merge: true });
          item.firebaseSyncStatus = "synced";
          if (scheduleQuickStatus) scheduleQuickStatus.textContent = `${ROLES[currentRole]?.label || "利用者"}の共有予定として追加しました。`;
        } catch (error) {
          item.firebaseSyncStatus = "error";
          const errorCode = String(error?.code || "schedule/save-failed");
          if (scheduleQuickStatus) scheduleQuickStatus.textContent = `Firebase共有に失敗しました（${errorCode}）。予定は端末内に保持しています。`;
        }
      }
      saveCustomCountdowns();
      render();
    }

    async function deleteCustomCountdown(id) {
      const item = customCountdowns.find((candidate) => candidate.id === id || candidate.custom_id === id);
      if (!item || !canDeleteSchedule(item, firebaseBridge.currentUser, currentRole)) return;
      if (firebaseBridge.enabled && firebaseBridge.currentUser && item.firebaseSyncStatus === "synced") {
        try {
          const scheduleRef = firebaseBridge.doc(firebaseBridge.db, "students", firebaseBridge.studentId, "schedules", id);
          await firebaseBridge.deleteDoc(scheduleRef);
        } catch (_) {
          if (scheduleQuickStatus) scheduleQuickStatus.textContent = "共有予定を削除できませんでした。通信を確認してください。";
          return;
        }
      }
      customCountdowns = customCountdowns.filter((item) => item.id !== id);
      saveCustomCountdowns();
      render();
    }

    function todayKey() {
      return dailyPlan.date || BASELINE_DATE;
    }

    function studyElapsedDays() {
      return Math.max(1, dateDaysBetween(studyStartDate, todayJapanKey()) + 1);
    }

    function saveStudyStartDate(value) {
      studyStartDate = value || DEFAULT_STUDY_START_DATE;
      localStorage.setItem(STUDY_START_DATE_KEY, studyStartDate);
      render();
    }

    function activePhase() {
      const current = new Date(`${dailyPlan.date || BASELINE_DATE}T00:00:00+09:00`);
      return (dailyPlan.phases || []).find((phase) => {
        const start = new Date(`${phase.date_start}T00:00:00+09:00`);
        const end = new Date(`${phase.date_end}T23:59:59+09:00`);
        return current >= start && current <= end;
      }) || (dailyPlan.phases || [])[0];
    }

    function renderRoleOptions() {
      loginRoleOptions.innerHTML = "";
      PUBLIC_ROLE_KEYS.forEach((key) => {
        const role = ROLES[key];
        const label = document.createElement("label");
        const sub = {
          student: "今日の学習を記録",
          parent: "努力を見守る",
          supporter: "属性を選んで支援",
          teacher: "進捗と弱点を見る"
        }[key];
        label.innerHTML = `
          <input type="radio" name="role" value="${key}" ${key === currentRole ? "checked" : ""}>
          <span class="role-label-main">${role.label}</span>
          <span class="role-label-sub">${sub}</span>
        `;
        label.querySelector("input").addEventListener("change", () => {
          currentRole = key;
          localStorage.setItem(ROLE_KEY, currentRole);
          renderLoginSupportTypePanel();
        });
        loginRoleOptions.appendChild(label);
      });
      renderLoginSupportTypePanel();
    }

    function renderLoginSupportTypePanel() {
      loginSupportTypePanel.hidden = currentRole !== "supporter";
      if (loginSupportTypePanel.hidden) {
        loginSupportTypePanel.innerHTML = "";
        return;
      }
      const current = SUPPORTER_TYPES.find((type) => type.value === currentSupportType) || SUPPORTER_TYPES[0];
      loginSupportTypePanel.innerHTML = `
        <label>
          サポーター属性
          <select id="supportTypeSelect">
            ${SUPPORTER_TYPES.map((type) => `<option value="${type.value}" ${type.value === current.value ? "selected" : ""}>${type.label}</option>`).join("")}
          </select>
        </label>
        <span class="role-label-sub">${current.note}</span>
      `;
      loginSupportTypePanel.querySelector("#supportTypeSelect").addEventListener("change", (event) => {
        currentSupportType = event.target.value;
        localStorage.setItem(SUPPORT_TYPE_KEY, currentSupportType);
        renderLoginSupportTypePanel();
      });
    }

    function renderAccountPanel() {
      const role = activeRoleConfig();
      const supportType = SUPPORTER_TYPES.find((type) => type.value === currentSupportType);
      const authLabel = firebaseBridge.currentUser
        ? `Firebase認証: ${firebaseBridge.currentUser.email || firebaseBridge.currentUser.uid}`
        : firebaseBridge.message;
      accountPanel.innerHTML = `
        <strong>${escapeHtml(loginName || "ゲスト")} / ${role.label}${currentRole === "supporter" && supportType ? ` / ${supportType.label}` : ""}</strong>
        <span>${role.headline}</span>
        <span>${escapeHtml(authLabel)}</span>
        <button class="secondary" type="button" id="logoutButton">ログアウト</button>
      `;
      accountPanel.querySelector("#logoutButton").addEventListener("click", logoutUser);
    }

    async function logoutUser() {
      if (evidenceUnsubscribe) {
        evidenceUnsubscribe();
        evidenceUnsubscribe = null;
      }
      if (scheduleUnsubscribe) {
        scheduleUnsubscribe();
        scheduleUnsubscribe = null;
      }
      if (firebaseBridge.enabled && firebaseBridge.currentUser && firebaseBridge.signOut) {
        try {
          await firebaseBridge.signOut(firebaseBridge.auth);
        } catch (_) {
          // Local logout still proceeds so the user is not trapped on this screen.
        }
      }
      firebaseBridge.currentUser = null;
      firebaseBridge.userDoc = null;
      isLoggedIn = false;
      loginName = "";
      loginNameInput.value = "";
      loginPasscodeInput.value = "";
      localStorage.setItem(LOGIN_KEY, "false");
      localStorage.removeItem(LOGIN_NAME_KEY);
      localStorage.removeItem(LOGIN_EMAIL_KEY);
      localStorage.removeItem(AUTH_UID_KEY);
      activeView = "home";
      localStorage.setItem(VIEW_KEY, activeView);
      loginStatus.textContent = "ログアウトしました。切り替える利用者でログインしてください。";
      render();
      loginNameInput.focus();
    }

    headerLogoutButton?.addEventListener("click", logoutUser);

    function activeRoleConfig() {
      const base = ROLES[currentRole] || ROLES.student;
      if (currentRole !== "supporter") return base;
      const supportType = SUPPORTER_TYPES.find((type) => type.value === currentSupportType) || SUPPORTER_TYPES[0];
      if (currentSupportType === "psychological_counselor") {
        return {
          ...base,
          headline: "心理カウンセラー属性のサポーターです。疲労傾向と声かけ注意点を確認します。",
          showFatigue: "summary",
          showMentalState: "summary",
          showMissionDetail: true,
          canPostCounselorNote: true
        };
      }
      if (currentSupportType === "school_teacher") {
        return {
          ...base,
          headline: "学校の先生属性のサポーターです。学習状況と負荷の要約を確認します。",
          showScore: "summary",
          showFatigue: "summary",
          showMissionDetail: true
        };
      }
      return { ...base, headline: `${supportType.label}として、応援に必要な努力量を確認します。` };
    }

    function renderAppNav() {
      renderAppNavigation({
        container: appNav,
        views: APP_VIEWS,
        activeView,
        onSelect: setActiveView,
        onOpenDevDrawer: openDevDrawer
      });
    }

    function setActiveView(viewId) {
      activeView = viewId;
      localStorage.setItem(VIEW_KEY, activeView);
      render();
    }

    function renderDevDrawer() {
      renderDevDrawerPanel({
        versionBadge,
        devVersionBadge,
        devVersionList,
        appVersion: APP_VERSION,
        releaseNotes: RELEASE_NOTES,
        escapeHtml
      });
    }

    function openDevDrawer() {
      openDevDrawerPanel({ drawer: devDrawer, backdrop: devDrawerBackdrop });
    }

    function closeDevDrawer() {
      closeDevDrawerPanel({ drawer: devDrawer, backdrop: devDrawerBackdrop });
    }

    function render() {
      document.body.dataset.auth = isLoggedIn ? "in" : "out";
      document.body.dataset.role = currentRole;
      document.body.dataset.supportType = currentSupportType;
      document.body.dataset.view = activeView;
      if (versionBadge) versionBadge.textContent = APP_VERSION;
      if (devVersionBadge) devVersionBadge.textContent = APP_VERSION;
      document.querySelector("#baselineLabel").textContent = `今日 ${todayJapanKey()}`;
      document.querySelector("#dayBadge").textContent = `開始 ${studyStartDate} / ${studyElapsedDays()}日目`;
      document.querySelector("#levelLabel").textContent = levelLabelJa(dailyPlan.level);
      document.querySelector("#phaseDateLabel").textContent = dailyPlan.date;
      document.querySelector("#coachMessage").textContent = roleCoachMessage();
      if (loginVersionBadge) loginVersionBadge.textContent = APP_VERSION;
      loginStatus.textContent = firebaseBridge.message;
      renderRoleOptions();
      if (isLoggedIn) renderAccountPanel();
      renderAppNav();
      renderCountdowns();
      renderScheduleDrawer();
      renderRouteSummary();
      renderRoleDashboard();
      renderPhase();
      renderMissions();
      renderHomeBriefs();
      renderLongPlan();
      renderWeekPlan();
      renderReverseProgress();
      renderStudyLoad();
      renderProgress();
      renderReviews();
      renderMemory();
      renderRetentionTests();
      renderExamList();
      renderSummerPlan();
      renderLevelTasks();
      renderMaterials();
      renderSettings();
      renderExternalProgress();
      renderAiTeacher();
      renderCounselorSupport();
      renderPermissions();
      renderNotificationPanel();
      renderLogs();
      renderDevDrawer();
    }

function renderCountdowns() {
  renderCountdownCards(countdownGrid, allCountdownTargets());
}

    function todayOutcomeSummary() {
      const todayRecords = records.filter((record) => record.date === todayKey());
      const evidenceRecords = todayRecords.filter(hasEvidence);
      const total = dailyPlan.missions?.length || courseRoute.today?.blocks?.length || 0;
      const scores = todayRecords
        .map((record) => Number(record.score))
        .filter((score) => Number.isFinite(score) && score > 0);
      const averageScore = scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null;
      return { todayRecords, evidenceRecords, total, averageScore };
    }

    function roleCoachMessage() {
      const summary = todayOutcomeSummary();
      const submitted = summary.evidenceRecords.length;
      const totalText = summary.total ? `${submitted}/${summary.total}件` : `${submitted}件`;

      if (currentRole === "parent") {
        return `今日は提出 ${totalText}。学習の有無と提出状況を中心に見守れます。声かけは結果より継続をほめる形が安心です。`;
      }

      if (currentRole === "supporter") {
        return `今日は提出 ${totalText}。細かい点数より、続けた事実と次の一歩を応援してください。`;
      }

      if (currentRole === "teacher") {
        const scoreText = summary.averageScore === null ? "正答率は提出後に確認" : `平均 ${summary.averageScore}点`;
        return `提出 ${totalText}。${scoreText}。未提出カードと画像を見て、戻る単元と次の講義を判断できます。`;
      }

      if (currentRole === "admin") {
        return "検証中の画面です。提出画像、通知、予定、権限の動作をロール別に確認できます。";
      }

      return dailyPlan.coach_message || "今日は次の一手だけ見て進めましょう。";
    }

function renderScheduleDrawer() {
  renderScheduleDrawerPanel({
    countdownsElement: scheduleDrawerCountdowns,
    calendarElement: scheduleCalendar,
    monthTitleElement: scheduleMonthTitle,
    targets: allCountdownTargets(),
    canDeleteTarget: (item) => canDeleteSchedule(item, firebaseBridge.currentUser, currentRole)
  });
  scheduleDrawerCountdowns?.querySelectorAll("[data-delete-schedule]").forEach((button) => {
    button.addEventListener("click", () => deleteCustomCountdown(button.dataset.deleteSchedule));
  });
}

    function openScheduleDrawer() {
      openScheduleDrawerPanel({
        drawer: scheduleDrawer,
        backdrop: scheduleDrawerBackdrop,
        opener: scheduleDrawerOpen,
        onBeforeOpen: renderScheduleDrawer
      });
    }

    function closeScheduleDrawer() {
      closeScheduleDrawerPanel({
        drawer: scheduleDrawer,
        backdrop: scheduleDrawerBackdrop,
        opener: scheduleDrawerOpen
      });
    }

    function levelLabelJa(level) {
      const text = String(level || "");
      if (text.includes("FOUNDATION")) return "レベル1 基礎固め";
      if (text.includes("CORE")) return "レベル2 標準";
      if (text.includes("ADVANCE")) return "レベル3 応用";
      if (text.includes("BREAKTHROUGH")) return "レベル4 突破";
      if (text.includes("ELITE")) return "レベル5 完成";
      return text.replace("LEVEL", "レベル");
    }

    function renderPhase() {
      const phase = activePhase();
      if (!phase) return;
      document.querySelector("#phaseTitle").textContent = phase.name;
      document.querySelector("#phaseDescription").textContent = phase.description;
      const cutKeepList = document.querySelector("#cutKeepList");
      cutKeepList.innerHTML = "";
      phase.keep.forEach((item) => {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = `残す: ${item}`;
        cutKeepList.appendChild(badge);
      });
      phase.cut.forEach((item) => {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = `削る: ${item}`;
        cutKeepList.appendChild(badge);
      });
      const focusRatios = document.querySelector("#focusRatios");
      focusRatios.innerHTML = "";
      Object.entries(phase.focus_ratios).forEach(([label, value]) => {
        const row = document.createElement("div");
        row.className = "ratio-row";
        row.innerHTML = `
          <div class="bar-label"><span>${label}</span><span>${value}%</span></div>
          <div class="bar"><i style="--value: ${value}%"></i></div>
        `;
        focusRatios.appendChild(row);
      });
    }

    function getMissionRecord(missionId) {
      return records.find((record) => record.date === todayKey() && record.missionId === missionId);
    }

    function unitMissionId(unit) {
      return `unit-${[unit.subject, unit.course, unit.lesson, unit.part, unit.title].join("-").replace(/\s+/g, "-")}`;
    }

    function missionFromUnit(unit) {
      return {
        id: unitMissionId(unit),
        time: unit.time || "",
        subject: unit.subject,
        course: unit.course,
        lesson: unit.lesson,
        part: unit.part,
        title: unit.title,
        check_item: evidenceTypeForUnit(unit),
        level_task: unit.completion_rule || "",
        tasks: (unit.segments || []).map((segment) => segment.label)
      };
    }

    function findMissionById(missionId) {
      const dailyMission = dailyPlan.missions.find((item) => item.id === missionId);
      if (dailyMission) return dailyMission;
      for (const block of coursePacing.home_blocks || []) {
        const unit = (block.units || []).find((item) => unitMissionId(item) === missionId);
        if (unit) return missionFromUnit(unit);
      }
      return null;
    }

    function visibleMissionTitle(mission) {
      if (activeRoleConfig().showMissionDetail) return `${mission.lesson} ${mission.part} / ${mission.title}`;
      return `${mission.subject} / ${mission.time}`;
    }

    function renderMissions() {
      if (activeView === "home" || activeView === "today") {
        renderLearningNavigation();
        return;
      }
      const role = activeRoleConfig();
      missionList.innerHTML = "";
      missionList.className = "mission-list timetable-list";
      if (coursePacing.home_blocks && coursePacing.home_blocks.length) {
        renderDetailedTimetableBlocks(role);
        return;
      }
      dailyPlan.missions.forEach((mission, index) => {
        const record = getMissionRecord(mission.id);
        const connection = connectionForMission(mission);
        const reviews = reviewPlanForMission(mission);
        const pacing = pacingForMission(mission);
        const tasks = role.showMissionDetail ? mission.tasks : ["学習達成率", "努力量", "応援メッセージ"];
        const card = document.createElement("article");
        const isComplete = hasEvidence(record);
        card.className = `timetable-card${isComplete ? " complete" : ""}`;
        card.innerHTML = `
          ${isComplete ? `<div class="completion-ribbon">SUBMITTED</div>` : ""}
          <div>
            <div class="timetable-time">${mission.time}</div>
            <h3 class="timetable-subject">${mission.subject}</h3>
          </div>
          <div class="lesson-block">
            <strong>${isComplete ? "次の講義" : role.showMissionDetail ? mission.course : "今日の学習"}</strong>
            <span>${isComplete ? nextLabelForMission(mission) : role.showMissionDetail ? `${mission.lesson} ${mission.part}` : visibleMissionTitle(mission)}</span>
            <span>${isComplete ? "提出済み。次の学習へ進めます。" : role.showMissionDetail ? mission.title : "詳細は本人・先生画面で確認"}</span>
          </div>
          <div>
            <h3>今日やること</h3>
            <ul class="check-list">${tasks.slice(0, 5).map((task) => `<li>${task}</li>`).join("")}</ul>
          </div>
          ${pacing ? renderPacingBlock(pacing) : ""}
          <div class="connection-grid">
            <div>
              <strong>つながり</strong>
              <span>前回: ${connection.previous}</span>
              <span>次回: ${connection.next}</span>
            </div>
            <div>
              <strong>復習予定</strong>
              <span>明日: ${reviews.tomorrow}</span>
              <span>3日後: ${reviews.day3}</span>
              <span>7日後: ${reviews.day7}</span>
            </div>
          </div>
          <div class="mission-actions">
            <button type="button" class="record-button" ${role.canEditRecord ? "" : "disabled"}>${isComplete ? "提出を確認" : record ? "提出を編集" : "確認テストを提出"}</button>
            <span class="badge">${isComplete ? "次の講義へ" : "未提出: 後日へ"}</span>
          </div>
        `;
        card.querySelector(".record-button").addEventListener("click", () => openRecordDialog(mission, record));
        missionList.appendChild(card);
      });
    }

    function renderLearningNavigation() {
      const items = navigationItems();
      const currentIndex = normalizeNavigationIndex(items);
      const current = items[currentIndex];
      missionList.innerHTML = "";
      missionList.className = "mission-list";
      if (!current) {
        missionList.innerHTML = `
          <article class="navigation-card glass">
            <div class="navigation-kicker">本日の学習</div>
            <p class="navigation-message">今日の学習は100%完了です。お疲れ様でした。</p>
            <div class="navigation-current">
              <strong>明日の予定</strong>
              <span>9:00 数学Ⅰ 次のPARTから始めます。</span>
            </div>
            <button class="navigation-button" type="button" id="navigationResetButton">明日の準備を見る</button>
          </article>
        `;
        missionList.querySelector("#navigationResetButton").addEventListener("click", () => {
          navigationStepIndex = 0;
          localStorage.setItem(NAV_STEP_KEY, String(navigationStepIndex));
          render();
        });
        renderJourneyMap(items, currentIndex);
        return;
      }

      const remaining = Math.max(0, items.slice(currentIndex).reduce((sum, item) => sum + (item.minutes || 0), 0));
      const card = document.createElement("article");
      card.className = "navigation-card glass";
      const mission = findMissionById(current.missionId);
      const unit = findUnitByMissionId(current.missionId);
      const flow = learningRouteFlow(unit, mission);
      card.innerHTML = `
        <div class="navigation-kicker">次にやること</div>
        <p class="navigation-message">${navigationGreeting(items, currentIndex, remaining)}</p>
        <div class="navigation-current">
          <strong>${current.subject}</strong>
          <span>${current.course}</span>
          <span>${current.lesson} ${current.part} / ${current.title}</span>
          <span>現在: ${current.label}</span>
        </div>
        <div class="route-flow" aria-label="今日の流れ">${flow}</div>
        ${renderUnitConnection(unit, mission)}
        <button class="navigation-button" type="button" id="navigationActionButton">${current.button}</button>
      `;
      missionList.appendChild(card);
      card.querySelector("#navigationActionButton").addEventListener("click", () => handleNavigationAction(current, currentIndex, items));
      renderJourneyMap(items, currentIndex);
    }

    function navigationItems() {
      const items = [];
      (coursePacing.home_blocks || []).forEach((block) => {
        (block.units || []).forEach((unit) => {
          const mission = missionFromUnit(unit);
          const record = getMissionRecord(mission.id);
          const base = {
            missionId: mission.id,
            subject: unit.subject,
            course: unit.course,
            lesson: unit.lesson,
            part: unit.part,
            title: unit.title,
            unitNext: unit.next,
            time: block.time
          };
          if (record?.evidenceImageName) {
            items.push({
              ...base,
              type: "complete",
              label: "提出済み",
              button: "次の講義へ",
              minutes: 0
            });
            return;
          }
          (unit.segments || []).forEach((segment) => pushNavigationSegment(items, base, segment));
          items.push({
            ...base,
            type: "submit",
            label: "確認テスト提出",
            instruction: "スタサプの結果画面をスクショし、回答数と正答率が見える状態で提出します。",
            button: "結果スクショを提出する",
            minutes: 5
          });
        });
      });
      (dailyPlan.missions || [])
        .filter((mission) => !(coursePacing.home_blocks || []).some((block) => (block.units || []).some((unit) => unit.subject === mission.subject)))
        .forEach((mission) => {
          const record = getMissionRecord(mission.id);
          if (record?.evidenceImageName) {
            items.push({
              missionId: mission.id,
              subject: mission.subject,
              course: mission.course,
              lesson: mission.lesson,
              part: mission.part,
              title: mission.title,
              type: "complete",
              label: "提出済み",
              button: "次の講義へ",
              minutes: 0
            });
            return;
          }
          (mission.tasks || []).forEach((task) => {
            pushNavigationSegment(items, {
              missionId: mission.id,
              subject: mission.subject,
              course: mission.course,
              lesson: mission.lesson,
              part: mission.part,
              title: mission.title
            }, { label: task, instruction: task, minutes: 20 });
          });
          items.push({
            missionId: mission.id,
            subject: mission.subject,
            course: mission.course,
            lesson: mission.lesson,
            part: mission.part,
            title: mission.title,
            type: "submit",
            label: "確認テスト提出",
            instruction: "スタサプの結果画面をスクショし、回答数と正答率が見える状態で提出します。",
            button: "結果スクショを提出する",
            minutes: 5
          });
        });
      return items;
    }

    function findUnitByMissionId(missionId) {
      for (const block of coursePacing.home_blocks || []) {
        const unit = (block.units || []).find((item) => unitMissionId(item) === missionId);
        if (unit) return unit;
      }
      return null;
    }

    function learningRouteFlow(unit, mission) {
      const steps = unit?.route_steps || routeStepsFromSegments(unit?.segments || mission?.tasks || []);
      return steps.map((step, index) => `<div class="route-step"><strong>${index + 1}</strong><span>${step}</span></div>`).join("");
    }

    function routeStepsFromSegments(segments) {
      const labels = (segments || []).map((segment) => typeof segment === "string" ? segment : segment.label);
      const hasText = labels.some((label) => String(label).includes("テキスト"));
      const base = labels.length ? labels : ["映像授業", "確認問題", "結果提出"];
      const normalized = base.map((label) => String(label).replace("確認テスト", "確認問題"));
      if (!hasText) normalized.splice(Math.min(1, normalized.length), 0, "テキスト確認");
      if (!normalized.some((label) => label.includes("結果"))) normalized.push("結果提出");
      if (!normalized.some((label) => label.includes("AI"))) normalized.push("AI Check");
      return normalized;
    }

    function renderUnitConnection(unit, mission) {
      const previous = unit?.previous || connectionForMission(mission || {}).previous;
      const next = unit?.next || connectionForMission(mission || {}).next;
      const review = unit?.review || reviewPlanForMission(mission || {});
      const completion = unit?.completion_rule || "映像授業、テキスト確認、確認問題、結果提出まで終えたら完了";
      return `
        <div class="route-context">
          <div><strong>前回とのつながり</strong><span>${previous}</span></div>
          <div><strong>次回</strong><span>${next}</span></div>
          <div><strong>復習予定</strong><span>明日: ${review.tomorrow} / 3日後: ${review.day3} / 7日後: ${review.day7}</span></div>
          <div><strong>完了条件</strong><span>${completion}</span></div>
        </div>
      `;
    }

    function pushNavigationSegment(items, base, segment) {
      const type = navigationTypeForSegment(segment.label);
      if (type === "video") {
        items.push({
          ...base,
          type,
          label: segment.label,
          instruction: segment.instruction,
          button: navigationButtonForSegment(segment.label),
          minutes: Number(segment.minutes || 0)
        });
        items.push({
          ...base,
          type: "text",
          label: "テキスト確認",
          instruction: "映像と同じ範囲のテキストを開き、POINT・例題・確認問題の場所を確認します。",
          button: "テキストを確認する",
          minutes: 15
        });
        return;
      }
      if (type === "check") {
        items.push({
          ...base,
          type: "ai_check",
          label: "AI 3分確認",
          instruction: "確認問題の前に、理解した内容を3分で言語化します。",
          button: "AI 3分確認へ",
          minutes: 3
        });
        items.push({
          ...base,
          type: "confirmation",
          label: segment.label,
          instruction: segment.instruction,
          button: String(segment.label).includes("復習テスト") ? "復習テストへ" : "確認問題へ",
          minutes: Number(segment.minutes || 0)
        });
        return;
      }
      items.push({
        ...base,
        type,
        label: segment.label,
        instruction: segment.instruction,
        button: navigationButtonForSegment(segment.label),
        minutes: Number(segment.minutes || 0)
      });
    }

    function normalizeNavigationIndex(items) {
      let index = Math.max(0, Math.min(navigationStepIndex, items.length));
      while (items[index]?.type === "complete") index += 1;
      navigationStepIndex = index;
      localStorage.setItem(NAV_STEP_KEY, String(navigationStepIndex));
      return index;
    }

    function navigationTypeForSegment(label) {
      if (String(label).includes("映像") || String(label).includes("授業")) return "video";
      if (String(label).includes("テキスト")) return "text";
      if (String(label).includes("Point") || String(label).includes("要点")) return "point";
      if (String(label).includes("講義問題")) return "lecture_problem";
      if (String(label).includes("確認") || String(label).includes("テスト")) return "check";
      if (String(label).includes("答え合わせ")) return "review";
      if (String(label).includes("暗唱") || String(label).includes("Memory") || String(label).includes("音読")) return "memory";
      if (String(label).includes("まとめ")) return "summary";
      return "step";
    }

    function navigationButtonForSegment(label) {
      const type = navigationTypeForSegment(label);
      const map = {
        video: "映像授業を始める",
        text: "テキストを確認する",
        point: "Pointを確認する",
        lecture_problem: "講義問題へ",
        check: "AI 3分確認へ",
        review: "答え合わせへ",
        memory: "音読・暗唱へ",
        summary: "まとめる",
        step: `${label}へ`
      };
      return map[type] || "次へ";
    }

    function navigationGreeting(items, index, remaining) {
      const current = items[index];
      if (current.type === "submit") {
        return "確認テストは終了しましたか？スタサプの結果画面をスクショして提出しましょう。";
      }
      if (current.type === "ai_check") {
        return "理解できたか確認します。まず3分だけ、自分の言葉で説明しましょう。";
      }
      if (current.type === "confirmation") {
        return "では確認問題へ進みます。終わったらスタサプの回答数と正答率を提出します。";
      }
      if (index === 0) {
        return `おはようございます。今日の学習は${navigationMissionCount(items)}つです。あと${formatMinutes(remaining)}で終了予定です。`;
      }
      return `${current.label}に進みます。考えなくて大丈夫です。次はこれだけやりましょう。`;
    }

    function navigationMissionCount(items) {
      return new Set(items.map((item) => item.missionId)).size;
    }

    function handleNavigationAction(current, index, items) {
      if (current.type === "submit") {
        openRecordDialog(findMissionById(current.missionId), getMissionRecord(current.missionId));
        return;
      }
      navigationStepIndex = Math.min(index + 1, items.length);
      localStorage.setItem(NAV_STEP_KEY, String(navigationStepIndex));
      render();
    }

    function renderJourneyMap(items, currentIndex) {
      const grouped = new Map();
      items.forEach((item, index) => {
        if (!grouped.has(item.missionId)) {
          grouped.set(item.missionId, { item, indexes: [] });
        }
        grouped.get(item.missionId).indexes.push(index);
      });
      journeyMap.innerHTML = "";
      grouped.forEach(({ item, indexes }) => {
        const done = indexes.every((index) => index < currentIndex || items[index].type === "complete");
        const current = indexes.includes(currentIndex);
        const card = document.createElement("article");
        card.className = "journey-card";
        const dots = Array.from({ length: 12 }, (_, dotIndex) => {
          const ratio = dotIndex / 12;
          const progress = indexes.filter((index) => index < currentIndex).length / Math.max(1, indexes.length);
          const cls = done || ratio < progress ? "done" : current && Math.abs(ratio - progress) < 0.09 ? "current" : "";
          return `<span class="journey-dot ${cls}"></span>`;
        }).join("");
        card.innerHTML = `
          <strong>${item.subject}</strong>
          <div class="journey-track">${dots}</div>
          <div class="journey-caption">現在: ${current ? `${item.lesson} ${item.part} / ${items[currentIndex]?.label || item.title}` : done ? "終了" : `${item.lesson} ${item.part}`}</div>
          <div class="journey-caption">次: ${item.unitNext || nextLabelForMission(item)}</div>
        `;
        journeyMap.appendChild(card);
      });
    }

    function renderDetailedTimetableBlocks(role) {
      coursePacing.home_blocks.forEach((block, index) => {
        const card = document.createElement("article");
        card.className = "timetable-card";
        card.innerHTML = `
          <div>
            <div class="timetable-time">${block.time}</div>
            <h3 class="timetable-subject">${block.theme}</h3>
            <div class="course-line">${block.goal}</div>
          </div>
          <div class="unit-list">
            ${(block.units || []).map((unit) => renderTimetableUnit(unit, role)).join("")}
          </div>
          <div class="mission-actions">
            <span class="badge">${block.label || timeBlockLabel(index)}</span>
            <span class="button-note">合計 ${block.total_minutes || ""}分</span>
          </div>
        `;
        card.querySelectorAll(".unit-record-button").forEach((button) => {
          const mission = findMissionById(button.dataset.missionId);
          button.addEventListener("click", () => openRecordDialog(mission, getMissionRecord(button.dataset.missionId)));
        });
        missionList.appendChild(card);
      });

      dailyPlan.missions
        .filter((mission) => !coursePacing.home_blocks.some((block) => (block.units || []).some((unit) => unit.subject === mission.subject)))
        .forEach((mission, extraIndex) => {
          const record = getMissionRecord(mission.id);
          const connection = connectionForMission(mission);
          const reviews = reviewPlanForMission(mission);
          const tasks = role.showMissionDetail ? mission.tasks : ["学習達成率", "努力量", "応援メッセージ"];
          const card = document.createElement("article");
          const isComplete = hasEvidence(record);
          card.className = `timetable-card${isComplete ? " complete" : ""}`;
          card.innerHTML = `
            ${isComplete ? `<div class="completion-ribbon">SUBMITTED</div>` : ""}
            <div>
              <div class="timetable-time">${mission.time}</div>
              <h3 class="timetable-subject">${mission.subject}</h3>
            </div>
            <div class="lesson-block">
              <strong>${isComplete ? "次の講義" : role.showMissionDetail ? mission.course : "今日の学習"}</strong>
              <span>${isComplete ? nextLabelForMission(mission) : role.showMissionDetail ? `${mission.lesson} ${mission.part}` : visibleMissionTitle(mission)}</span>
              <span>${isComplete ? "提出済み。次の学習へ進めます。" : role.showMissionDetail ? mission.title : "詳細は本人・先生画面で確認"}</span>
            </div>
            <div>
              <h3>今日やること</h3>
              <ul class="check-list">${tasks.slice(0, 5).map((task) => `<li>${task}</li>`).join("")}</ul>
            </div>
            <div class="connection-grid">
              <div>
                <strong>つながり</strong>
                <span>前回: ${connection.previous}</span>
                <span>次回: ${connection.next}</span>
              </div>
              <div>
                <strong>復習予定</strong>
                <span>明日: ${reviews.tomorrow}</span>
                <span>3日後: ${reviews.day3}</span>
                <span>7日後: ${reviews.day7}</span>
              </div>
            </div>
            <div class="mission-actions">
              <button type="button" class="record-button" ${role.canEditRecord ? "" : "disabled"}>${isComplete ? "提出を確認" : record ? "提出を編集" : "確認テストを提出"}</button>
              <span class="badge">${isComplete ? "次の講義へ" : "未提出: 後日へ"}</span>
            </div>
          `;
          card.querySelector(".record-button").addEventListener("click", () => openRecordDialog(mission, record));
          missionList.appendChild(card);
        });
    }

    function renderTimetableUnit(unit, role) {
      const segments = unit.segments || [];
      const mission = missionFromUnit(unit);
      const record = getMissionRecord(mission.id);
      const isComplete = hasEvidence(record);
      return `
        <div class="unit-card${isComplete ? " complete" : ""}">
          ${isComplete ? `<div class="completion-ribbon">SUBMITTED</div>` : ""}
          <div class="unit-head">
            <div>
              <strong>${isComplete ? "次の講義" : `${unit.subject} / ${unit.course}`}</strong>
              <span>${isComplete ? nextLabelForUnit(unit) : `${unit.lesson} ${unit.part} / ${unit.title}`}</span>
            </div>
            <span class="badge">${unit.minutes}分</span>
          </div>
          <div>
            <h3>今日の細かい指示</h3>
            <div class="micro-plan">
              ${segments.map((segment) => `
                <div class="micro-plan-row">
                  <strong>${segment.minutes}分</strong>
                  <span>${segment.label}: ${segment.instruction}</span>
                </div>
              `).join("")}
            </div>
          </div>
          <div class="connection-grid">
            <div>
              <strong>つながり</strong>
              <span>前回: ${unit.previous}</span>
              <span>次回: ${unit.next}</span>
            </div>
            <div>
              <strong>復習予定</strong>
              <span>明日: ${unit.review?.tomorrow || "類題"}</span>
              <span>3日後: ${unit.review?.day3 || "定着確認"}</span>
              <span>7日後: ${unit.review?.day7 || "再確認"}</span>
            </div>
          </div>
          <div class="pacing-note">
            <strong>完了条件</strong>
            <span>${unit.completion_rule}</span>
            <strong>ペース判断</strong>
            <span>${unit.pace_note}</span>
          </div>
          <div class="mission-actions">
            <button type="button" class="record-button unit-record-button" data-mission-id="${mission.id}" ${role.canEditRecord ? "" : "disabled"}>${isComplete ? "提出を確認" : record ? "提出を編集" : "確認テストを提出"}</button>
            <span class="badge">${isComplete ? "次の講義へ" : "未提出: 後日へ"}</span>
          </div>
        </div>
      `;
    }

    function timeBlockLabel(index) {
      return ["午前", "午後", "夜"][index] || "今日";
    }

    function pacingForMission(mission) {
      return (coursePacing.courses || []).find((course) => {
        return mission.subject === course.subject || mission.course === course.course;
      });
    }

    function renderPacingBlock(pacing) {
      const segments = (pacing.today_unit_plan?.segments || []).slice(0, 6);
      return `
        <div class="pacing-note">
          <strong>3時間で足りるか</strong>
          <span>${pacing.pace_judgement}</span>
          <span>残り${pacing.remaining_units}単位 / 1日${pacing.target_units_per_day}単位なら約${pacing.estimated_days_at_current_pace}日 / 完了目安 ${pacing.estimated_finish_date_from_2026_07_01}</span>
          <span>教材反映度: ${coursePacing.material_reflection_status?.label || "教材構造ベース"}。${coursePacing.material_reflection_status?.note || ""}</span>
        </div>
        <div class="micro-plan">
          ${segments.map((segment) => `
            <div class="micro-plan-row">
              <strong>${segment.minutes}分</strong>
              <span>${segment.label}: ${segment.instruction}</span>
            </div>
          `).join("")}
          <div class="pacing-note">
            <strong>終わらない時</strong>
            <span>${pacing.fallback_rule}</span>
          </div>
        </div>
      `;
    }

    function connectionForMission(mission) {
      const map = {
        "数学Ⅰ": { previous: "数学Ⅰ 第1講 導入", next: "数学Ⅰ 第1講 PART2 整式の整理" },
        "英語": { previous: "英文の基本", next: "命令文" },
        "物理基礎": { previous: "なし", next: "速度" }
      };
      return map[mission.subject] || { previous: "前回の確認", next: "次のPART" };
    }

    function reviewPlanForMission(mission) {
      if (mission.subject.includes("英語")) {
        return { tomorrow: "復習テスト類題", day3: "基本文チェック", day7: "定着テスト" };
      }
      if (mission.subject.includes("物理")) {
        return { tomorrow: "確認問題類題", day3: "単位確認", day7: "定着テスト" };
      }
      return { tomorrow: "確認問題 類題", day3: "定着テスト", day7: "再確認" };
    }

    function nextLabelForMission(mission) {
      const connection = connectionForMission(mission);
      return connection.next || `${mission.subject} 次の講義`;
    }

    function nextLabelForUnit(unit) {
      return unit.next || `${unit.subject} 次の講義`;
    }

    function renderHomeBriefs() {
      if (activeView === "home") return;
    }

    function renderRouteSummary() {
      if (!routeSummary) return;
      document.querySelector("#todayDateLabel").textContent = courseRoute.today?.date_label || todayJapanKey();
      routeSummary.innerHTML = "";
      (courseRoute.today?.blocks || []).forEach((block) => {
        const card = document.createElement("article");
        card.className = "route-summary-card";
        card.innerHTML = `<strong>${block.label}: ${block.subject}</strong><span>${block.goal}</span>`;
        routeSummary.appendChild(card);
      });
    }

    function renderRoleDashboard() {
      if (!roleDashboard) return;
      const role = activeRoleConfig();
      const todayRecords = records.filter((record) => record.date === todayKey());
      const evidenceRecords = todayRecords.filter(hasEvidence);
      const schedule = todayScheduleLoad();
      const navItems = navigationItems();
      const currentIndex = normalizeNavigationIndex(navItems);
      const current = navItems[currentIndex];
      roleDashboardBadge.textContent = role.label;
      roleDashboard.innerHTML = "";

      if (currentRole === "teacher") {
        renderTeacherDashboard(todayRecords, evidenceRecords);
        return;
      }

      if (currentRole === "parent") {
        roleDashboard.innerHTML = `
          <div class="role-dashboard-grid">
            <article class="dashboard-card highlight">
              <strong>今日の学習時間</strong>
              <span>${formatMinutes(schedule.totalMinutes)} / 終了目安 ${schedule.end || "--:--"}</span>
            </article>
            <article class="dashboard-card">
              <strong>提出状況</strong>
              <span>${evidenceRecords.length}件提出済み / 未提出は本人画面で継続確認</span>
            </article>
            <article class="dashboard-card">
              <strong>AI先生コメント</strong>
              <p>${evidenceRecords.length ? "今日は学習の証跡が残っています。結果だけでなく、続けられたことを評価してください。" : "今日はまだ提出待ちです。急かしすぎず、終わったら見せてね、くらいの声かけが良いです。"}</p>
            </article>
          </div>
        `;
        return;
      }

      if (currentRole === "supporter") {
        const supportType = SUPPORTER_TYPES.find((type) => type.value === currentSupportType);
        roleDashboard.innerHTML = `
          <div class="role-dashboard-grid">
            <article class="dashboard-card highlight">
              <strong>${supportType?.label || "サポーター"}向け</strong>
              <span>細かい成績より、継続状況と応援コメントを中心に確認します。</span>
            </article>
            <article class="dashboard-card">
              <strong>今日の努力</strong>
              <span>${evidenceRecords.length ? "提出記録あり" : "提出待ち"} / 学習予定 ${formatMinutes(schedule.totalMinutes)}</span>
            </article>
            <article class="dashboard-card">
              <strong>声かけ</strong>
              <p>点数よりも「今日も机に向かったこと」を先に認める表示にしています。</p>
            </article>
          </div>
        `;
        return;
      }

      roleDashboard.innerHTML = `
        <div class="role-dashboard-grid">
          <article class="dashboard-card highlight">
            <strong>次にやること</strong>
            <span>${current ? `${current.subject} / ${current.label}` : "今日の学習は完了"}</span>
          </article>
          <article class="dashboard-card">
            <strong>今日の流れ</strong>
            <span>${(courseRoute.today?.blocks || []).map((block) => `${block.label}: ${block.subject}`).join(" → ")}</span>
          </article>
          <article class="dashboard-card">
            <strong>提出</strong>
            <span>${evidenceRecords.length}件提出済み。確認テスト結果スクショが完了の証拠です。</span>
          </article>
        </div>
      `;
    }

    function renderTeacherDashboard(todayRecords, evidenceRecords) {
      const demoStudents = [
        { name: "生徒", subject: "数学", status: evidenceRecords.length ? "提出済" : "未提出", tone: evidenceRecords.length ? "done" : "missing" },
        { name: "○○君", subject: "英語", status: "終了", tone: "done" },
        { name: "△△さん", subject: "物理", status: "確認テスト待ち", tone: "waiting" },
        { name: "□□君", subject: "数学", status: "未提出", tone: "missing" }
      ];
      roleDashboard.innerHTML = `
        <div class="role-dashboard-grid">
          <article class="dashboard-card highlight">
            <strong>担当生徒</strong>
            <span>${demoStudents.length}名 / 今日の提出 ${evidenceRecords.length}件</span>
          </article>
          <article class="dashboard-card">
            <strong>確認待ち</strong>
            <span>${demoStudents.filter((student) => student.tone === "waiting" || student.tone === "missing").length}件。提出画像を見て次の指示を決めます。</span>
          </article>
          <article class="dashboard-card">
            <strong>今日の運用</strong>
            <span>未提出のカードは後日にずらし、提出済みカードは次の講義へ進めます。</span>
          </article>
        </div>
        <div class="student-status-list">
          ${demoStudents.map((student) => `
            <div class="student-status-row">
              <div>
                <strong>${escapeHtml(student.name)}</strong>
                <span>${escapeHtml(student.subject)} / ${student.name === "生徒" ? `${todayRecords.length}件記録` : "デモ表示"}</span>
              </div>
              <span class="status-pill ${student.tone}">${escapeHtml(student.status)}</span>
            </div>
          `).join("")}
        </div>
      `;
    }

    function renderLongPlan() {
      if (!longPlanList) return;
      longPlanList.innerHTML = "";
      (courseRoute.long_plan || []).forEach((item) => {
        const card = document.createElement("article");
        card.className = "plan-card";
        card.innerHTML = `
          <strong>${item.subject}</strong>
          <span>${item.goal}</span>
          <div class="route-pills">${(item.route || []).map((step) => `<span>${step}</span>`).join("")}</div>
        `;
        longPlanList.appendChild(card);
      });
    }

    function renderWeekPlan() {
      if (!weekPlanList) return;
      weekPlanList.innerHTML = "";
      (courseRoute.week_plan || []).forEach((item) => {
        const card = document.createElement("article");
        card.className = "plan-card week-route-card";
        card.innerHTML = `
          <strong>${item.day}</strong>
          <span>${item.target}</span>
          <div>${item.check}</div>
        `;
        weekPlanList.appendChild(card);
      });
    }

    function levelTaskLabel(level) {
      if (level === "Basic") return "基礎";
      if (level === "Standard") return "標準";
      if (level === "Challenge") return "応用";
      return level;
    }

    function formatMinutes(minutes) {
      const safeMinutes = Number(minutes || 0);
      const hours = Math.floor(safeMinutes / 60);
      const mins = safeMinutes % 60;
      if (!hours) return `${mins}分`;
      if (!mins) return `${hours}時間`;
      return `${hours}時間${mins}分`;
    }

    function renderReverseProgress() {
      const days = dateDaysUntil(reverseProgress.goal_date);
      document.querySelector("#paceGoalBadge").textContent = `${reverseProgress.goal_label || "8月末ゴール"}まで あと${days}日`;
      paceList.innerHTML = "";
      reverseProgress.subjects.forEach((item) => {
        const card = document.createElement("article");
        card.className = "pace-card";
        card.innerHTML = `
          <div class="mission-head">
            <div>
              <strong>${item.subject}</strong>
              <span>残り${item.target_unit}: ${item.remaining_units} / 必要ペース: 1日 ${item.required_per_day} ${item.target_unit}</span>
            </div>
            <span class="status-chip">${item.status}</span>
          </div>
          <div class="pace-summary">
            <div class="load-card"><strong>${item.today_target}</strong><span>今日の目標</span></div>
            <div class="load-card"><strong>${formatMinutes(item.planned_video_minutes)}</strong><span>視聴予定</span></div>
            <div class="load-card"><strong>${formatMinutes(item.planned_practice_minutes)}</strong><span>演習・確認</span></div>
            <div class="load-card"><strong>${formatMinutes((item.planned_review_minutes || 0) + (item.planned_memory_minutes || 0))}</strong><span>復習・暗記</span></div>
          </div>
          <span>${item.status_note}</span>
        `;
        paceList.appendChild(card);
      });
    }

    function renderStudyLoad() {
      const load = reverseProgress.study_load || {};
      const schedule = todayScheduleLoad();
      document.querySelector("#loadTotalBadge").textContent = `時間割 ${formatMinutes(schedule.totalMinutes)} / 終了 ${schedule.end || "--:--"}`;
      const rows = [
        ["今日の時間割", schedule.totalMinutes],
        ["映像視聴", load.video_minutes],
        ["演習・確認", load.practice_minutes],
        ["復習", load.review_minutes],
        ["暗記", load.memory_minutes]
      ];
      studyLoadGrid.innerHTML = "";
      rows.forEach(([label, minutes]) => {
        const card = document.createElement("div");
        card.className = "load-card";
        card.innerHTML = `<strong>${formatMinutes(minutes)}</strong><span>${label}</span>`;
        studyLoadGrid.appendChild(card);
      });
    }

    function todayScheduleLoad() {
      const coveredSubjects = new Set();
      let totalMinutes = 0;
      let end = "";
      (coursePacing.home_blocks || []).forEach((block) => {
        totalMinutes += Number(block.total_minutes || 0);
        const range = parseTimeRange(block.time);
        if (range.end) end = laterTime(end, range.end);
        (block.units || []).forEach((unit) => coveredSubjects.add(unit.subject));
      });
      (dailyPlan.missions || [])
        .filter((mission) => !coveredSubjects.has(mission.subject))
        .forEach((mission) => {
          const range = parseTimeRange(mission.time);
          totalMinutes += range.minutes;
          if (range.end) end = laterTime(end, range.end);
        });
      return { totalMinutes, end };
    }

    function parseTimeRange(value) {
      const match = String(value || "").match(/(\d{1,2}):(\d{2})\s*[-〜]\s*(\d{1,2}):(\d{2})/);
      if (!match) return { minutes: 0, end: "" };
      const start = Number(match[1]) * 60 + Number(match[2]);
      const endMinutes = Number(match[3]) * 60 + Number(match[4]);
      const minutes = Math.max(0, endMinutes - start);
      return { minutes, end: `${match[3].padStart(2, "0")}:${match[4]}` };
    }

    function laterTime(a, b) {
      if (!a) return b;
      const toMinutes = (time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
      };
      return toMinutes(b) > toMinutes(a) ? b : a;
    }

    function renderProgress() {
      const missionTotal = dailyPlan.missions.length;
      const cleared = dailyPlan.missions.filter((mission) => getMissionRecord(mission.id)).length;
      const rate = missionTotal ? Math.round((cleared / missionTotal) * 100) : 0;
      document.querySelector("#todayRate").textContent = `${rate}%`;
      document.querySelector("#remainingCount").textContent = String(Math.max(0, missionTotal - cleared));
      document.querySelector("#recordCount").textContent = String(records.length);
      subjectBars.innerHTML = "";
      const subjects = [...new Set(dailyPlan.missions.map((mission) => mission.subject))];
      subjects.forEach((subject) => {
        const missions = dailyPlan.missions.filter((mission) => mission.subject === subject);
        const done = missions.filter((mission) => getMissionRecord(mission.id)).length;
        const subjectRate = missions.length ? Math.round((done / missions.length) * 100) : 0;
        const row = document.createElement("div");
        row.className = "bar-row";
        row.innerHTML = `
          <div class="bar-label"><span>${subject}</span><span>${subjectRate}%</span></div>
          <div class="bar"><i style="--value: ${subjectRate}%"></i></div>
        `;
        subjectBars.appendChild(row);
      });
    }

    function renderReviews() {
      reviewList.innerHTML = "";
      const intervals = reviewSchedule.review_intervals_days || [1, 3, 7, 14, 30];
      const intervalCard = document.createElement("div");
      intervalCard.className = "review-card";
      intervalCard.innerHTML = `<strong>復習タイミング</strong><span>${intervals.map((day) => `${day}日後`).join(" / ")}</span><div>確認テスト・復習テスト・AI確認テストの結果をもとに次の段階で自動生成します。</div>`;
      reviewList.appendChild(intervalCard);
      dailyPlan.review_missions.forEach((review) => {
        const card = document.createElement("div");
        card.className = "review-card";
        card.innerHTML = `<strong>${review.label}</strong><span>${review.subject} ${review.lesson} ${review.part}</span><div>${review.title}</div>`;
        reviewList.appendChild(card);
      });
    }

    function renderMemory() {
      const target = memoryData.today_target || {};
      const summary = [
        ["単語", `${target.words || 0}語`],
        ["基本文", `${target.sentences || 0}文`],
        ["構文", `${target.structures || 0}文`],
        ["チェック", (target.checks || []).join(" / ")]
      ];
      memorySummary.innerHTML = "";
      summary.forEach(([label, value]) => {
        const card = document.createElement("div");
        card.className = "load-card";
        card.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
        memorySummary.appendChild(card);
      });
      memoryList.innerHTML = "";
      memoryData.items.slice(0, 6).forEach((item) => {
        const result = memoryResults[item.id] || "未チェック";
        const card = document.createElement("article");
        card.className = "memory-card";
        card.innerHTML = `
          <strong>${item.front}</strong>
          <span>${item.type} / ${item.source} / ${item.level}</span>
          <div class="mission-note">答え: ${item.back}</div>
          <div class="memory-actions" aria-label="${item.front}の暗記判定">
            <button type="button" data-result="○">○</button>
            <button type="button" data-result="△" class="secondary">△</button>
            <button type="button" data-result="×" class="warning">×</button>
            <span class="badge">判定: ${result}</span>
          </div>
        `;
        card.querySelectorAll("button").forEach((button) => {
          button.addEventListener("click", () => {
            memoryResults[item.id] = button.dataset.result;
            saveMemoryResults();
            renderMemory();
          });
        });
        memoryList.appendChild(card);
      });
    }

    function renderRetentionTests() {
      retentionList.innerHTML = "";
      reviewSchedule.retention_tests.forEach((test) => {
        const card = document.createElement("article");
        card.className = "retention-card";
        card.innerHTML = `
          <strong>${test.subject} ${test.lesson} ${test.part}</strong>
          <span>${test.source} / ${(test.format || []).join(" / ")}</span>
          <div>${test.prompt}</div>
        `;
        retentionList.appendChild(card);
      });
    }

    function renderSettings() {
      if (!settingsList) return;
      const settings = [
        {
          title: "Firebase Storage + Firestore",
          body: `${firebaseBridge.message} 現在の保存先: ${firebaseBridge.enabled ? `Firebase / student_id=${firebaseBridge.studentId}` : "localStorage"}`
        },
        {
          title: "メール通知設定",
          body: "保護者、サポーター、塾講師への提出通知先を管理します。Phase1はmailto作成、Phase2はサーバー送信へ移行します。"
        },
        {
          title: "Firebase Authentication",
          body: "uid、email、displayName、role、linked_student_id、created_at、last_login_at、login_count、statusをユーザー単位で管理します。"
        },
        {
          title: "Firestore users / login_logs",
          body: "users/{uid} にユーザー情報、login_logs/{log_id} にログイン履歴を保存する設計です。counselorは表面上サポーター属性でもDB上は独立ロールとして保持できます。"
        },
        {
          title: "外部アプリ連携設定",
          body: "英単語アプリなどのCSV、スクリーンショット、手動入力を管理します。Homeには表示しません。"
        },
        {
          title: "OCR設定",
          body: "確認テスト結果スクショから回答数と正答率を読み取る準備項目です。Phase1では手入力を維持します。"
        },
        {
          title: "AI Teacher API設定",
          body: "OpenAI APIキーはブラウザに置かず、Cloud FunctionsまたはAPIサーバーの環境変数で保持します。"
        },
        {
          title: "英文300選 Grammar Link",
          body: "英文300選は各英文を文法タグ、構文、難度、出題形式、関連する映像授業IDでDB化し、Today's Memory、AI Check、復習Missionへつなげる設計です。Phase1は管理方針、Phase2でOCR・構文解析・講座紐付けを実装します。"
        },
        {
          title: "確認テスト合格後の上位類題",
          body: "確認テスト画像または正答率が合格基準を超えた場合、同じ学習ポイントの一段上の類題をAI Teacherで作る設計です。Phase1は提案表示、Phase2はサーバーAPIで生成します。教材本文の複製ではなく、学習ポイントを抽象化したオリジナル問題を作ります。"
        },
        {
          title: "管理者用設定",
          body: "教材DB、Exam DB、権限、通知、AI接続、外部連携を管理者画面に集約します。"
        }
      ];
      settingsList.innerHTML = "";
      settings.forEach((item) => {
        const card = document.createElement("article");
        card.className = "settings-card";
        card.innerHTML = `<strong>${item.title}</strong><span>${item.body}</span>`;
        settingsList.appendChild(card);
      });
      const startDateCard = document.createElement("article");
      startDateCard.className = "settings-card";
      startDateCard.innerHTML = `
        <strong>学習開始日</strong>
        <span>ホームの「何日目」は、この開始日から数えます。検証版の既定日は2026-07-08です。</span>
        <form class="external-form" id="studyStartForm">
          <input id="studyStartDateInput" aria-label="学習開始日" type="date" value="${escapeHtml(studyStartDate)}" required>
          <button type="submit">開始日を保存</button>
        </form>
      `;
      settingsList.appendChild(startDateCard);
      startDateCard.querySelector("#studyStartForm")?.addEventListener("submit", (event) => {
        event.preventDefault();
        saveStudyStartDate(startDateCard.querySelector("#studyStartDateInput")?.value);
      });
      const countdownCard = document.createElement("article");
      countdownCard.className = "settings-card";
      const customRows = customCountdowns.length
        ? customCountdowns
            .slice()
            .sort((a, b) => dateDaysUntil(a.countdown_target || a.date_start) - dateDaysUntil(b.countdown_target || b.date_start))
            .map((item) => {
              const target = item.countdown_target || item.date_start;
              return `
                <div class="custom-countdown-row">
                  <div>
                    <strong>${escapeHtml(item.exam_name || "短期目標")}</strong>
                    <span>${escapeHtml(target)} / あと${dateDaysUntil(target)}日 / 登録: ${escapeHtml(ROLES[item.created_by_role]?.label || "登録者不明")} / ${escapeHtml(item.notes || "短期目標")}</span>
                  </div>
                  ${canDeleteSchedule(item, firebaseBridge.currentUser, currentRole) ? `<button type="button" class="warning" data-delete-countdown="${escapeHtml(item.id)}">削除</button>` : ""}
                </div>
              `;
            })
            .join("")
        : `<div class="custom-countdown-row"><div><strong>未登録</strong><span>定期テスト、模試、提出期限などを追加できます。</span></div></div>`;
      countdownCard.innerHTML = `
        <strong>短期目標カウントダウン</strong>
        <span>定期テスト、模試、到達度テスト、面談日などを自由に追加できます。近い3件は上部のカウントダウンに表示します。</span>
        <form class="external-form" id="customCountdownForm">
          <input id="customCountdownName" name="scheduleName" aria-label="短期目標名" placeholder="例: 7月英語到達度テスト" required>
          <input id="customCountdownDate" name="scheduleDate" aria-label="目標日" type="date" required>
          <input id="customCountdownNotes" name="scheduleNotes" aria-label="メモ" placeholder="例: 英文300選 No.1-60">
          <button type="submit">追加</button>
        </form>
        <div class="custom-countdown-list">${customRows}</div>
      `;
      settingsList.appendChild(countdownCard);
      countdownCard.querySelector("#customCountdownForm")?.addEventListener("submit", addCustomCountdown);
      countdownCard.querySelectorAll("[data-delete-countdown]").forEach((button) => {
        button.addEventListener("click", () => deleteCustomCountdown(button.dataset.deleteCountdown));
      });
    }

    function renderExternalProgress() {
      externalList.innerHTML = "";
      externalProgress.apps.forEach((app, index) => {
        const weakItems = Array.isArray(app.weak_items) ? app.weak_items.join(", ") : app.weak_items || "";
        const card = document.createElement("article");
        card.className = "external-card";
        card.innerHTML = `
          <strong>${app.app_name}</strong>
          <span>今日の学習: ${app.studied_count}語 / 正答率: ${app.accuracy}%</span>
          <div>苦手単語: ${weakItems}</div>
          <div class="mission-note">LIMIT BREAKへの反映: ${app.reflection || "明日の暗記に反映"}</div>
          <div class="external-form">
            <input aria-label="今日の学習語数" type="number" min="0" value="${app.studied_count}" data-field="studied_count">
            <input aria-label="正答率" type="number" min="0" max="100" value="${app.accuracy}" data-field="accuracy">
            <input aria-label="苦手単語" value="${weakItems}" data-field="weak_items">
            <button type="button">保存</button>
          </div>
        `;
        card.querySelector("button").addEventListener("click", () => {
          const inputs = card.querySelectorAll("input");
          inputs.forEach((input) => {
            if (input.dataset.field === "studied_count") app.studied_count = Number(input.value || 0);
            if (input.dataset.field === "accuracy") app.accuracy = Number(input.value || 0);
            if (input.dataset.field === "weak_items") app.weak_items = input.value.split(",").map((item) => item.trim()).filter(Boolean);
          });
          app.last_imported_at = todayKey();
          externalProgress.apps[index] = app;
          saveExternalProgress();
          renderExternalProgress();
        });
        externalList.appendChild(card);
      });
    }

    function renderAiTeacher() {
      const latest = aiTeacherLog[aiTeacherLog.length - 1];
      const response = latest ? latest.response : aiTeacherConfig.fixed_responses.coach;
      teacherChat.innerHTML = `
        <div class="teacher-card">
          <strong>Yui Teacher / Coach / Analyzer</strong>
          <span>学習内容・回答数・正答率・疲労度・復習期限・暗記データを使う想定です。</span>
          <p class="teacher-response">${response}</p>
          <div class="teacher-actions-row">
            <button type="button" data-action="teacher">3分チェック問題</button>
            <button type="button" data-action="coach" class="secondary">励まし</button>
            <button type="button" data-action="analyzer" class="secondary">先生向け要約</button>
          </div>
        </div>
        <div class="teacher-card api-policy">
          <strong>APIキー保護</strong>
          <span>正式版ではOpenAI APIキーをブラウザに置かず、Firebase Cloud FunctionsまたはAPIサーバーの環境変数で保持します。</span>
        </div>
      `;
      teacherChat.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => runAiTeacher(button.dataset.action));
      });
    }

    function runAiTeacher(action, mission) {
      const fixed = aiTeacherConfig.fixed_responses || FALLBACK_AI_TEACHER.fixed_responses;
      const missionLabel = mission ? `${mission.subject} ${mission.lesson} ${mission.part}` : "今日の学習";
      const responses = {
        teacher: `${missionLabel}: ${fixed.teacher}`,
        check: `${missionLabel}: AI確認テストは、教材の確認問題と同じ狙いで作るオリジナル類題です。まず解き方を説明し、そのあと1問だけ自力で確認しましょう。`,
        coach: fixed.coach,
        analyzer: fixed.analyzer
      };
      aiTeacherLog.push({
        action,
        missionId: mission ? mission.id : "",
        response: responses[action] || fixed.coach,
        savedAt: new Date().toISOString()
      });
      saveAiTeacherLog();
      renderAiTeacher();
    }

    function renderCounselorSupport() {
      const role = activeRoleConfig();
      const notes = (counselorNotes.counselor_notes || []).filter((note) => {
        if (currentRole === "supporter" && currentSupportType === "psychological_counselor") return true;
        return (note.visibility || []).includes(currentRole);
      });
      const latestRecords = [...records].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, 3);
      const loadWarning = latestRecords.some((record) => Number(record.fatigue) >= 4);
      counselorList.innerHTML = "";

      const summary = document.createElement("article");
      summary.className = "counselor-card";
      summary.innerHTML = `
          <strong>見守りサマリー</strong>
        <span>医療行為・診断ではなく、学習継続、声かけ、心理的安全性の支援に限定します。</span>
        <div>${role.showFatigue ? `学習負荷: ${loadWarning ? "疲労度高め。休憩を優先" : "通常範囲"}` : "必要な声かけ情報だけを表示します。"}</div>
      `;
      counselorList.appendChild(summary);

      if (currentRole === "parent") {
        const parentCard = document.createElement("article");
        parentCard.className = "counselor-card";
        parentCard.innerHTML = `<strong>専門サポーターからの助言</strong><span>本人を追い詰めない声かけを優先してください。</span>`;
        counselorList.appendChild(parentCard);
      }

      if (currentRole === "teacher") {
        const teacherCard = document.createElement("article");
        teacherCard.className = "counselor-card";
        teacherCard.innerHTML = `<strong>講師向け注意点</strong><span>学習負荷・疲労度・声かけ注意点を確認し、追加課題より継続可能性を優先してください。</span>`;
        counselorList.appendChild(teacherCard);
      }

      notes.forEach((note) => {
        const card = document.createElement("article");
        card.className = "counselor-card";
        card.innerHTML = `
          <strong>${note.category} / ${note.risk_level}</strong>
          <span>公開範囲: ${(note.visibility || []).join(" / ")} / ${note.created_at}</span>
          <div>${escapeHtml(note.body)}</div>
        `;
        counselorList.appendChild(card);
      });

      if (!notes.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "表示対象の専門サポートコメントはありません。";
        counselorList.appendChild(empty);
      }

      if (role.canPostCounselorNote) {
        const formCard = document.createElement("article");
        formCard.className = "counselor-card";
        formCard.innerHTML = `
          <strong>支援コメント</strong>
          <span>公開範囲を選び、学習継続と心理的安全性の支援に限定して投稿します。</span>
          <div class="field" style="margin-top: 10px;">
            <label for="counselorCategory">カテゴリ</label>
            <select id="counselorCategory">
              <option value="mental_support">メンタル面コメント</option>
              <option value="parent_advice">保護者への声かけ助言</option>
              <option value="teacher_care">講師への配慮コメント</option>
              <option value="weekly_observation">週間メンタル所見</option>
              <option value="load_warning">学習負荷への警告</option>
              <option value="admin_suggestion">adminへの改善提案</option>
            </select>
          </div>
          <div class="field" style="margin-top: 10px;">
            <label for="counselorRisk">リスクレベル</label>
            <select id="counselorRisk">
              <option value="normal">normal</option>
              <option value="watch">watch</option>
              <option value="urgent">urgent</option>
            </select>
          </div>
          <div class="field" style="margin-top: 10px;">
            <label for="counselorBody">コメント</label>
            <textarea id="counselorBody" placeholder="例: 今週は学習量が増えています。睡眠と休憩も評価してください。"></textarea>
          </div>
          <div class="visibility-grid" aria-label="コメント公開範囲">
            <label><input type="checkbox" value="student" checked> 本人</label>
            <label><input type="checkbox" value="parent" checked> 保護者</label>
            <label><input type="checkbox" value="teacher" checked> 講師</label>
            <label><input type="checkbox" value="admin" checked> admin</label>
          </div>
          <div class="mission-actions" style="margin-top: 10px;">
            <button type="button" id="saveCounselorNoteButton">コメント投稿</button>
          </div>
        `;
        counselorList.appendChild(formCard);
        formCard.querySelector("#saveCounselorNoteButton").addEventListener("click", saveCounselorNoteFromForm);
      }

      const notice = document.createElement("div");
      notice.className = "limited";
      notice.textContent = counselorNotes.policy ? counselorNotes.policy.emergency_notice : FALLBACK_COUNSELOR_NOTES.policy.emergency_notice;
      counselorList.appendChild(notice);
    }

    function saveCounselorNoteFromForm() {
      const body = document.querySelector("#counselorBody").value.trim();
      if (!body) return;
      const visibility = Array.from(document.querySelectorAll(".visibility-grid input:checked")).map((input) => input.value);
      const note = {
        note_id: `COUNSELOR_NOTE_${String(Date.now()).slice(-8)}`,
        student_id: "STU_0001",
        created_by: "USER_COUNSELOR_LOCAL",
        visibility,
        category: document.querySelector("#counselorCategory").value,
        body,
        risk_level: document.querySelector("#counselorRisk").value,
        created_at: new Date().toISOString()
      };
      counselorNotes.counselor_notes = [note, ...(counselorNotes.counselor_notes || [])];
      saveCounselorNotes();
      renderCounselorSupport();
    }

    function renderExamList() {
      examList.innerHTML = "";
      allCountdownTargets().forEach((exam) => {
        const card = document.createElement("div");
        card.className = "exam-card";
        const customAction = exam.source === "custom" && canDeleteSchedule(exam, firebaseBridge.currentUser, currentRole)
          ? `<button type="button" class="warning" data-delete-countdown="${escapeHtml(exam.custom_id)}">削除</button>`
          : "";
        card.innerHTML = `
          <strong>${escapeHtml(exam.exam_name)}</strong>
          <span>${escapeHtml(exam.date_start)}${exam.date_end && exam.date_end !== exam.date_start ? " - " + escapeHtml(exam.date_end) : ""} / あと${dateDaysUntil(exam.countdown_target)}日${exam.source === "custom" ? " / 短期目標" : ""}</span>
          <div>${escapeHtml(exam.notes)}</div>
          ${customAction}
        `;
        examList.appendChild(card);
      });
      examList.querySelectorAll("[data-delete-countdown]").forEach((button) => {
        button.addEventListener("click", () => deleteCustomCountdown(button.dataset.deleteCountdown));
      });
    }

    function renderSummerPlan() {
      document.querySelector("#summerPeriodLabel").textContent = `${summerPlan.date_start} - ${summerPlan.date_end}`;
      document.querySelector("#summerGoal").textContent = summerPlan.goal;
      summerWeekList.innerHTML = "";
      summerPlan.weeks.slice(0, 9).forEach((week) => {
        const card = document.createElement("div");
        card.className = "week-card";
        card.innerHTML = `<strong>Week ${week.week}: ${week.focus}</strong><span>${week.range}</span><div>${(week.daily_missions || []).join(" / ")}</div>`;
        summerWeekList.appendChild(card);
      });
    }

    function renderLevelTasks() {
      levelList.innerHTML = "";
      levelTasks.levels.forEach((level) => {
        const card = document.createElement("div");
        card.className = "level-card";
        card.innerHTML = `<strong>${level.level}</strong><span>${level.purpose}</span><div>${level.evidence || ""}</div>`;
        levelList.appendChild(card);
      });
    }

    function renderMaterials() {
      const subjects = [...new Set(materialsCatalog.materials.map((item) => item.subject))];
      const outlineCards = (materialsOutline.materials || []).slice(0, 8).map((item) => `
        <div class="material-card">
          <strong>${item.subject} / ${item.course_name}</strong>
          <span>${item.page_count || "-"}ページ / 目次確認 ${item.observed_lessons || "-"}講</span>
          <div>${(item.sample_outline || []).slice(0, 4).join(" / ")}</div>
        </div>
      `).join("");
      const balanceCards = (subjectBalance.groups || []).map((group) => `
        <div class="material-card">
          <strong>${group.group}: ${group.subjects.join(" + ")}</strong>
          <span>配分 ${group.ratio} / 週 ${group.weekly_slots || "-"}コマ</span>
          <div>${group.status || subjectBalance.policy}</div>
        </div>
      `).join("");
      materialList.innerHTML = `
        <div class="material-card">
          <strong>${materialsCatalog.materials.length}教材をカタログ化</strong>
          <span>${subjects.join(" / ")}</span>
          <div>${materialsCatalog.principle}</div>
        </div>
        <div class="material-card">
          <strong>理科・社会配分</strong>
          <span>${subjectBalance.policy}</span>
          <div>国語・世界史は教材アップロード後に講座DBへ追加します。</div>
        </div>
        ${balanceCards}
        <div class="material-card">
          <strong>教材アウトライン抽出</strong>
          <span>${materialsOutline.extraction_method}</span>
          <div>${materialsOutline.status_note}</div>
        </div>
        ${outlineCards}
      `;
    }

    function renderPermissions() {
      const role = activeRoleConfig();
      const supportType = SUPPORTER_TYPES.find((type) => type.value === currentSupportType);
      permissionList.innerHTML = `
        <div class="permission-card"><strong>${role.label}ログイン${currentRole === "supporter" && supportType ? ` / ${supportType.label}` : ""}</strong><span>${role.headline}</span></div>
        <div class="permission-card"><strong>表示</strong><span>${permissionText(role)}</span></div>
      `;
      if (currentRole === "parent") {
        permissionList.innerHTML += `<div class="limited">本人だけの内省メモと、過度にプレッシャーになる情報は表示しません。</div>`;
      }
      if (currentRole === "supporter") {
        permissionList.innerHTML += `<div class="limited">詳細な成績、疲労度、個人メモは表示しません。応援に必要な情報だけを表示します。</div>`;
      }
      if (currentRole === "supporter" && currentSupportType === "psychological_counselor") {
        permissionList.innerHTML += `<div class="limited">心理カウンセラー属性です。医療行為・診断ではありません。学習継続、声かけ、心理的安全性の支援に限定し、緊急性がある内容は専門機関への連絡を優先します。</div>`;
      }
    }

    function permissionText(role) {
      const items = [];
      items.push(role.showMissionDetail ? "今日の学習詳細" : "学習達成率");
      if (role.showScore === true) items.push("回答数・正答率");
      if (role.showScore === "summary") items.push("正答率推移の要約");
      if (role.showFatigue === true) items.push("疲労度");
      if (role.showFatigue === "summary") items.push("疲労傾向");
      if (role.showMentalState === true) items.push("自己申告メンタル状態");
      if (role.showMentalState === "summary") items.push("メンタル状態の要約");
      if (role.showMistake) items.push("間違い理由");
      if (role.showPrivateNote) items.push("内省メモ");
      return items.join(" / ");
    }

    function notificationMethodLabel(method) {
      return {
        email: "メール",
        line: "LINE",
        phone: "携帯/SMS",
        other: "その他"
      }[method] || method;
    }

    function noticeRecipientSummary(recipients) {
      if (!recipients.length) return "この役割の通知先は未設定です。";
      return recipients.map((recipient) => {
        const methods = (recipient.methods || ["email"]).map(notificationMethodLabel).join(" / ");
        const destinations = [
          recipient.email ? `メール: ${recipient.email}` : "",
          recipient.line ? `LINE: ${recipient.line}` : "",
          recipient.phone ? `携帯/SMS: ${recipient.phone}` : "",
          recipient.other ? `その他: ${recipient.other}` : ""
        ].filter(Boolean).join("、");
        return `${recipient.label} (${methods})${destinations ? ` - ${destinations}` : ""}`;
      }).join(" / ");
    }

    function saveVisibleNoticeContactsFromPanel() {
      const normalized = normalizeNoticeContacts(noticeContacts);
      visibleNoticeContacts().forEach((visible) => {
        const target = normalized.recipients.find((contact) => contact.role === visible.role);
        if (!target) return;
        ["email", "line", "phone", "other"].forEach((field) => {
          const input = notificationPanel.querySelector(`[data-notice-role="${visible.role}"][data-notice-field="${field}"]`);
          if (input) target[field] = input.value.trim();
        });
        const methods = Array.from(notificationPanel.querySelectorAll(`[data-notice-role="${visible.role}"][data-notice-method]:checked`))
          .map((input) => input.dataset.noticeMethod);
        target.methods = methods.length ? methods : ["email"];
      });
      noticeContacts = normalized;
      saveNoticeContacts();
      renderNotificationPanel();
    }

    function renderNotificationPanel() {
      noticeContacts = normalizeNoticeContacts(noticeContacts);
      const contacts = visibleNoticeContacts();
      const latest = [...noticeQueue].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
      notificationPanel.innerHTML = `
        <div class="permission-card">
          <strong>自分の通知設定</strong>
          <span>この画面では、ログイン中の役割に対応する自分の連絡先だけを表示します。他の保護者・サポーター・講師のアドレスは表示しません。</span>
          <div class="form-grid" style="margin-top: 10px;">
            ${contacts.map((contact) => `
              <div class="field">
                <label>${contact.label}のメール</label>
                <input type="email" value="${escapeHtml(contact.email || "")}" data-notice-role="${contact.role}" data-notice-field="email" placeholder="${contact.label}のメールアドレス">
              </div>
              <div class="field">
                <label>${contact.label}のLINE</label>
                <input value="${escapeHtml(contact.line || "")}" data-notice-role="${contact.role}" data-notice-field="line" placeholder="LINE ID または連絡メモ">
              </div>
              <div class="field">
                <label>${contact.label}の携帯/SMS</label>
                <input value="${escapeHtml(contact.phone || "")}" data-notice-role="${contact.role}" data-notice-field="phone" placeholder="携帯番号またはSMS連絡先">
              </div>
              <div class="field">
                <label>${contact.label}のその他</label>
                <input value="${escapeHtml(contact.other || "")}" data-notice-role="${contact.role}" data-notice-field="other" placeholder="例: Slack / Chatwork / 学校連絡">
              </div>
              <div class="field">
                <label>通知方法</label>
                <div class="notice-methods">
                  ${["email", "line", "phone", "other"].map((method) => `
                    <label>
                      <input type="checkbox" data-notice-role="${contact.role}" data-notice-method="${method}" ${(contact.methods || []).includes(method) ? "checked" : ""}>
                      ${notificationMethodLabel(method)}
                    </label>
                  `).join("")}
                </div>
              </div>
            `).join("")}
          </div>
          <button class="secondary" type="button" id="saveNoticeContactsButton">通知先を保存</button>
        </div>
        <div class="permission-card">
          <strong>通知方式</strong>
          <span>検証版はメールのみ手動作成できます。LINE、携帯/SMS、その他は連絡先の保存まで対応し、正式版でCloud Functionsや外部サービス連携へ移行します。</span>
          <div>画像本体は通知に添付せず、提出があった事実、回答数、正答率、アプリ内確認導線を通知します。</div>
        </div>
        ${latest.length ? latest.map((notice) => renderNoticeCard(notice)).join("") : `<div class="empty">まだ提出通知はありません。</div>`}
      `;
      const saveButton = document.querySelector("#saveNoticeContactsButton");
      if (saveButton) {
        saveButton.addEventListener("click", saveVisibleNoticeContactsFromPanel);
      }
      notificationPanel.querySelectorAll("[data-notice-id]").forEach((button) => {
        button.addEventListener("click", () => markNoticeSent(button.dataset.noticeId));
      });
    }

    function renderNoticeCard(notice) {
      const visibleRoles = visibleNoticeContacts().map((contact) => contact.role);
      const recipients = (notice.recipients || [])
        .filter((recipient) => visibleRoles.includes(recipient.role))
        .map((recipient) => {
          const liveContact = (noticeContacts.recipients || []).find((contact) => contact.role === recipient.role) || {};
          return { ...recipient, ...liveContact };
        });
      const emailRecipients = recipients.filter((recipient) => recipient.email);
      const mailto = buildMailto(notice, emailRecipients);
      return `
        <div class="permission-card">
          <strong>${notice.missionTitle}</strong>
          <span>${notice.date} / ${notice.subject} / ${notice.testType} / 回答数 ${notice.answeredCount || "-"} / 正答率 ${notice.score ? `${notice.score}%` : "-"}</span>
          <div>結果スクショ: ${notice.evidenceImageName} / 判定: ${notice.autoGradingStatusLabel}</div>
          <div>通知設定: ${noticeRecipientSummary(recipients)}</div>
          <div class="form-actions" style="margin-top: 10px;">
            ${emailRecipients.length ? `<a class="secondary" href="${mailto}">メール作成</a>` : `<span class="limited">メール未設定</span>`}
            <button type="button" data-notice-id="${notice.noticeId}">${notice.sentAt ? "送信済み" : "送信済みにする"}</button>
          </div>
        </div>
      `;
    }

    function createSubmissionNotice(record) {
      const recipients = normalizeNoticeContacts(noticeContacts).recipients.map((recipient) => ({
        role: recipient.role,
        label: recipient.label,
        email: recipient.email || "",
        line: recipient.line || "",
        phone: recipient.phone || "",
        other: recipient.other || "",
        methods: recipient.methods || ["email"]
      }));
      const notice = {
        noticeId: `NOTICE_${Date.now()}`,
        recordKey: `${record.date}_${record.missionId}`,
        date: record.date,
        missionTitle: record.missionTitle,
        subject: record.subject,
        course: record.course,
        lesson: record.lesson,
        part: record.part,
        testType: record.testType,
        answeredCount: record.answeredCount,
        score: record.score,
        understanding: record.understanding,
        fatigue: record.fatigue,
        evidenceImageName: record.evidenceImageName,
        autoGradingStatusLabel: "検証版: スタサプ結果スクショを受領。OCR自動読取は正式版で実装",
        recipients,
        createdAt: new Date().toISOString(),
        sentAt: ""
      };
      noticeQueue = [notice, ...noticeQueue.filter((item) => item.recordKey !== notice.recordKey)].slice(0, 30);
      saveNoticeQueue();
    }

    function buildMailto(notice, recipients) {
      const to = recipients.map((recipient) => recipient.email).join(",");
      const subject = `LIMIT BREAK 提出通知: ${notice.subject} ${notice.testType}`;
      const body = [
        "スタサプ確認テスト結果スクショが提出されました。",
        "",
        `日付: ${notice.date}`,
        `学習内容: ${notice.missionTitle}`,
        `科目: ${notice.subject}`,
        `教材: ${notice.course}`,
        `範囲: ${notice.lesson} ${notice.part}`,
        `テスト種別: ${notice.testType}`,
        `回答数: ${notice.answeredCount || "-"}`,
        `正答率: ${notice.score ? `${notice.score}%` : "-"}`,
        `理解度: ${notice.understanding || "-"}`,
        `疲労度: ${notice.fatigue || "-"}`,
        `結果スクショファイル名: ${notice.evidenceImageName}`,
        "",
        "検証版では画像本体は端末内保存です。画面の「最近の記録」で提出内容を確認してください。",
        "正式版ではサーバー側OCR/画像解析で回答数と正答率を自動読取します。"
      ].join("\n");
      return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function markNoticeSent(noticeId) {
      noticeQueue = noticeQueue.map((notice) => notice.noticeId === noticeId ? { ...notice, sentAt: new Date().toISOString() } : notice);
      saveNoticeQueue();
      renderNotificationPanel();
    }

    async function handleRandomEvidenceSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const status = form.querySelector("#randomEvidenceStatus");
      const submitButton = form.querySelector("#randomEvidenceSubmitButton");
      const evidenceFile = form.querySelector("#randomEvidenceImage").files[0];
      if (!evidenceFile) {
        status.textContent = "確認テスト画像を選んでください。";
        form.querySelector("#randomEvidenceImage").focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "画像を処理中...";
      status.textContent = "画像を読み込んでいます...";

      try {
        const submittedAt = new Date().toISOString();
        const dateKey = todayJapanKey();
        const subject = "AI解析待ち";
        const course = "AI解析待ち";
        const lesson = "";
        const unit = "";
        const testType = "AI画像確認テスト";
        const missionTitle = `AI画像解析 ${evidenceFile.name}`;
        const evidenceImageData = await fileToDataUrl(evidenceFile);

        let submittedRecord = {
          date: dateKey,
          day: dailyPlan.day,
          missionId: `random_${Date.now()}`,
          missionTitle,
          subject,
          course,
          lesson,
          part: unit,
          testType,
          checkItem: "ランダム確認テスト",
          levelTask: "到達度判定",
          answeredCount: "",
          score: "",
          understanding: "",
          fatigue: "",
          mistakeReason: "",
          mentalState: "",
          privateNote: "",
          evidenceStatus: "submitted",
          evidenceImageName: evidenceFile.name,
          evidenceImageType: evidenceFile.type,
          evidenceImageData,
          evidenceImageUrl: "",
          evidenceStoragePath: "",
          rescheduleStatus: "random_diagnostic",
          autoGradingStatus: "phase1_random_evidence",
          autoGradingSummary: "画像を受領。サーバー側AI解析で教科・教材・講座・単元・正答率を自動分類します。",
          aiAnalysisStatus: firebaseBridge.enabled && firebaseBridge.currentUser ? "queued" : "needs_review",
          notificationStatus: "queued",
          submittedAt,
          savedAt: new Date().toISOString()
        };

        status.textContent = "提出画像を保存中です...";
        submittedRecord = await saveEvidenceRecordRemote(submittedRecord, evidenceFile, firebaseBridge);
        records.push(submittedRecord);
        saveEvidenceRecords(STORAGE_KEY, records);
        if (submittedRecord.firebaseSyncStatus === "error") {
          status.textContent = "Firebaseへの送信に失敗しました。記録は端末内に保持しました。通信を確認して、もう一度提出してください。";
          submitButton.disabled = false;
          submitButton.textContent = "画像を提出してAI解析する";
          render();
          return;
        }
        createSubmissionNotice(submittedRecord);
        form.reset();
        render();
        window.alert("画像を提出しました。AI解析が完了すると教科・教材・単元ごとに自動整理されます。");
      } catch (error) {
        status.textContent = `画像を提出できませんでした: ${error.message || error}`;
        submitButton.disabled = false;
        submitButton.textContent = "画像を提出してAI解析する";
      }
    }

    function renderLogs() {
      renderEvidenceLogs({
        logList,
        role: activeRoleConfig(),
        roleKey: currentRole,
        records,
        recordKey,
        openEvidencePreview,
        onRandomEvidenceSubmit: handleRandomEvidenceSubmit
      });
    }

    function recordKey(record) {
      return `${record.date}_${record.missionId}_${record.savedAt}`;
    }

    function openEvidencePreview(key) {
      openEvidencePreviewRecord(
        key,
        records,
        {
          dialog: evidencePreviewDialog,
          title: evidencePreviewTitle,
          meta: evidencePreviewMeta,
          image: evidencePreviewImage
        },
        recordKey
      );
    }

    function openRecordDialog(mission, record) {
      if (!activeRoleConfig().canEditRecord) return;
      if (!mission) return;
      document.querySelector("#missionId").value = mission.id;
      document.querySelector("#missionTitle").value = `${mission.subject} ${mission.lesson} ${mission.part} ${mission.title}`;
      document.querySelector("#testType").value = record ? record.testType : "初回確認テスト";
      document.querySelector("#answeredCount").value = record ? record.answeredCount || "" : "";
      document.querySelector("#score").value = record ? record.score : "";
      document.querySelector("#understanding").value = record ? record.understanding : "4";
      document.querySelector("#fatigue").value = record ? record.fatigue : "2";
      document.querySelector("#mistakeReason").value = record ? record.mistakeReason : "";
      document.querySelector("#evidenceImage").value = "";
      document.querySelector("#evidenceImageNote").textContent = record?.evidenceImageName
        ? `提出済み: ${record.evidenceImageName}。差し替える場合だけ新しい画像を選んでください。`
        : "スタサプの確認テスト結果画面をアップしてください。回答数と正答率が見えるスクショを完了の証跡にします。";
      document.querySelector("#mentalState").value = record ? record.mentalState || "落ち着いている" : "落ち着いている";
      document.querySelector("#privateNote").value = record ? record.privateNote : "";
      document.querySelector("#deleteRecordButton").style.display = record ? "inline-flex" : "none";
      recordDialog.showModal();
    }

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = loginNameInput.value.trim();
      const password = loginPasscodeInput.value;
      if (firebaseBridge.enabled && firebaseBridge.signInWithEmailAndPassword) {
        if (!email || !password) {
          loginStatus.textContent = "ログインするには、登録済みのメールアドレスとパスワードを入力してください。";
          return;
        }
        loginStatus.textContent = "ログイン中です...";
        try {
          const credential = await firebaseBridge.signInWithEmailAndPassword(firebaseBridge.auth, email, password);
          await applyFirebaseUser(credential.user);
        } catch (error) {
          loginStatus.textContent = `ログインできませんでした。未登録の場合は「新規登録する」を押してください。${error.message || error}`;
          return;
        }
      } else {
        loginName = email || ROLES[currentRole].label;
      }
      localStorage.setItem(LOGIN_NAME_KEY, loginName);
      localStorage.setItem(ROLE_KEY, currentRole);
      localStorage.setItem(SUPPORT_TYPE_KEY, currentSupportType);
      localStorage.setItem(LOGIN_KEY, "true");
      isLoggedIn = true;
      activeView = "home";
      localStorage.setItem(VIEW_KEY, activeView);
      render();
    });

    document.querySelector("#registerAccountButton").addEventListener("click", async () => {
      const email = loginNameInput.value.trim();
      const password = loginPasscodeInput.value;
      if (!email || !password) {
        loginStatus.textContent = "新規登録するには、メールアドレスとパスワードを入力してください。";
        return;
      }
      if (password.length < 6) {
        loginStatus.textContent = "パスワードは6文字以上にしてください。";
        return;
      }
      loginName = email;
      loginStatus.textContent = "新規登録中です...";
      try {
        await createFirebaseAccount(email, password);
        localStorage.setItem(LOGIN_NAME_KEY, loginName);
        localStorage.setItem(ROLE_KEY, currentRole);
        localStorage.setItem(SUPPORT_TYPE_KEY, currentSupportType);
        localStorage.setItem(LOGIN_KEY, "true");
        isLoggedIn = true;
        activeView = "home";
        localStorage.setItem(VIEW_KEY, activeView);
        loginStatus.textContent = "新規登録してログインしました。";
        render();
      } catch (error) {
        const message = String(error.message || error);
        if (message.includes("auth/email-already-in-use")) {
          loginStatus.textContent = "このメールアドレスは登録済みです。ログインボタンを押してください。";
          return;
        }
        loginStatus.textContent = `登録に失敗しました。${message}`;
      }
    });

    recordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const missionId = document.querySelector("#missionId").value;
      const mission = findMissionById(missionId);
      const existingRecord = getMissionRecord(missionId);
      const evidenceFile = document.querySelector("#evidenceImage").files[0];
      if (!existingRecord?.evidenceImageName && !evidenceFile) {
        alert("スタサプ確認テスト結果スクショをアップロードしてください。未提出の場合、この授業は後日にずらします。");
        return;
      }
      const evidenceImageData = evidenceFile ? await fileToDataUrl(evidenceFile) : existingRecord.evidenceImageData;
      records = records.filter((record) => !(record.date === todayKey() && record.missionId === missionId));
      let submittedRecord = {
        date: todayKey(),
        day: dailyPlan.day,
        missionId,
        missionTitle: document.querySelector("#missionTitle").value,
        subject: mission ? mission.subject : "",
        course: mission ? mission.course : "",
        lesson: mission ? mission.lesson : "",
        part: mission ? mission.part : "",
        testType: document.querySelector("#testType").value,
        checkItem: mission ? mission.check_item || "" : "",
        levelTask: mission ? mission.level_task || "" : "",
        answeredCount: document.querySelector("#answeredCount").value,
        score: document.querySelector("#score").value,
        understanding: document.querySelector("#understanding").value,
        fatigue: document.querySelector("#fatigue").value,
        mistakeReason: document.querySelector("#mistakeReason").value.trim(),
        mentalState: document.querySelector("#mentalState").value,
        privateNote: document.querySelector("#privateNote").value.trim(),
        evidenceStatus: "submitted",
        evidenceImageName: evidenceFile ? evidenceFile.name : existingRecord.evidenceImageName,
        evidenceImageType: evidenceFile ? evidenceFile.type : existingRecord.evidenceImageType,
        evidenceImageData,
        evidenceImageUrl: evidenceFile ? "" : existingRecord.evidenceImageUrl,
        evidenceStoragePath: evidenceFile ? "" : existingRecord.evidenceStoragePath,
        rescheduleStatus: "not_required",
        autoGradingStatus: "phase1_sutasapu_result_screenshot",
        autoGradingSummary: "スタサプ結果スクショと手入力の回答数・正答率を受領。OCR自動読取は正式版で実装。",
        notificationStatus: "queued",
        savedAt: new Date().toISOString()
      };
      submittedRecord = await saveEvidenceRecordRemote(submittedRecord, evidenceFile, firebaseBridge);
      records.push(submittedRecord);
      saveEvidenceRecords(STORAGE_KEY, records);
      if (submittedRecord.firebaseSyncStatus === "error") {
        render();
        alert("Firebaseへの送信に失敗しました。記録は端末内に保持しました。通信を確認して、もう一度提出してください。");
        return;
      }
      createSubmissionNotice(submittedRecord);
      const navItems = navigationItems();
      const nextIndex = navItems.findIndex((item) => item.type !== "complete");
      navigationStepIndex = nextIndex >= 0 ? nextIndex : navItems.length;
      localStorage.setItem(NAV_STEP_KEY, String(navigationStepIndex));
      activeView = "home";
      localStorage.setItem(VIEW_KEY, activeView);
      recordDialog.close();
      render();
    });

    document.querySelector("#closeDialogButton").addEventListener("click", () => recordDialog.close());
        document.querySelector("#closeDevDrawerButton").addEventListener("click", closeDevDrawer);
    document.querySelector("#refreshAppCacheButton").addEventListener("click", refreshAppCache);
    devDrawerBackdrop.addEventListener("click", closeDevDrawer);
    scheduleDrawerOpen?.addEventListener("click", openScheduleDrawer);
    scheduleDrawerClose?.addEventListener("click", closeScheduleDrawer);
    scheduleDrawerBackdrop?.addEventListener("click", closeScheduleDrawer);
    scheduleQuickForm?.addEventListener("submit", addCustomCountdown);
    downloadScheduleIcsButton?.addEventListener("click", () => {
      downloadSchedulesIcs(allCountdownTargets(), `limit-break-${todayJapanKey()}.ics`);
      if (scheduleQuickStatus) scheduleQuickStatus.textContent = "ICSファイルを書き出しました。AppleまたはOutlookカレンダーで読み込んでください。";
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDevDrawer();
        closeScheduleDrawer();
      }
    });
    bindEvidencePreviewDialog({
      dialog: evidencePreviewDialog,
      image: evidencePreviewImage,
      closeButton: document.querySelector("#closeEvidencePreviewButton")
    });

    document.querySelector("#deleteRecordButton").addEventListener("click", () => {
      const missionId = document.querySelector("#missionId").value;
      records = records.filter((record) => !(record.date === todayKey() && record.missionId === missionId));
      noticeQueue = noticeQueue.filter((notice) => notice.recordKey !== `${todayKey()}_${missionId}`);
      saveEvidenceRecords(STORAGE_KEY, records);
      saveNoticeQueue();
      recordDialog.close();
      render();
    });

    document.querySelector("#resetButton").addEventListener("click", () => {
      if (!confirm("検証データをリセットしますか？")) return;
      records = [];
      noticeQueue = [];
      saveEvidenceRecords(STORAGE_KEY, records);
      saveNoticeQueue();
      render();
    });

    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-target-view]");
      if (!target) return;
      event.preventDefault();
      setActiveView(target.dataset.targetView);
      if (scheduleDrawer?.contains(target)) closeScheduleDrawer();
    });

    document.querySelector("#exportCsvButton").addEventListener("click", () => {
      const headers = ["date", "day", "missionId", "missionTitle", "subject", "course", "lesson", "part", "testType", "checkItem", "levelTask", "answeredCount", "score", "understanding", "fatigue", "mentalState", "mistakeReason", "privateNote", "evidenceStatus", "evidenceImageName", "rescheduleStatus", "autoGradingStatus", "autoGradingSummary", "notificationStatus", "savedAt"];
      const rows = [headers, ...records.map((record) => headers.map((key) => record[key] || ""))];
      const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `limit-break-records-${todayKey()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });

    function escapeCsv(value) {
      const text = String(value).replaceAll('"', '""');
      return /[",\n]/.test(text) ? `"${text}"` : text;
    }

    async function refreshAppCache() {
      const button = document.querySelector("#refreshAppCacheButton");
      if (button) {
        button.disabled = true;
        button.textContent = "更新中...";
      }

      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.set("refresh", Date.now().toString());
        window.location.replace(url.toString());
      }
    }

    function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) return;
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").then((registration) => {
          registration.update();
        }).catch((error) => {
          console.warn("Service Worker registration failed:", error);
        });
      });
    }

    registerServiceWorker();
    init();
