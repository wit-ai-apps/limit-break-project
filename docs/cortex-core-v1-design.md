# CORTEX Core v1.0 Design

Status: Draft / Architecture Lock
Date: 2026-07-09
Project: CORTEX Limit Break

## Purpose

CORTEX Core is the shared foundation for CORTEX Limit Break and future CORTEX apps.

The next development phase should stop adding screens one by one and instead separate the core engines from the UI.

The main goal is this:

- UI displays the next action.
- Core decides what the next action should be.
- Firebase stores users, roles, learning records, submissions, and relationships.
- AI Teacher reads structured learning context, not raw screen state.

## Current Policy

Keep GitHub Pages as the public verification environment.

Firebase Hosting should not be moved to immediately. The recommended order is:

1. PWA on GitHub Pages
2. Firebase Authentication
3. Firestore
4. Storage
5. Cloud Functions
6. OpenAI API
7. Firebase Hosting

## Core Modules

### Auth Module

Responsible for login, logout, current user state, and Firebase Authentication integration.

Required fields:

- uid
- email
- displayName
- role
- linked_student_ids
- classroom_ids
- status
- created_at
- last_login_at

### Role And Permission Module

Responsible for deciding what each user can see and do.

Roles:

- student
- parent
- supporter
- counselor
- teacher
- admin

The app may show counselor as a supporter attribute in the UI, but Firestore can keep counselor as an internal role.

### User / Student / Classroom Module

Responsible for people and relationships.

Core collections:

```text
users/{uid}
students/{student_id}
classrooms/{classroom_id}
login_logs/{log_id}
```

Development starts with one student:

```text
STU_0001
room_001
student@example.com
parent@example.com
supporter@example.com
teacher@example.com
```

The structure must still support multiple students later.

### Home Layout Engine

Home should not be a separate page per role.

Home should be one page with role-based card layouts:

```text
Home
├── Student Layout
├── Parent Layout
├── Teacher Layout
├── Supporter Layout
└── Admin Layout
```

The engine returns card definitions. The UI only renders them.

Example:

```json
{
  "role": "student",
  "cards": [
    "today_next_action",
    "today_route",
    "submission_status",
    "review_schedule",
    "ai_yui_message"
  ]
}
```

Parent layout:

```json
{
  "role": "parent",
  "cards": [
    "today_summary",
    "study_time",
    "submission_status",
    "ai_teacher_comment",
    "support_message"
  ]
}
```

Teacher layout:

```json
{
  "role": "teacher",
  "cards": [
    "classroom_submission_list",
    "student_risk_list",
    "weakness_summary",
    "review_overdue",
    "next_instruction_candidates"
  ]
}
```

### Material Engine

Responsible for managing教材 metadata.

It must not distribute copyrighted textbook content or copy paid教材 questions directly.

It stores:

- material_id
- provider
- subject
- course_name
- lesson
- part_or_chapter
- title
- estimated_video_minutes
- text_reference
- knowledge_tags
- prerequisite_tags
- review_tags

Example:

```json
{
  "material_id": "STUDYSAPURI_BASIC_ENGLISH_CH001",
  "provider": "StudySapuri",
  "subject": "英語",
  "course_name": "ベーシックレベル英語",
  "lesson": "第1講",
  "chapter": "Chapter1",
  "title": "肯定文と否定文",
  "estimated_video_minutes": 15,
  "knowledge_tags": ["be動詞", "否定文", "英文の基本"],
  "prerequisite_tags": ["主語", "動詞"],
  "review_tags": ["基本文", "並べ替え", "日英作文"]
}
```

### Learning Engine

Responsible for the learning state machine.

A lesson route should be managed as:

```text
Lesson
↓
Video
↓
Text
↓
Exercise
↓
Confirmation Test
↓
AI Check
↓
Submission
↓
Review Schedule
↓
Completed
```

Mission completion requires:

- video watched
- text checked
- exercise or confirmation test done
- screenshot or result record submitted
- next review scheduled

### Adaptive Learning Route Engine

Responsible for branching the learning route.

The route is not always:

```text
Lesson1 → Lesson2 → Lesson3
```

It can become:

```text
Lesson3
↓
understanding low
↓
Lesson2 review
↓
similar exercise
↓
Lesson3 retry
↓
Lesson4
```

Decision inputs:

- score
- correct_rate
- answer_count
- weakness_reason
- fatigue
- submission_exists
- review_due
- prerequisite_missing
- teacher_override

Decision outputs:

- continue
- review_previous
- retry_same
- add_similar_question
- skip_low_priority
- reduce_load
- notify_teacher

### Mission Engine

Responsible for today's actual instructions.

It converts route decisions into clear student tasks:

```text
09:00 Math
1. Watch video
2. Read text
3. Solve confirmation test
4. Submit result image
5. AI Check
```

The student Home should show only the next action and today's route, not the internal database.

### Evidence / Submission Engine

Responsible for confirmation test screenshots and result records.

Storage path:

```text
students/{student_id}/evidence/{date}/{fileName}
```

Firestore record:

```text
students/{student_id}/evidence_records/{record_id}
```

Fields:

- subject
- course
- lesson
- part_or_chapter
- test_type
- answer_count
- correct_rate
- submitted_at
- submitted_by_uid
- storage_path
- thumbnail_url
- status

Phase 1 only confirms upload and displays the image. Automatic handwriting grading is later.

### Review Engine

Responsible for forgetting-curve review.

Default intervals:

- next day
- 3 days
- 7 days
- 14 days
- 30 days

Review strength changes by result:

- high score: extend interval
- medium score: normal interval
- low score: retry soon
- no submission: move lesson back or mark blocked

### Notification Engine

Responsible for who should be notified.

Examples:

- student submitted evidence
- parent can view submitted image
- teacher should review low score
- supporter can send encouragement
- admin should check system issue

Email sending should eventually use Cloud Functions.

### AI Teacher Gateway

The OpenAI API key must never be stored in frontend code.

Phase 1:

- fixed UI response
- no external AI call

Phase 2:

- Cloud Functions or API server
- OpenAI API key in server environment variable
- send only structured learning context

Inputs:

- current_mission
- subject
- lesson
- latest_score
- weakness_reason
- fatigue
- review_due
- memory_items

Outputs:

- 3-minute check
- hint
- explanation
- review proposal
- encouragement
- teacher summary

## Core Data Model

```text
users/{uid}
students/{student_id}
classrooms/{classroom_id}
courses/{course_id}
materials/{material_id}
lessons/{lesson_id}
knowledge_items/{knowledge_id}
learning_routes/{route_id}
missions/{mission_id}
review_tasks/{review_id}
notifications/{notification_id}
login_logs/{log_id}
```

Student-scoped records may also live under:

```text
students/{student_id}/missions/{mission_id}
students/{student_id}/evidence_records/{record_id}
students/{student_id}/review_tasks/{review_id}
```

## Engine Boundary Rules

1. UI does not decide learning order.
2. UI does not directly calculate route branching.
3. Material Engine does not copy copyrighted教材 questions into the app.
4. Learning Engine controls completion state.
5. Route Engine controls backtracking, skipping, and added review.
6. Mission Engine converts decisions into simple student-facing instructions.
7. Notification Engine decides who needs to know.
8. AI Teacher reads structured Core context.

## One Week Architecture Focus

Day 1:

- Finalize CORTEX Core collections.
- Finalize role and permission matrix.

Day 2:

- Define Home Layout Engine card contracts.
- Separate student, parent, supporter, teacher, admin card sets.

Day 3:

- Define Learning Engine state machine.
- Define mission completion conditions.

Day 4:

- Define Material Engine schema.
- Convert current CSV / textbook metadata into material records.

Day 5:

- Define Adaptive Route Engine decision rules.
- Add score, fatigue, submission, and review conditions.

Day 6:

- Define Evidence / Submission Engine.
- Connect Storage path and Firestore evidence_records.

Day 7:

- Implementation checklist.
- Test scenarios for one student, parent, supporter, and teacher.

## Next Implementation Direction

Do not add more isolated Home cards until Core boundaries are fixed.

Recommended implementation order:

1. Create JS module boundaries.
2. Move role layout logic into `home-layout-engine.js`.
3. Move mission completion logic into `learning-engine.js`.
4. Move教材 metadata logic into `material-engine.js`.
5. Move backtracking and recommendation logic into `route-engine.js`.
6. Keep `index.html` as View only.
7. Connect Firebase after the module boundaries are stable.
