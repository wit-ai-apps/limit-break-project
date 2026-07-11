# CORTEX Limit Break v4.7.1-dev

## app.js Phase 1分離

目的は、`app.js` の巨大化を止め、今後の修正時に読むべき範囲を小さくすること。

今回の分離対象:

- `config/app_config.js`: アプリ名、バージョン、localStorageキー、画面ID、リリースノート
- `assets/js/auth/roles.js`: ロール定義、公開ロール、サポーター属性
- `assets/js/utils/countdown.js`: 入試日程、日付計算、カウントダウン表示
- `assets/js/utils/helpers.js`: 共通ヘルパー

今回やらないこと:

- UI変更
- Firebase仕様変更
- 新機能追加
- 画面構成変更

確認方針:

- 既存の表示と操作を維持する
- `app.js` は外部モジュールを import して使う
- Service Workerのキャッシュ対象に分離ファイルを追加する
