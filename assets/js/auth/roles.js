export const PUBLIC_ROLE_KEYS = ["student", "parent", "supporter", "teacher"];

export const SUPPORTER_TYPES = [
  { value: "family", label: "家族・親戚", note: "応援コメントと努力量を中心に確認" },
  { value: "mentor", label: "メンター", note: "継続状況と今週の努力を確認" },
  { value: "school_teacher", label: "学校の先生", note: "学習状況と負荷の要約を確認" },
  { value: "psychological_counselor", label: "心理カウンセラー", note: "疲労傾向と声かけ注意点を確認" }
];

export const ROLES = {
  student: {
    label: "本人",
    headline: "今日やること、残日数、終わった実感を一番大きく表示します。",
    canEditRecord: true,
    showScore: true,
    showFatigue: true,
    showMistake: true,
    showPrivateNote: true,
    showMentalState: true,
    showMissionDetail: true
  },
  parent: {
    label: "保護者",
    headline: "達成率と努力量を見守る画面です。内省メモは表示しません。",
    canEditRecord: false,
    showScore: "summary",
    showFatigue: "summary",
    showMistake: false,
    showPrivateNote: false,
    showMentalState: "summary",
    showMissionDetail: true
  },
  supporter: {
    label: "サポーター",
    headline: "応援に必要な努力量だけを見る画面です。詳細な成績や疲労度は表示しません。",
    canEditRecord: false,
    showScore: false,
    showFatigue: false,
    showMistake: false,
    showPrivateNote: false,
    showMentalState: false,
    showMissionDetail: false
  },
  counselor: {
    label: "心理カウンセラー",
    headline: "学習継続、疲労度、自己申告メンタル状態、学習負荷を確認し、心理的安全性を支援する画面です。",
    canEditRecord: false,
    canPostCounselorNote: true,
    showScore: "summary",
    showFatigue: true,
    showMistake: false,
    showPrivateNote: false,
    showMentalState: true,
    showMissionDetail: true
  },
  teacher: {
    label: "塾講師",
    headline: "理解度、弱点、確認テスト、疲労度、復習漏れ、次週提案を確認する画面です。",
    canEditRecord: true,
    showScore: true,
    showFatigue: true,
    showMistake: true,
    showPrivateNote: true,
    showMentalState: true,
    showMissionDetail: true
  },
  lead_teacher: {
    label: "統括教師",
    headline: "全生徒と関係者の連携状況を確認し、対象生徒を切り替える管理者付与専用画面です。",
    canEditRecord: true,
    canViewAllLinks: true,
    showScore: true,
    showFatigue: true,
    showMistake: true,
    showPrivateNote: true,
    showMentalState: true,
    showMissionDetail: true
  }
};

export const ROLE_KEYS = Object.keys(ROLES);
