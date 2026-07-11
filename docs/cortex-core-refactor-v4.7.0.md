# CORTEX Limit Break v4.7.0 Refactor

## Purpose

v4.7.0 is the first Project Rebuild step for preparing CORTEX Core.

The immediate goal is to reduce token usage and make future changes safer by moving the large inline CSS and JavaScript out of `index.html`.

## Current Boundary

- `index.html`: view shell only
- `assets/css/style.css`: current app styling
- `assets/js/app.js`: current app behavior, loaded as an ES module
- `assets/js/auth`: authentication and role boundary
- `assets/js/ui`: Home, navigation, dashboard, dialogs
- `assets/js/learning`: mission, review, memory, route
- `assets/js/teacher`: AI Teacher and AI Check
- `assets/js/evidence`: submitted images and screenshot evidence
- `assets/js/firebase`: Firebase App, Auth, Firestore, Storage
- `assets/js/utils`: schedule, countdown, helpers
- `config`: app, Firebase, AI, and theme configuration

## Rule

`index.html` should stay under 500 lines whenever possible.

## Next Refactor Step

Move functions from `assets/js/app.js` into the prepared modules by feature area, one feature at a time, with browser verification after each move.
