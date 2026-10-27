---
name: auto-commit
description: Plan cohesive local commits from staged changes and execute the concrete plan after approval. Use when asked to organize or commit staged work in this project. Never push.
---

# Auto Commit

## Inspect and plan

1. Read applicable repository instructions. Inspect `git status --short`,
   `git diff --cached --stat`, `git diff --cached --name-status`,
   `git diff --cached --check`, and the full staged diff (`--binary`).
   Understand intent from staged content; do not include working-tree edits.
2. If nothing is staged, report that and stop. If the index has unresolved
   conflicts, stop and report them without modifying it.
3. Record the branch, HEAD (or unborn state), and a fingerprint of the staged
   diff. Keep planning read-only; do not stage, reset, stash, or edit files.
4. Choose the smallest cohesive sequence: one commit for a single purpose,
   multiple commits for independent concerns. Keep supporting tests/docs with
   their change and order dependencies first. Group by path, not arbitrary
   file counts; keep each path's complete staged content together, including
   both sides of a rename. Do not split hunks within a file.
5. Present the commit count, concise rationale, and each English commit title
   with its exact project-relative staged paths. Assign every staged change
   exactly once. Prefer concise imperative titles and existing conventions.
6. Ask for approval before mutation, unless the user already explicitly
   approved this concrete plan. A generic request to commit is not approval
   of a newly proposed plan. If scope changes, revise and seek approval again.

## Execute the approved snapshot

1. Recheck branch, HEAD, and staged fingerprint. Stop if they changed.
   After approval, save the index tree with `git write-tree` as the immutable
   staged snapshot. Record working-tree/untracked state for preservation checks.
2. For one commit, commit the existing index without path arguments or staging.
3. For multiple commits, leave the real index and working tree untouched:
   - Use a temporary index via `GIT_INDEX_FILE`, initialized from current HEAD
     with `git read-tree HEAD` (or `git read-tree --empty` for an unborn branch).
   - Generate a binary, full-index patch from current HEAD (or the empty tree)
     to the saved snapshot, restricted to the approved group's literal paths.
     Apply it only to the temporary index with `git apply --cached`.
   - Verify the temporary staged diff matches the approved group, then run
     normal `git commit` with that index. Repeat from the new HEAD per group.
     The unchanged real index retains the full snapshot, so its diff against
     each new HEAD represents the remaining staged work.
4. Before each commit record its expected index tree; afterward compare the
   resulting commit tree, real index, and working-tree/untracked state with
   expectations. Respect hooks: never use `--no-verify`. On failure or hook
   changes, stop and report before continuing an outdated plan. Preserve
   recovery snapshots; do not automatically reset, amend, or discard changes.
5. Never use `git add -A`, `git add .`, `git commit -a`, or `git commit --only`.
   Preserve partial staging, unstaged edits, and untracked files. Do not push
   or modify remotes. Do not bypass hooks that cannot use a temporary index.
6. Report each created commit's short SHA and title, and the remaining staged
   paths (or none). Report any preservation mismatch or incomplete commit.
