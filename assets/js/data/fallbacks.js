// Fallback data used when bundled JSON files are unavailable.
// Keep this file free of DOM and storage side effects.

export const FALLBACK_DAILY = {
  plan_version: "1.6.0",
  day: 1,
  date: "2026-07-01",
  level: "LEVEL 1 FOUNDATION",
  phase_id: "phase-1",
  coach_message: "今日は英語構文を3つ覚えましょう。数学Ⅰは要点整理を削らず、物理基礎は図で説明できる状態まで持っていきます。",
  phases: [
    {
      id: "phase-1",
      name: "Phase 1 基礎完成",
      date_start: "2026-07-01",
      date_end: "2026-08-31",
      description: "共通テストまで200日。数学Ⅰ・Ⅱ・B、英語構文、物理基礎、化学基礎導入を残し、広げすぎる学習は削る。",
      keep: ["数学Ⅰ・Ⅱ・Bの基礎", "英語構文", "物理基礎", "化学基礎導入"],
      cut: ["難問演習の深追い", "教材の追加購入", "復習なしの先取り"],
      focus_ratios: { "数学": 35, "英語": 30, "物理基礎": 20, "化学基礎": 15 }
    },
    {
      id: "phase-2",
      name: "Phase 2 標準完成",
      date_start: "2026-09-01",
      date_end: "2026-10-31",
      description: "数学演習、物理、化学、英語長文を標準問題まで完成させる。",
      keep: ["標準演習", "英語長文", "物理・化学の典型問題"],
      cut: ["解説を読んだだけの完了扱い"],
      focus_ratios: { "数学": 30, "英語": 25, "物理": 25, "化学": 20 }
    },
    {
      id: "phase-3",
      name: "Phase 3 共通テスト対策強化",
      date_start: "2026-11-01",
      date_end: "2026-12-31",
      description: "国語・情報・世界史を増やし、共通テストの得点化を進める。",
      keep: ["共通テスト形式", "国語", "情報", "世界史"],
      cut: ["二次だけに偏る配分"],
      focus_ratios: { "共通テスト主要科目": 55, "数学": 20, "英語": 15, "理科": 10 }
    },
    {
      id: "phase-4",
      name: "Phase 4 共通テスト直前",
      date_start: "2027-01-01",
      date_end: "2027-01-17",
      description: "実戦演習と弱点回収に集中する。新規教材は増やさない。",
      keep: ["実戦演習", "弱点回収", "時間配分"],
      cut: ["新単元の深追い"],
      focus_ratios: { "共通テスト実戦": 70, "弱点回収": 20, "体調管理": 10 }
    },
    {
      id: "phase-5",
      name: "Phase 5 二次試験集中",
      date_start: "2027-01-18",
      date_end: "2027-02-24",
      description: "数学・英語・物理・化学の記述対策へ切り替える。",
      keep: ["記述答案", "添削", "過去問", "理科の説明力"],
      cut: ["共通テスト型だけの反復"],
      focus_ratios: { "数学記述": 30, "英語記述": 25, "物理": 25, "化学": 20 }
    },
    {
      id: "phase-6",
      name: "Phase 6 国公立二次本番",
      date_start: "2027-02-25",
      date_end: "2027-03-25",
      description: "本番期間。復習と体調管理を最優先にする。",
      keep: ["最終確認", "睡眠", "答案の型"],
      cut: ["不安からの詰め込み"],
      focus_ratios: { "最終確認": 45, "過去問復習": 35, "体調管理": 20 }
    }
  ],
  missions: [
    {
      id: "day001-math1-part1",
      time: "09:00 - 12:00",
      subject: "数学Ⅰ",
      course: "ベーシックレベル数学Ⅰ",
      lesson: "第1講",
      part: "PART1",
      title: "単項式と多項式",
      level_task: "Basic",
      check_item: "確認問題",
      tasks: ["要点整理", "Point Pickup", "講義問題", "確認問題"],
      ai_check_test: [
        "単項式と多項式の違いを自分の言葉で説明する",
        "同類項をまとめる手順を1問で示す"
      ],
      reason: "共通テストまで200日。基礎計算の抜けを削れないため残す。"
    },
    {
      id: "day001-english-memory",
      time: "14:00 - 17:00",
      subject: "英語",
      course: "ベーシックレベル英語",
      lesson: "第1講",
      part: "Chapter1",
      title: "今日の暗記 / 文法 / 構文",
      memory: "肯定文・否定文の基本構文を3つ暗唱",
      level_task: "Basic",
      check_item: "復習テスト / 今日の暗記",
      tasks: ["授業", "復習", "復習テスト", "例文暗唱", "音読"],
      ai_check_test: [
        "肯定文を否定文に変えるルールを説明する",
        "今日の暗記3文を音読して日本語に戻す"
      ],
      reason: "英語は構文を先に固定し、長文期の負荷を下げる。"
    },
    {
      id: "day001-physics-basic-part1",
      time: "20:00 - 22:00",
      subject: "物理基礎",
      course: "ベーシックレベル物理基礎",
      lesson: "第1講",
      part: "PART1",
      title: "速さ",
      level_task: "Basic",
      check_item: "確認問題",
      tasks: ["講義", "演習問題", "確認テスト", "図解説明"],
      ai_check_test: [
        "速さ・時間・距離の関係を図で説明する",
        "単位変換を含む基本問題を1問解く"
      ],
      reason: "物理は公式暗記より図で説明できる状態を残す。"
    }
  ],
  review_missions: [
    { label: "昨日の復習", subject: "数学Ⅰ", lesson: "第1講", part: "PART1", title: "単項式と多項式" },
    { label: "3日後復習", subject: "英語", lesson: "第1講", part: "Chapter1", title: "肯定文・否定文" },
    { label: "7日後復習", subject: "物理基礎", lesson: "第1講", part: "PART1", title: "速さ" }
  ]
};

export const FALLBACK_SUMMER = {
  period: "2026-07-01_to_2026-08-31",
  date_start: "2026-07-01",
  date_end: "2026-08-31",
  goal: "基礎教材を8月末までに徹底。7月は数学Ⅰ・英語基礎・物理基礎、7月後半から化学基礎を導入する。",
  weeks: [
    { week: 1, range: "2026-07-01〜2026-07-05", focus: "数学Ⅰ・英語基礎・物理基礎", daily_missions: ["数学Ⅰ 第1講 PART1", "ベーシック英語 Chapter1", "物理基礎 第1講 PART1"] },
    { week: 2, range: "2026-07-06〜2026-07-12", focus: "数学Ⅰ/A・英語復習テスト・物理基礎", daily_missions: ["確認問題", "復習テスト", "図解説明"] },
    { week: 3, range: "2026-07-13〜2026-07-19", focus: "数学Ⅱ導入・英語構文・物理基礎", daily_missions: ["数学Ⅱ 第1講", "今日の暗記3文", "確認問題"] },
    { week: 4, range: "2026-07-20〜2026-07-26", focus: "数学B導入・化学基礎導入", daily_missions: ["数列導入", "化学基礎 第1講", "AI確認テスト"] },
    { week: 5, range: "2026-07-27〜2026-08-02", focus: "数学Ⅰ/Ⅱ/Bの基礎横断", daily_missions: ["確認問題の解き直し", "間違い理由分類"] },
    { week: 6, range: "2026-08-03〜2026-08-09", focus: "英語 標準文法・読解導入", daily_missions: ["文法・読解", "復習テスト", "今日の暗記"] },
    { week: 7, range: "2026-08-10〜2026-08-16", focus: "物理 力学導入", daily_missions: ["物理 第1講", "演習問題", "図解説明"] },
    { week: 8, range: "2026-08-17〜2026-08-23", focus: "8月末確認週 1", daily_missions: ["数学確認問題", "英語復習テスト", "物理確認問題"] },
    { week: 9, range: "2026-08-24〜2026-08-31", focus: "8月末確認週 2", daily_missions: ["AI確認テスト", "復習漏れ回収", "9月標準演習準備"] }
  ]
};

export const FALLBACK_LEVELS = {
  levels: [
    { level: "Basic", purpose: "講義内容を理解する", evidence: "要点整理・授業・講義を見て、確認項目に進める" },
    { level: "Standard", purpose: "確認問題・復習テストを自力で解ける", evidence: "数学は確認問題、英語は復習テスト、物理は確認問題を記録する" },
    { level: "Challenge", purpose: "AI確認テストで説明・類題対応できる", evidence: "映像授業後に固定の理解確認問題へ答える" }
  ]
};

export const FALLBACK_MATERIALS = {
  policy_version: "1.7.0",
  principle: "スタディサプリ教材を最優先教材とし、日々の学習、今日の暗記、AI確認テストは教材順に沿って設計する。ただし教材本文・問題文の複製配布はしない。",
  materials: [
    { subject: "数学Ⅰ", course_name: "ベーシックレベル数学Ⅰ", file_name: "Eベーシックレベル数学Ⅰ_KZB450000_03.pdf", extraction_status: "cataloged" },
    { subject: "数学A", course_name: "ベーシックレベル数学A", file_name: "ベーシックレベル数学Ａ_EKZB460000_01.pdf", extraction_status: "cataloged" },
    { subject: "数学Ⅱ", course_name: "ベーシックレベル数学Ⅱ", file_name: "ベーシックレベル数学Ⅱ_EKZC620000.pdf", extraction_status: "cataloged" },
    { subject: "数学B", course_name: "ベーシックレベル数学B", file_name: "ベーシックレベル数学Ｂ_EKZC630000.pdf", extraction_status: "cataloged" },
    { subject: "英語", course_name: "ベーシックレベル英語", file_name: "ベーシックレベル英語_EKZB31000_04.pdf", extraction_status: "cataloged" },
    { subject: "英語", course_name: "スタンダードレベル英語 文法・読解", file_name: "高1・高2スタンダードレベル英語＜文法・読解編＞　前編_EKZB32000_251212.pdf", extraction_status: "cataloged" },
    { subject: "英語", course_name: "スタンダードレベル英語 長文", file_name: "高1・高2 スタンダードレベル英語＜長文編＞_MKZB49000_251208.pdf", extraction_status: "cataloged" },
    { subject: "物理基礎", course_name: "ベーシックレベル物理基礎", file_name: "ベーシックレベル物理基礎_EKZB420000_250530.pdf", extraction_status: "cataloged" },
    { subject: "物理", course_name: "ベーシックレベル物理", file_name: "ベーシックレベル物理_EKZB540000_260615.pdf", extraction_status: "cataloged" },
    { subject: "化学基礎", course_name: "ベーシックレベル化学基礎", file_name: "ベーシックレベル化学基礎_EKZB400000_260701.pdf", extraction_status: "cataloged" }
  ]
};

export const FALLBACK_MATERIALS_OUTLINE = {
  version: "3.5.0",
  extraction_method: "PDF冒頭の目次・見出しから講座構造を抽出。本文・問題文は保存しない。",
  status_note: "国語と世界史は教材アップロード後に追加する。",
  materials: []
};

export const FALLBACK_SUBJECT_BALANCE = {
  version: "3.5.0",
  policy: "理科は物理・化学、社会は世界史・国語の組み合わせで扱う。理科対社会は2対1を基準にする。",
  groups: [
    { group: "理科", subjects: ["物理", "化学"], ratio: 2, weekly_slots: 4 },
    { group: "社会・国語", subjects: ["世界史", "国語"], ratio: 1, weekly_slots: 2, status: "国語と世界史の教材は後日アップロード後に講座DB化する" }
  ]
};

export const FALLBACK_REVERSE_PROGRESS = {
  version: "1.7.0",
  baseline_date: "2026-07-01",
  goal_date: "2026-08-31",
  goal_label: "8月末ゴール",
  days_remaining_inclusive: 62,
  subjects: [
    { subject: "数学", target_unit: "PART", remaining_units: 48, required_per_day: 0.8, today_target: "数学Ⅰ 第3講 PART2まで", planned_video_minutes: 75, planned_practice_minutes: 90, planned_review_minutes: 30, status: "予定通り", status_note: "数学Ⅰ・Ⅱ・Bを毎日進める。" },
    { subject: "英語", target_unit: "Chapter", remaining_units: 72, required_per_day: 1.2, today_target: "第5講 Chapter3まで", planned_video_minutes: 60, planned_practice_minutes: 0, planned_review_minutes: 60, planned_memory_minutes: 30, status: "予定通り", status_note: "ベーシック英語と構文暗記を毎日固定する。" }
  ],
  study_load: { video_minutes: 135, practice_minutes: 210, review_minutes: 75, memory_minutes: 30, total_minutes: 450 }
};

export const FALLBACK_REVIEW_SCHEDULE = {
  version: "1.7.0",
  review_intervals_days: [1, 3, 7, 14, 30],
  retention_tests: [
    { id: "ret-math1-lesson2-part1", subject: "数学Ⅰ", source: "確認問題の類題", lesson: "第2講", part: "PART1", format: ["数値変更", "条件変更", "解法説明"], prompt: "確認問題と同じ考え方で、条件を一つ変えた類題を解く。" },
    { id: "ret-eng-lesson3-chapter2", subject: "英語", source: "復習テストの類題", lesson: "第3講", part: "Chapter2", format: ["並べ替え", "日本語→英語", "文法理由説明"], prompt: "日本語から英文を作り、語順の理由を説明する。" }
  ]
};

export const FALLBACK_MEMORY = {
  version: "1.7.0",
  today_target: { words: 20, sentences: 5, structures: 3, checks: ["英語→日本語", "日本語→英語", "音読", "暗唱"] },
  items: [
    { id: "ENG_WORD_0001", type: "word", front: "maintain", back: "維持する", source: "単語帳", level: "basic" },
    { id: "ENG_SENT_0001", type: "sentence", front: "私は学生です。", back: "I am a student.", source: "英語基本文", level: "basic" },
    { id: "ENG_STR_0001", type: "structure", front: "It is ... for 人 to do", back: "人がdoすることは...だ", source: "重要構文", level: "basic" }
  ]
};

export const FALLBACK_EXTERNAL = {
  version: "1.7.0",
  apps: [
    { app_name: "英単語オレンジ", import_type: "manual_csv", last_imported_at: "2026-07-01", studied_count: 120, accuracy: 82, weak_items: ["abandon", "maintain", "available"], reflection: "明日の暗記に苦手単語を追加" }
  ]
};

export const FALLBACK_AI_TEACHER = {
  version: "1.8.1",
  phase: "Phase1 UI only",
  api_policy: { frontend_api_key: false, server_side_secret_required: true },
  roles: ["Yui Teacher", "Yui Coach", "Yui Analyzer"],
  fixed_responses: {
    teacher: "まず3分で、今日の学習内容を自分の言葉で説明してみましょう。詰まった場所だけヒントを出します。",
    coach: "今日は全部を完璧にする日ではありません。昨日より一つ進めば、LIMIT BREAK +1です。",
    analyzer: "先生向け要約: 数学と英語は毎日実施。疲労度が高い日は復習を短くして継続を優先します。"
  }
};

export const FALLBACK_COURSE_PACING = {
  version: "3.4.0",
  material_reflection_status: {
    level: "catalog_and_structure",
    label: "教材カタログ・学習順序ベース",
    note: "PDF本文・映像授業の詳細解析は未完了。現時点では教材名、講、PART、学習フロー、確認項目に基づく仮設計。"
  },
  courses: [
    {
      subject: "数学Ⅰ",
      course: "ベーシックレベル数学Ⅰ",
      remaining_units: 48,
      daily_study_minutes: 180,
      target_units_per_day: 1,
      estimated_days_at_current_pace: 48,
      estimated_finish_date_from_2026_07_01: "2026-08-17",
      pace_judgement: "1日1 PARTなら8月中旬に完了見込み。復習日と遅れ吸収を入れると8月末まで妥当。",
      fallback_rule: "3時間で終わらない場合、Point Pickupと講義問題を優先し、確認問題は夜または翌朝に回す。要点整理は削らない。",
      today_unit_plan: {
        segments: [
          { minutes: 15, label: "前回接続", instruction: "導入を見直し、単項式・多項式の違いを1行で書く。" },
          { minutes: 35, label: "要点整理", instruction: "用語・次数・係数・同類項をチェックする。" },
          { minutes: 25, label: "Point Pickup", instruction: "手順の理由を横に一言書く。" },
          { minutes: 45, label: "講義問題", instruction: "解説前に一度自力で式変形を書く。" },
          { minutes: 45, label: "確認問題", instruction: "間違い理由を分類する。" },
          { minutes: 15, label: "終了判定", instruction: "要点3行と明日の復習テーマを決める。" }
        ]
      }
    }
  ]
};

export const FALLBACK_COUNSELOR_NOTES = {
  version: "2.0.0",
  policy: {
    scope: "学習継続、声かけ、心理的安全性の支援に限定する",
    medical_diagnosis: false,
    emergency_notice: "緊急性がある内容は、アプリ内対応ではなく、保護者・専門機関・学校・医療機関への連絡を優先する"
  },
  counselor_notes: [
    {
      note_id: "COUNSELOR_NOTE_0001",
      student_id: "STU_0001",
      created_by: "USER_COUNSELOR_0001",
      visibility: ["student", "parent", "teacher", "admin"],
      category: "mental_support",
      body: "今週は学習量が増えています。達成率だけでなく、睡眠と休憩も評価してください。",
      risk_level: "normal",
      created_at: "2026-07-01T06:47:00+09:00"
    }
  ]
};

export const FALLBACK_NOTICE_CONTACTS = {
  recipients: [
    { role: "student", label: "本人", email: "", line: "", phone: "", other: "", methods: ["email"] },
    { role: "parent", label: "保護者", email: "", line: "", phone: "", other: "", methods: ["email"] },
    { role: "supporter", label: "サポーター", email: "", line: "", phone: "", other: "", methods: ["email"] },
    { role: "teacher", label: "塾講師", email: "", line: "", phone: "", other: "", methods: ["email"] }
  ],
  phase: "Phase1 user-owned channels"
};

export const FALLBACK_COURSE_ROUTE = {
  version: "4.2.0",
  student_id: "STU_0001",
  app_title: "CORTEX Limit Break",
  today: {
    date_label: "7月3日（金）",
    blocks: [
      { label: "午前", subject: "数学", goal: "数学Ⅰ 第1講 PART1と数学A 第1講 PART1を完了" },
      { label: "午後", subject: "英語", goal: "英語 Chapter1と文法・基本文を完了" },
      { label: "夜", subject: "物理", goal: "物理基礎 第1講 PART1を確認問題まで完了" }
    ]
  },
  long_plan: [
    { subject: "数学", goal: "数学Ⅰ完了、数学A基礎完了、数学Ⅱ前半、数学B基礎", route: ["数学Ⅰ", "数学A", "数学Ⅱ", "数学B"] },
    { subject: "英語", goal: "ベーシック英語完了、基本文300文、構文100文", route: ["ベーシック英語", "文法・読解", "長文導入"] },
    { subject: "物理・化学", goal: "物理基礎完了、力学導入、化学基礎導入", route: ["物理基礎", "物理", "化学基礎"] }
  ],
  week_plan: [
    { day: "月", target: "数学Ⅰ PART1 / 英語 Chapter1", check: "確認問題・復習テスト提出" },
    { day: "火", target: "数学A PART1 / 物理基礎 PART1", check: "確認問題提出" },
    { day: "水", target: "数学Ⅰ PART2 / 英語 Chapter2", check: "類題・基本文チェック" },
    { day: "木", target: "数学A PART2 / 英文法 Chapter1", check: "確認問題・基本文暗唱" },
    { day: "金", target: "数学Ⅰ PART3 / 物理基礎 PART2", check: "スタサプ結果スクショ提出" }
  ]
};

