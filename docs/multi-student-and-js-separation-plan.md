# CORTEX Limit Break Multi Student and JS Separation Plan

## 開発中の前提

開発中は、まず1人の生徒を中心に運用検証する。

対象:

- 生徒本人: `student`
- 保護者: `parent`
- 保護者以外のサポーター: `supporter`
- 学習塾講師または学校教師: `teacher`
- 心理カウンセラー属性は、表面上は `supporter` の属性として扱う

初期の `student_id` は `STU_0001` とする。

この段階では、複数生徒の画面実装を急がず、提出画像、確認テスト記録、復習判断、保護者・支援者閲覧の流れを1人分で完成させる。

## 将来拡張の目的

将来的に、1人の先生が複数生徒を管理できるようにする。

必要になる機能:

- 生徒一覧
- 生徒ごとの今日の課題
- 提出画像一覧
- 未提出一覧
- 正答率・疲労度・復習漏れの一覧
- 教室単位の提出率ダッシュボード
- 保護者・サポーター・講師ごとの閲覧制御

## Firestore構造 拡張版

```text
users/{uid}
  role: student | parent | supporter | counselor | teacher | admin
  linked_student_ids: [student_id, ...]
  classroom_ids: [classroom_id, ...]
  displayName
  email
  status
  created_at
  last_login_at

students/{student_id}
  display_name
  grade
  classroom_ids: [classroom_id, ...]
  primary_teacher_uid
  supporter_uids: [uid, ...]
  parent_uids: [uid, ...]
  status

classrooms/{classroom_id}
  name
  teacher_uids: [uid, ...]
  student_ids: [student_id, ...]
  subject
  status

students/{student_id}/evidence_records/{record_id}
  subject
  course
  lesson
  part
  test_type
  answered_count
  correct_rate
  understanding
  fatigue
  submitted_at
  submitted_by_uid
  storage_path
  image_url
  visible_to: [student, parent, supporter, teacher]

students/{student_id}/missions/{mission_id}
  date
  subject
  course
  lesson
  part
  status
  due_date
  shifted_from
  shifted_reason

login_logs/{log_id}
```

## classroom_idの扱い

Claude Chatからの確認事項に対する現時点の設計回答:

### 1. `classroom_id` を `users/{uid}` にも持たせるか

持たせる。

理由:

- 先生が複数教室を担当する可能性が高い
- 管理画面で「自分が担当する教室一覧」をすぐ取得できる
- Firestore Rulesで `classroom_ids` を使って閲覧権限を判定しやすい

フィールド名は単数ではなく `classroom_ids` とする。

### 2. 生徒が複数教室に所属するケースはあるか

あり得るものとして設計する。

例:

- 英語クラス
- 数学クラス
- 夏期講習クラス
- 個別指導枠

そのため `students/{student_id}` 側も `classroom_ids` の配列にする。

### 3. 現在のHTML構成

現在は `index.html` 1ファイル構成。

HTML、CSS、JavaScriptが同一ファイルに入っている。

次フェーズで段階的に分離する。

## HTML/JS分離方針

最終構成:

```text
/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── firestore.js
│   ├── storage.js
│   ├── evidence.js
│   ├── classroom.js
│   ├── navigation.js
│   └── ui.js
├── data/
│   ├── firebase_config.json
│   └── firebase_config.example.json
└── docs/
```

## 分離時の責務

### `index.html`

- 画面構造
- id/class
- dialog
- nav
- form
- script読み込みのみ

### `css/style.css`

- すべてのスタイル
- レスポンシブ設定
- カード、表、モーダル、ボタンの見た目

### `js/app.js`

- 起動処理
- 初期データロード
- ルーティング
- 全体レンダリング呼び出し

### `js/auth.js`

- Firebase Authentication
- 仮ログインとの互換
- ロール判定
- linked_student_ids / classroom_ids の取得

### `js/firestore.js`

- Firestore接続
- users / students / classrooms / evidence_records の読み書き
- localStorage fallback

### `js/storage.js`

- Firebase Storageアップロード
- ダウンロードURL取得
- storage path生成

### `js/evidence.js`

- 確認テスト提出
- 提出画像一覧
- 画像拡大
- 提出済み判定
- 未提出時の翌日繰り越し

### `js/classroom.js`

- 教室一覧
- 生徒一覧
- 教室別提出状況
- 複数生徒ダッシュボード

### `js/navigation.js`

- Learning Navigation Mode
- 今日の次の一手
- Journey Map
- Mission Clear後の次講義表示

### `js/ui.js`

- 共通UI部品
- escapeHtml
- formatDate
- dialog制御
- role別表示補助

## 実装優先順位

### Phase 1: 1生徒Firebase提出保存

- 現在の仮ログインを維持
- `STU_0001` の提出画像をFirebase Storageへ保存
- Firestoreへ提出記録を保存
- 保護者、サポーター、講師が提出一覧を見られる導線を作る

### Phase 2: Auth + role管理

- Firebase Authenticationを導入
- `users/{uid}` に role / linked_student_ids / classroom_ids を保存
- ロール別表示をFirestoreベースに移行

### Phase 3: HTML/JS分離

- CSSを `css/style.css` へ移動
- Firebase関連を `js/firestore.js` / `js/storage.js` へ移動
- 提出画像関連を `js/evidence.js` へ移動
- index.htmlはView中心にする

### Phase 4: classroomsコレクション追加

- `classrooms/{classroom_id}` を追加
- 先生が教室単位で生徒一覧を取得
- 生徒側も `classroom_ids` を保持

### Phase 5: 教室ダッシュボード

- 生徒別提出状況
- 未提出一覧
- 正答率の要約
- 疲労度の警告
- 復習漏れ一覧

### Phase 6: role別閲覧制御

- Firestore Rules
- Storage Rules
- parent / supporter / teacher / counselor の表示差分
- 画像URLの扱いを本番仕様へ変更

## 実装上の注意

- 開発中は1人の生徒に集中する
- 複数生徒対応はDB構造だけ先に逃がす
- Home画面は複数生徒管理画面にしない
- 先生・管理者向けの複数生徒画面は別画面にする
- 生徒画面は引き続き「今日の次の一手」だけを中心にする
- Firebase設定値はブラウザに置けるWeb App設定だけにする
- OpenAI APIキーや管理者秘密鍵は絶対にフロントに置かない
