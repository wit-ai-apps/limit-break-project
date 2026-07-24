# Firebase Storage + Firestore Setup

CORTEX Limit Breakで、確認テスト結果スクショを生徒本人以外の保護者、サポーター、塾講師が確認できるようにするための設定メモです。

## 目的

- 生徒が提出したスタサプ確認テスト結果スクショをFirebase Storageへ保存する
- 提出記録をFirestoreへ保存する
- 保護者、サポーター、塾講師が別端末から提出状況と画像を確認できるようにする
- 手書き採点、OCR、自動採点は後続フェーズにする

## アプリ側設定

`data/firebase_config.example.json` をコピーして `data/firebase_config.json` を作成します。

```json
{
  "enabled": true,
  "student_id": "STU_0001",
  "firebase": {
    "apiKey": "YOUR_FIREBASE_WEB_API_KEY",
    "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
    "projectId": "YOUR_PROJECT_ID",
    "storageBucket": "YOUR_PROJECT_ID.appspot.com",
    "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
    "appId": "YOUR_FIREBASE_APP_ID"
  }
}
```

`enabled` が `false` の場合は、従来どおりブラウザの `localStorage` に保存します。

## Storage保存先

```text
students/{student_id}/evidence/{date}/{record_id}-{timestamp}-{file_name}
```

例:

```text
students/STU_0001/evidence/2026-07-08/2026-07-08_MATH_001-1780000000000-result.jpg
```

## Firestore保存先

```text
students/{student_id}/evidence_records/{date}_{mission_id}
```

AIが問題・生徒解答・正解を高信頼で確認できた不正解は、次の弱点専用コレクションにも保存します。

```text
students/{student_id}/learning_issues/{issue_id}
```

同じ教科・分野・単元・技能・誤り種別は同じ`issue_id`へ集約し、`occurrence_count`を加算します。問題文全体は保存せず、80文字以内の要約、技能タグ、誤り種別、元の提出記録IDとStorageパスを保持します。

例:

```text
students/STU_0001/evidence_records/2026-07-08_MATH_001
```

## Firestoreレコード

```json
{
  "student_id": "STU_0001",
  "missionId": "MATH_001",
  "missionTitle": "数学Ⅰ 第1講 PART1",
  "subject": "数学Ⅰ",
  "course": "ベーシックレベル数学Ⅰ",
  "lesson": "第1講",
  "part": "PART1",
  "testType": "初回確認テスト",
  "answeredCount": "14",
  "score": "64",
  "understanding": "4",
  "fatigue": "2",
  "evidenceImageName": "result.jpg",
  "evidenceImageUrl": "https://firebasestorage.googleapis.com/...",
  "evidenceStoragePath": "students/STU_0001/evidence/2026-07-08/...",
  "visible_to": ["student", "parent", "supporter", "teacher"],
  "firebaseSyncStatus": "synced",
  "updated_at": "serverTimestamp"
}
```

## 検証用ルール

初期検証では、読み書きを対象パスだけに限定します。公開運用では使わないでください。

### Firestore 検証用

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /students/{studentId}/evidence_records/{recordId} {
      allow read, write: if true;
    }
  }
}
```

### Storage 検証用

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /students/{studentId}/evidence/{date}/{fileName} {
      allow read, write: if true;
    }
  }
}
```

## 正式運用ルール方針

正式運用ではFirebase Authenticationを使い、`users/{uid}` の `linked_student_id` と `role` を見て許可します。

想定ロール:

- `student`
- `parent`
- `supporter`
- `counselor`
- `teacher`
- `admin`

正式運用の基本方針:

- 生徒本人は自分の提出画像を作成、閲覧できる
- 保護者はリンクされた生徒の提出画像を閲覧できる
- サポーターは必要最小限の提出状況を閲覧できる
- 塾講師は画像、正答率、疲労度、間違い理由を閲覧できる
- カウンセラー属性は必要時のみ閲覧し、成績詳細は制限する
- 画像本体をメール添付しない
- メールには提出通知とアプリ内確認導線のみを入れる

## 次フェーズ

1. Firebase Authenticationを導入する
2. `users/{uid}` に role と linked_student_id を保存する
3. Firestore Rulesで role 別閲覧制御を行う
4. Cloud Functionsで提出通知メールを送る
5. Storage画像をOCR、自動採点、AI分析へ接続する
