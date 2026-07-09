# Firebase Console Checklist

CORTEX Limit BreakをFirebaseへ接続するための初期設定チェックリストです。

## 1. Firebaseプロジェクトを作成

1. Firebase Consoleを開く
2. プロジェクトを追加
3. プロジェクト名例: `cortex-limit-break`
4. Google Analyticsは検証段階では任意

## 2. Webアプリを追加

1. プロジェクト概要からWebアプリ `</>` を追加
2. アプリ名例: `CORTEX Limit Break Web`
3. Firebase Hostingは現時点では不要。GitHub Pagesを継続利用する
4. 表示されたFirebase設定をコピー
5. `data/firebase_config.json` の `firebase` に貼り付ける
6. `enabled` を `true` にする

## 3. Authenticationを有効化

1. Authenticationを開く
2. 始める
3. Sign-in methodを開く
4. メール/パスワードを有効化
5. テストユーザーを作成

初期テストユーザー例:

- 生徒: `student@example.com`
- 保護者: `parent@example.com`
- サポーター: `supporter@example.com`
- 講師: `teacher@example.com`

パスワードは本番と共有しない検証用にする。

## 4. Firestore Databaseを作成

1. Firestore Databaseを開く
2. データベースを作成
3. ロケーションを選択
4. 初期は本番モードで作成
5. `firebase/firestore.rules` の内容をRulesへ貼り付け

## 5. Storageを作成

1. Storageを開く
2. 始める
3. ロケーションを選択
4. `firebase/storage.rules` の内容をRulesへ貼り付け

## 6. users / students / classrooms を作成

`data/firebase_seed_example.json` を参考に、Firestoreへ以下を作成する。

```text
users/{uid}
students/STU_0001
classrooms/room_001
```

重要:

- `{uid}` はAuthenticationで作成されたユーザーのUIDに置き換える
- `linked_student_ids` に `STU_0001` を入れる
- 講師には `classroom_ids: ["room_001"]` を入れる

## 7. アプリ側設定

`data/firebase_config.json`:

```json
{
  "enabled": true,
  "student_id": "STU_0001",
  "firebase": {
    "apiKey": "...",
    "authDomain": "...",
    "projectId": "...",
    "storageBucket": "...",
    "messagingSenderId": "...",
    "appId": "..."
  }
}
```

## 8. 動作確認

1. アプリを開く
2. 生徒として確認テストを提出
3. 画像を選択
4. 保存
5. Firestoreの `students/STU_0001/evidence_records` に記録ができるか確認
6. Storageの `students/STU_0001/evidence` に画像が入るか確認
7. アプリの提出画像一覧で保存先が `Firebase` と表示されるか確認

## 9. 注意

- OpenAI APIキーはFirebase設定に入れない
- 管理者秘密鍵はフロントエンドに置かない
- メール通知自動送信はCloud Functions導入後に行う
- 本格運用前にSecurity Rulesを必ずテストする
