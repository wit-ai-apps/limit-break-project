# Limit Break APIキー管理方針

## 基本方針

Limit BreakのOpenRouterなどの外部APIキーは、Firebase Secret Managerで管理します。GitHub PagesのHTML・CSS・JavaScriptから外部AI APIを直接呼び出さず、Firebase FunctionsをサーバーAPIとして経由します。

## 実装ルール

1. 実際のAPIキーを利用者へ要求しない
2. ソースコードにはSecret名などの識別子だけを記載する
3. APIキーはFirebase Secret ManagerからFunctions実行時に読み込む
4. Secretが未設定の場合は安全に処理を終了する
5. キーの値をログ、レスポンス、画面、コメント、サンプル、報告書へ出さない
6. フロントエンドから外部AI APIを直接呼び出さない
7. 外部AI APIはFirebase Functionsから呼び出す
8. コミット前に秘密情報が混入していないことを確認する
9. `.env`、Secret用ファイル、FirebaseログをGit管理から除外する
10. 実装報告ではキーの状態を「設定済み／未設定」だけで表す

## 禁止する保存先・手法

- HTML、JavaScript、GitHub管理ファイル
- localStorage、IndexedDB、Firestore、Firebase Remote Config
- Base64、難読化、フロント側の暗号化だけで隠す方法
- 通常の環境設定ファイルへの実キー記載

## キーの登録・更新

利用者本人がFirebase CLIのマスク入力へ直接貼り付けます。AIへキーを渡す必要はありません。

```bash
firebase functions:secrets:set OPENROUTER_API_KEY
```

登録後もキー全体は再表示しません。漏えいの可能性がある場合は、該当キーを無効化して新しいキーへ交換します。

## 管理画面を将来追加する場合

現時点ではAPIキー入力画面を作りません。将来追加する場合は、管理者認証、HTTPS、CSRF対策、レート制限、セッション対策、POST限定、ログ除外、再表示禁止を必須とします。保存先は引き続きサーバー側の秘密管理領域とします。
