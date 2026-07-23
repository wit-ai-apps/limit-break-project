# 生徒支援グループ設計

## 現在の連携方式

Firebase Authの各利用者に対応する `users/{uid}` が `linked_student_ids` を持ちます。同じ生徒IDを持つ本人、保護者、サポーター、講師は、その生徒の提出記録と共有予定を閲覧します。

```text
users/{uid}
  role: student | parent | supporter | teacher
  linked_student_ids: ["STU_..."]

students/{studentId}
  evidence_records/{recordId}
  schedules/{scheduleId}
```

画面上部には現在のログインモードと、参照中の生徒IDを常時表示します。

## 現時点の制約

- 同じグループに所属する利用者全員の氏名一覧はまだ表示しない
- 招待・承認・脱退・権限変更を行う管理画面はまだない
- 1人の利用者が複数生徒へ紐づく場合、先頭の生徒だけを表示する
- `classroom_ids` は保持しているが、支援グループの正式な台帳にはまだ使用しない

## 正式グループ台帳

次段階では、生徒ごとに次のサブコレクションを追加します。

```text
students/{studentId}/members/{uid}
  uid
  role
  display_name
  relationship
  status: invited | active | suspended
  permissions
  invited_by
  created_at
  updated_at
```

本人または管理者が招待し、招待された利用者が承認してから `active` にします。通常の利用者は同じ生徒グループの有効メンバーだけを閲覧し、APIキーや非公開メモは共有対象に含めません。

## 表示例

```text
連携グループ：STU_TEST_20260722
本人：1名
保護者：1名
サポーター：1名
講師：1名
```

氏名とメールアドレスの表示範囲は役割別に制限し、本人・保護者・管理者以外には必要最小限の表示とします。
