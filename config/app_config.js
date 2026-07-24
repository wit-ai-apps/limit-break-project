export const APP_NAME = "CORTEX Limit Break";
export const APP_VERSION = "v4.12.1-dev";
export const APP_RELEASE_NAME = "提出画像ボタン応答修正";
export const APP_RELEASE_SUBTITLE = "Preparing for CORTEX Core";

export const STORAGE_KEY = "limitBreakProjectRecordsV120";
export const LOGIN_KEY = "limitBreakProjectLoggedInV390";
export const LOGIN_NAME_KEY = "limitBreakProjectLoginNameV390";
export const LOGIN_EMAIL_KEY = "limitBreakProjectLoginEmailV460";
export const AUTH_UID_KEY = "limitBreakProjectAuthUidV460";
export const ROLE_KEY = "limitBreakProjectRole";
export const NAV_STEP_KEY = "limitBreakProjectNavigationStepV340";
export const SUPPORT_TYPE_KEY = "limitBreakProjectSupportTypeV380";
export const MEMORY_RESULT_KEY = "limitBreakProjectMemoryResultsV170";
export const EXTERNAL_PROGRESS_KEY = "limitBreakProjectExternalProgressV170";
export const AI_TEACHER_LOG_KEY = "limitBreakProjectAiTeacherLogV180";
export const COUNSELOR_NOTES_KEY = "limitBreakProjectCounselorNotesV200";
export const VIEW_KEY = "limitBreakProjectActiveViewV330";
export const NOTICE_CONTACTS_KEY = "limitBreakProjectNoticeContactsV370";
export const NOTICE_QUEUE_KEY = "limitBreakProjectNoticeQueueV370";
export const CUSTOM_COUNTDOWNS_KEY = "limitBreakProjectCustomCountdownsV464";
export const STUDY_START_DATE_KEY = "limitBreakProjectStudyStartDateV465";

export const DEFAULT_STUDY_START_DATE = "2026-07-08";
export const BASELINE_DATE = "2026-06-30";
export const FIREBASE_CONFIG_PATH = "data/firebase_config.json";

export const APP_VIEWS = [
  { id: "home", label: "ホーム" },
  { id: "long", label: "長期計画" },
  { id: "week", label: "今週" },
  { id: "today", label: "今日の手順" },
  { id: "memory", label: "暗記" },
  { id: "review", label: "復習" },
  { id: "evidence", label: "提出画像" },
  { id: "progress", label: "進み具合" },
  { id: "ai", label: "AI先生" },
  { id: "support", label: "見守り" },
  { id: "admin", label: "設定" }
];

export const RELEASE_NOTES = [
  {
    version: "v4.12.1-dev",
    date: "2026-07-24",
    title: "提出画像ボタン応答修正",
    items: [
      "画像ボタンを押した直後に確認画面を必ず表示",
      "期限切れ・無効な画像URLはFirebase Storageから再取得",
      "取得失敗時も無反応にせず原因を画面表示"
    ]
  },
  {
    version: "v4.12.0-dev",
    date: "2026-07-24",
    title: "採点画像・分析・未提出ボード",
    items: [
      "提出画像をサムネイルで並べ、教科・講座・単元別に自動整理",
      "できた点・弱点・次の学習を画像カードに表示",
      "予定と照合した未提出一覧と、元画像を変えない〇×重ね表示を追加"
    ]
  },
  {
    version: "v4.11.1-dev",
    date: "2026-07-24",
    title: "パスワード再設定",
    items: [
      "ログイン画面へ「パスワードを忘れた方」ボタンを追加",
      "登録メールアドレスへFirebaseの安全な再設定リンクを送信",
      "パスワードをアプリ・Firestore・ブラウザ保存領域へ記録しない"
    ]
  },
  {
    version: "v4.11.0-dev",
    date: "2026-07-24",
    title: "Firebase同期統一・統括教師",
    items: [
      "ログイン中はFirebaseの提出記録を正本とし、端末ごとの古い画像混入を防止",
      "提出日を固定日ではなく現在の日本時間で記録",
      "管理者付与専用の統括教師ロールで全連携一覧と対象生徒切替を表示"
    ]
  },
  {
    version: "v4.10.1-dev",
    date: "2026-07-23",
    title: "成績通知から提出原画像を確認",
    items: [
      "保護者・講師向けの成績通知カードへ「実際の提出画像を見る」ボタンを追加",
      "AI分析結果と生徒が提出した元画像を同じ画面から照合",
      "Storageパスだけ残った画像もFirebaseから再取得して表示"
    ]
  },
  {
    version: "v4.10.0-dev",
    date: "2026-07-23",
    title: "映像視聴判定・毎朝自動再計画",
    items: [
      "確認テストの正答率・回答数・新しさ・AI信頼度から映像視聴方法を判定",
      "未提出単元は理解済みと推測せず、先に診断テストを配置",
      "毎朝8:55 JSTに8月31日から逆算して残り計画を再構築"
    ]
  },
  {
    version: "v4.9.1-dev",
    date: "2026-07-23",
    title: "予定入力収納・ログインモード表示",
    items: [
      "予定追加欄を必要なときだけ開く収納式へ変更",
      "画面上部へ現在のログインモードと連携生徒IDを常時表示",
      "本人・保護者・サポーター・講師のグループ連携設計を文書化"
    ]
  },
  {
    version: "v4.9.0-dev",
    date: "2026-07-23",
    title: "共有スケジュール・外部カレンダー",
    items: [
      "カレンダーへ西暦・月を表示し、予定ドロワーから直接追加可能に変更",
      "本人・保護者・サポーター・講師の登録者表示とFirebase共有を追加",
      "Googleカレンダー追加リンクとApple・Outlook向けICS書き出しを追加"
    ]
  },
  {
    version: "v4.8.3-dev",
    date: "2026-07-23",
    title: "AI提出の通信安定化",
    items: [
      "Firebaseへの一時的な通信失敗を自動再試行",
      "同期失敗時に成功通知を出さず、端末内保持と再提出を案内",
      "重要な提出保存モジュールへバージョン識別子を付け、旧PWAキャッシュを回避"
    ]
  },
  {
    version: "v4.8.2-dev",
    date: "2026-07-23",
    title: "AI提出の安定化と実動作検証",
    items: [
      "画像アップロード前に提出記録を作成し、AI解析結果を上書きする競合を解消",
      "AI解析状態と抽出結果をFirestoreから画面へリアルタイム反映",
      "生徒・保護者・サポーター・講師の認証と共有表示を実ブラウザで検証"
    ]
  },
  {
    version: "v4.8.1-dev",
    date: "2026-07-22",
    title: "OpenRouter画像解析",
    items: [
      "AI提出画像解析の接続先をOpenRouterへ変更",
      "画像入力とJSON Schema構造化出力に対応するモデルをFirebase側で切替可能"
    ]
  },
  {
    version: "v4.8.0-dev",
    date: "2026-07-22",
    title: "AI提出画像自動分類",
    items: [
      "生徒は確認テスト画像を選ぶだけで提出可能",
      "Firebase FunctionsからAI画像モデルへ安全に接続する解析基盤を追加",
      "教科・教材・講座・単元・回答数・正答率を自動抽出",
      "保護者・先生画面では教科・教材順に自動整理しAI解析状態を表示"
    ]
  },
  {
    version: "v4.7.12-dev",
    date: "2026-07-22",
    title: "提出画像フィードバック修正",
    items: [
      "画像提出時に処理中・入力不足・保存失敗・保存成功を明示",
      "二重送信を防止し、Firebase保存後は端末側のBase64画像を除去"
    ]
  },
  {
    version: "v4.7.11-dev",
    date: "2026-07-22",
    title: "常設ログアウト導線",
    items: [
      "全モードのホーム上部に常時表示するログアウトボタンを追加",
      "ログアウト時にメール・パスワード欄を消去して利用者切替を容易に変更"
    ]
  },
  {
    version: "v4.7.10-dev",
    date: "2026-07-22",
    title: "アプリ起動構文修復",
    items: [
      "提出画像プレビューのイベント登録で途切れていた構文を修復",
      "JavaScript停止により動かなかったバージョン表示・ログイン種別・認証ボタンを復旧"
    ]
  },
  {
    version: "v4.7.9-dev",
    date: "2026-07-22",
    title: "ログイン修正キャッシュ反映",
    items: [
      "起動スクリプトにバージョン識別子を付け、端末の旧PWAキャッシュを迂回",
      "ログイン入力保持修正を初回再読み込みから確実に適用"
    ]
  },
  {
    version: "v4.7.8-dev",
    date: "2026-07-22",
    title: "ログインフォーム安定化",
    items: [
      "ログイン画面に現在のバージョン番号を表示",
      "保存済みメールの初期表示を起動直後の一度だけに限定",
      "非同期初期化後の再描画ではメールとパスワードに一切触れない"
    ]
  },
  {
    version: "v4.7.7-dev",
    date: "2026-07-22",
    title: "ログイン入力保持修正",
    items: [
      "起動時の非同期再描画でメールアドレスを上書きしないよう修正",
      "ブラウザのパスワード自動入力をログイン完了まで保持",
      "ドロワー開閉とカウントダウン生成のモジュール分離を完了"
    ]
  },
  {
    version: "v4.7.6-dev",
    date: "2026-07-18",
    title: "schedule drawer分離",
    items: [
      "カウントダウンカードとスケジュール引き出しの描画をui/schedule-drawer.jsへ分離",
      "app.jsは対象データの受け渡しだけを担当",
      "PWAキャッシュ対象にschedule drawerモジュールを追加"
    ]
  },
  {
    version: "v4.7.5-dev",
    date: "2026-07-18",
    title: "dev drawer分離",
    items: [
      "開発中の変更履歴タブ描画をui/dev-drawer.jsへ分離",
      "提出画像ポリシー関数の重複定義を削除し、evidence-policy.jsを参照",
      "PWAキャッシュ対象にdev drawerモジュールを追加"
    ]
  },
  {
    version: "v4.7.4-dev",
    date: "2026-07-18",
    title: "UI navigation分離",
    items: [
      "ホーム下部のタブ描画をui/navigation.jsへ分離",
      "app.jsはナビゲーション描画の呼び出しだけを担当",
      "PWAキャッシュ対象にnavigationモジュールを追加"
    ]
  },
  {
    version: "v4.7.3-dev",
    date: "2026-07-17",
    title: "evidence機能分離",
    items: [
      "提出画像の保存・表示・プレビュー処理をevidenceモジュールへ分離",
      "localStorageとFirebase Storage / Firestore切替の責任境界を整理",
      "PWAキャッシュ対象にevidenceモジュールを追加"
    ]
  },
  {
    version: "v4.7.2-dev",
    date: "2026-07-11",
    title: "fallback data分離",
    items: [
      "app.js内の固定データをassets/js/data/fallbacks.jsへ分離",
      "UI変更やFirebase仕様変更は行わず、現状動作を維持",
      "次回以降、提出画像・認証・画面UIを修正するときに読むコード量を削減"
    ]
  },
  {
    version: "v4.7.1-dev",
    date: "2026-07-11",
    title: "app.js Phase 1分離",
    items: [
      "設定値、ロール方針、カウントダウン、共通ヘルパーを小さなモジュールへ分離",
      "UI変更、機能追加、Firebase仕様変更は行わず、現状動作を維持",
      "Firebase AuthとRole別Homeレイアウトエンジンへ進むためにapp.jsの責務を軽量化"
    ]
  },
  {
    version: "v4.7.0-dev",
    date: "2026-07-11",
    title: "Project Rebuild: Preparing for CORTEX Core",
    items: [
      "index.htmlからCSSとJavaScriptを分離し、画面の骨格だけを残す構成へ変更",
      "assets/jsをES Modulesとして読み込む構成へ変更",
      "auth、ui、learning、teacher、evidence、firebase、utils、configの分離先を新設",
      "CORTEX Coreへ発展できるディレクトリ構造を準備",
      "PWAキャッシュ対象に分離後のCSS/JSを追加"
    ]
  },
  {
    version: "v4.6.7-dev",
    date: "2026-07-11",
    title: "スマホHome整理と予定タブ",
    items: [
      "スマホ表示でブランドカードをコンパクト化し、上部の圧迫感を軽減",
      "設定ボタンをAIユイ先生カードからブランドカード右上へ移動",
      "AIユイ先生の一言を本人・保護者・サポーター・塾講師向けに出し分け",
      "左端にカウントダウン・予定タブを追加し、予定とカレンダーを集約",
      "保護者・サポーター・塾講師向けに本日の提出状況が一目で分かる表示へ調整"
    ]
  },
  {
    version: "v4.6.6-dev",
    date: "2026-07-10",
    title: "PWAキャッシュ更新",
    items: [
      "リロードしても古いバージョンが表示される時のためにキャッシュ更新ボタンを追加",
      "Service WorkerとPWAキャッシュだけを削除し、学習記録は残す復旧導線を追加",
      "ナビゲーション時に最新HTMLを取得しやすい設定へ調整"
    ]
  },
  {
    version: "v4.6.5-dev",
    date: "2026-07-10",
    title: "通知設定の個人化と学習開始日管理",
    items: [
      "通知設定でログイン中ユーザー本人の連絡先だけを表示",
      "メール、LINE、携帯/SMS、その他の通知チャネル入力を追加",
      "Homeの提出画像・設定ボタンを押せる導線へ修正",
      "学習開始日を2026-07-08既定にし、開始日からの経過日数を表示",
      "カウントダウンと学習管理の設定を設定画面へ集約"
    ]
  },
  {
    version: "v4.6.4-dev",
    date: "2026-07-10",
    title: "短期目標カウントダウンと教材連携設計",
    items: [
      "定期テスト、模試、提出期限などをユーザーが追加できる短期目標カウントダウンを追加",
      "近い目標3件を上部カウントダウンへ表示",
      "英文300選の文法分析と映像授業リンクの管理方針を設定へ追加",
      "確認テスト合格後に一段上の類題へ進むAI Teacher設計を追加"
    ]
  },
  {
    version: "v4.6.3-dev",
    date: "2026-07-09",
    title: "ホーム整理と提出画像確認",
    items: [
      "Homeからアカウント詳細を外し、設定・アカウントへ移動",
      "Homeに提出画像確認への短い導線を追加",
      "提出画像タブを新設し、保護者・サポーター・講師が確認しやすい画面に変更",
      "提出画像がない場合も状態が分かる案内を表示"
    ]
  },
  {
    version: "v4.6.2-dev",
    date: "2026-07-09",
    title: "ログイン案内とランダム確認テスト提出",
    items: [
      "ログイン画面を「はじめて使う人」と「登録済みの人」に分けて案内",
      "新規登録ボタンの表記を分かりやすく変更",
      "予定カードに紐づかないランダム確認テスト画像の提出口を追加",
      "提出日時、教科、教材、講座、単元、画像を一覧で整理できるように変更"
    ]
  },
  {
    version: "v4.6.1-dev",
    date: "2026-07-09",
    title: "公開検証用アカウント登録",
    items: [
      "ログイン画面に検証用アカウント登録ボタンを追加",
      "メールアドレスとパスワードでFirebase Authへ登録",
      "選択中の役割でFirestore usersに検証用プロフィールを作成",
      "登録後は自動でログインしてHomeへ移動"
    ]
  },
  {
    version: "v4.6.0-dev",
    date: "2026-07-09",
    title: "スマホ検証UIとFirebase提出準備",
    items: [
      "「ユイ先生」を「AIユイ先生」に変更",
      "スマホの画面切替タブを横スクロール対応",
      "バージョン表示と開発中の更新内容タブを追加",
      "ログイン種別ごとにHomeのダッシュボード表示を変更",
      "Firebase Auth、Firestore、Storageで提出画像を扱う準備を追加",
      "本人、保護者、サポーター、講師で検証しやすい表示へ整理"
    ]
  },
  {
    version: "v4.5.x",
    date: "2026-07-08",
    title: "提出画像の共有設計",
    items: [
      "確認テスト結果スクショのアップロード口を設計",
      "提出画像一覧と拡大確認の画面を追加",
      "保護者、サポーター、講師が学習履歴を確認できる権限設計を追加"
    ]
  },
  {
    version: "v4.4.x",
    date: "2026-07-07",
    title: "学習ルートと全教科計画",
    items: [
      "映像授業、テキスト、確認テスト、復習をつなぐ学習ルートへ整理",
      "英語、数学、理科、古文の8月末プラン作成に対応",
      "到達度テストから受講推奨コースを作る方針を追加"
    ]
  }
];
