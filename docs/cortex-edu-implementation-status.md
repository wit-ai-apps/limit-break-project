# CORTEX EDU / LIMIT BREAK 実装検証台帳

- 更新日: 2026-07-31 JST
- 基準文書: [CORTEX EDU 基本構想 SSOT v1.0](cortex-edu-ssot-v1.md)
- 注意: `CODE_VERIFIED`はコードの存在を確認した状態であり、公開環境での完全動作を保証しない。

## 現在の確認結果

| 機能 | 状態 | 確認根拠 | 次の確認 |
|---|---|---|---|
| Firebase Authentication | CODE_VERIFIED / UI_VERIFIED / PRODUCTION | Google・メール認証コード、公開画面でログイン確認 | 役割変更・回復フロー |
| 生徒基本ドキュメント | CODE_VERIFIED / PRODUCTION | `students/{studentId}`作成処理 | 必須項目と組織境界 |
| 生徒・保護者・講師連携 | CODE_VERIFIED / PRODUCTION | `members`、招待、`linked_student_ids` | 解除・再招待・監査 |
| 教室・学年・グループ・レベル | CODE_VERIFIED / PRODUCTION | 教師Workspace Functionsと画面 | 実データでのUI検証 |
| 提出画像・解析記録 | CODE_VERIFIED / PRODUCTION | `evidence_records`とStorage処理 | 問題単位答案への分離 |
| 二重AI再採点 | CODE_VERIFIED / REPORTED_IMPLEMENTED | OpenRouter一次・再判定処理 | 講師確定正解との精度測定 |
| 弱点候補 | CODE_VERIFIED | `learning_issues`生成処理 | 統一技能コードへの移行 |
| 自動学習計画 | CODE_VERIFIED | `adaptive_plans`、`adaptive_state` | 一次関数MVPでの妥当性 |
| 数学毎日10題 | CODE_VERIFIED / UI_VERIFIED / PRODUCTION | トレーニング画面と提出処理 | 正式答案・技能との接続 |
| 英語毎日10文 | REPORTED_IMPLEMENTED | 既存画面・実装報告 | コード・UI・教材権利の再確認 |
| AIユイ先生 | CODE_VERIFIED / UI_VERIFIED / PRODUCTION | 役割別表示・質問処理 | 出力根拠と公開範囲監査 |
| 保護者質問 | CODE_VERIFIED / UI_VERIFIED / PRODUCTION | `guardian_questions` Functions | 回答品質・通知 |
| 公開範囲・閲覧履歴 | CODE_VERIFIED | privacy、access_logs | 実効権限の侵入テスト |
| 正式成績 | PROPOSED | SSOT | データモデル設計 |
| 問題単位答案 | PROPOSED | SSOT | データモデル設計 |
| learnerId | PROPOSED | SSOT | STU_ID対応・統合分離設計 |
| 統一技能コード | PROPOSED | SSOT | 中2一次関数MVP |
| 技能別習熟度 | PROPOSED | SSOT | 技能コード確定後 |
| 教材登録・構造化 | PROPOSED | SSOT | 権利状態・Edu bc境界 |
| 学校・塾成績統合 | PROPOSED | SSOT | Phase 8 |
| 生涯学習ポートフォリオ | PROPOSED | SSOT | Phase 9 |

## P0セキュリティ確認

現在のFirestore Rulesには、通常講師の直接書き込み条件が担当生徒との連携確認より広い箇所がある。正式成績・生涯学習情報を追加する前に、以下を修正・検証する。

- `students/{studentId}`の作成・更新
- `evidence_records`の作成・更新・削除
- `materials`の作成・更新・削除
- `schedules`の講師操作
- `classrooms`と`linked_student_ids`の整合
- Admin SDKを使う全Callable Functionの組織・担当確認

完了条件:

1. 担当外生徒のIDを知っていても読めない
2. 担当外生徒のIDを知っていても書けない
3. 別組織の教室・教材・答案を検索できない
4. 担当解除後はアクセスできない
5. 重要操作が監査ログへ残る
6. Emulatorテストで拒否条件と許可条件の両方を検証する

## 状態更新ルール

- コードを確認しただけで`UI_VERIFIED`へ上げない
- 画面表示だけで`TEST_VERIFIED`へ上げない
- ローカル実装だけで`PRODUCTION`へ上げない
- 外部AIの報告だけなら`REPORTED_IMPLEMENTED`に留める
- ユイ承認とユーザGOを別々に記録する
- 公開後も権限・データ移行・監査が未確認なら、その事実を併記する

