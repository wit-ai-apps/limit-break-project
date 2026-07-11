# CORTEX Limit Break v4.7.2-dev

## 目的

`assets/js/app.js` の肥大化を抑えるため、固定のフォールバックデータを専用モジュールへ分離した。

## 変更内容

- `assets/js/data/fallbacks.js` を追加
- `FALLBACK_DAILY` などの固定データを `app.js` から移動
- `app.js` はデータを import して使う構成へ変更
- PWAキャッシュ名を `cortex-limit-break-v4-7-2-dev` に更新
- `sw.js` のキャッシュ対象に `assets/js/data/fallbacks.js` を追加

## 変更しないこと

- UI表示
- Firebase設定
- ログイン挙動
- 提出画像機能
- localStorageの保存キー

## 次の分離候補

- `ui/home.js`
- `evidence/evidence.js`
- `firebase/auth.js`
- `utils/schedule.js`
