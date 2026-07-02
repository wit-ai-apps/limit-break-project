# Materials First Policy

LIMIT BREAK PROJECTでは、スタディサプリ教材を最優先教材として扱う。

## 目的

Mission、Today's Memory、AI Check Testは、一般問題ではなく、教材の講・PART・Chapter・POINT・講義問題・確認問題・重要公式・重要構文の順番を基準に設計する。

## 役割分担

- Codex: 教材を解析し、JSON化、実装、GitHub Pages反映、画面構築を行う
- Yui: 教育設計、学習理論、AI Check Test、Mission設計、復習アルゴリズムを担当する
- Cursor: UI、機能実装、細かな改善を担当する

## 著作権ガードレール

教材そのものをアプリに取り込んで公開しない。問題文、解答、解説をそのまま複製して配布しない。

推奨する設計:

- 教材は生徒が契約して利用する前提にする
- アプリは「今日はベーシック数学A 第○講 PART2を学習してください」と案内する
- AI Check Testは教材理解を確認するためのオリジナル問題として生成する
- 学習履歴、理解度、復習スケジュールを管理する

## 本人専用アップロード教材

ユーザー本人が教材ページ、単語帳、基本英文、確認テスト答案などをアップロードした場合、OCRと構造解析により本人専用のLesson Memoryを作成できる。ただし、このデータは本人の学習支援に限定し、公開アプリの共通データとして配布しない。

許可すること:

- 本人がアップロードした教材画像をOCRする
- 講、PART、Chapter、No.、学習ポイントを抽出する
- 重要構文、重要公式、重要単語、重要図、解法、ミスパターンを抽象化する
- 抽出した学習ポイントからオリジナルの理解確認問題を作る
- 同じ学習ポイントを扱う類題、英作文、穴埋め、並べ替え、音読、暗唱を作る

避けること:

- 教材の問題文、解答、解説をそのまま保存して公開する
- 教材とほぼ同じ問題を再現して配布する
- 本人専用OCRデータを他のユーザーへ流用する
- 教材PDFそのものをアプリ内で再配布する

## Knowledge Extraction Engine

CORTEXシリーズでは、教材理解と毎日のナビゲーションを分ける。

- CORTEX Edu: 教材撮影、OCR、レイアウト解析、知識抽出、本人専用JSON生成
- CORTEX Limit Break: 今日の学習ナビゲーション、AI Teacher、理解確認問題、定着テスト、忘却曲線管理

抽出の流れ:

1. 教材撮影またはPDFアップロード
2. OCR
3. レイアウト解析
4. 知識抽出
5. Lesson Memory化
6. AI Teacherへ接続
7. 理解確認問題と復習Missionを生成

AIは教材をコピーするのではなく、学習ポイントを抽象化して利用する。

## JSON化方針

PDF解析では、本文や問題文ではなく、次のような構造メタデータを保存する。

- subject
- course_name
- lesson
- part_or_chapter
- title
- source_page_range
- teaching_order
- points_count
- lecture_problem_count
- check_problem_count
- important_formula_count
- important_structure_count
- concept_tags
- generated_outputs

この方針により、教材の価値を活かしつつ、LIMIT BREAK PROJECT独自のAIコーチング、復習管理、理解度判定を提供する。
