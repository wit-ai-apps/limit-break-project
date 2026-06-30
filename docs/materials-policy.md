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
