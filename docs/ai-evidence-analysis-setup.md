# AI提出画像解析セットアップ

## 概要

生徒がFirebase Storageへ提出画像を保存すると、`analyzeEvidenceImage` がOpenRouter経由で画像を解析し、Firestoreの提出記録へ教科、教材、講、単元、テスト種別、回答数、正答率、AI信頼度を追記します。OpenRouter APIキーはブラウザへ置かず、Firebase Functions Secretとして保持します。

## 初回セットアップ

```bash
npm --prefix functions install
firebase functions:secrets:set OPENROUTER_API_KEY
firebase deploy --only functions,firestore:rules,storage
```

必要に応じて画像入力と構造化出力に対応したモデルへ変更します。未指定時は `openai/gpt-4o-mini` を使用します。

```bash
firebase functions:config:set OPENROUTER_VISION_MODEL=openai/gpt-4o-mini
```

## Firestore解析状態

- `queued`: アップロード済み、解析開始待ち
- `processing`: AI解析中
- `completed`: 自動分類完了
- `needs_review`: 信頼度が低く、本人または先生の確認が必要
- `error`: 解析失敗。提出画像自体は保持

## セキュリティ

- OpenRouter APIキーをGitHub Pages、`config/*.js`、Firebase Remote Configへ置かない
- 問題文・解答本文は保存せず、教材識別用の短い見出しだけを構造化する
- StorageとFirestoreの既存ロールルールを維持する
