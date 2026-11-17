# Admin tool protection and visibility

- [x] Inspect the existing editor, option controls, event payload and browser QA conventions.
- [x] Add browser regression coverage for selected-tool editing, symmetric pairs, moon scopes and visibility.
- [x] Replace the full rule list with selected-tool controls and preserve shared scoped pairs.
- [x] Add separate event/preset visibility controls, keeping random exclusions independent.
- [x] Run browser regression, responsive checks, TypeScript and production build.

Verification: Playwright tool/visibility regression passed, including inverse scoped-rule merging and 390px layout. `npm run typecheck`, `npm run build`, and `git diff --check` passed. Production build retains the existing large-chunk warning. Existing rating regression failed its immediate post-reset assertion; rerunning with an in-memory wait for the asynchronous reset passed all checks, without modifying that existing test. API responses in browser QA were intercepted fixtures; live server role enforcement is verified separately.

Visibility follow-up: publishing Last survivor now removes both its preset restriction and the World Relay event restriction in one request. Hiding Last survivor changes only the preset restriction. The browser regression first failed on the missing linked publication, then passed after implementation, including independent re-hiding, reload and mobile layout. Badge access help matches the server's Admin/Developer/Youtuber badge rule. TypeScript and production build passed again.
