# PLAN.md: the shape

One file at the repository root. Four layers as headings and list items, in this exact form so `scripts/pb-plan.mjs` can parse it and so a second agent reads it the same way. Ids in `{#…}` are optional until the plan is synced with ProductBrain (mode B), which assigns them.

```markdown
# Product plan: Ghost

<!-- product-plan v1 · productbrain: ghost -->

## Goal: Independent publishers earn a living on the platform {#goal-1}
Measure: paying members per publication, month over month
Ghost's reason to exist. Everything under here serves it.

### Need: A reader who likes one post has no way to find the next {#need-3}
Discovery is the top of the membership funnel.

#### Approach: A presence on the open social web (ActivityPub) [development] {#approach-7}
Measure: follows from other servers per week
Federate publications so readers follow from anywhere.

- [x] Job: A publication has a followable address (phase: 6.0) {#job-40}
- [ ] Job: A follow from another server shows up within a minute (phase: 6.1) {#job-41}
  Notes: inbox handler shipped 2026-09-02; delivery retries still open.

#### Approach: Recommendations between publications [resolved] {#approach-8}
Measure: click-through from recommendations
Shipped and settled; no jobs listed.

## Tasks
- [ ] Task: Rotate the newsletter sending key (phase: 6.1) {#task-2}
```

Rules the parser and the reader both rely on:

- `## Goal:`, `### Need:`, `#### Approach:` are the three heading levels. Nothing else at those levels. A bet is written as `#### Approach:`, matching the type ProductBrain stores.
- A bet carries its status in square brackets: `[development]`, `[validation]`, `[resolved]`, `[retired]`. Omitted means `development`.
- A job is a list item under a bet: `- [ ] Job: <label> (phase: <name>)`. `[x]` means `done`: live in production, nothing less. `(phase: …)` is optional.
- A `Measure:` line directly under a goal or bet is its measure. Other text under a heading is its description. An indented `Notes:` line under a job is its notes.
- `## Tasks` holds standalone tasks (bugs, polish, work outside the tree), same list form with `Task:`.
- Keep labels as outcomes and checkpoints, in the user's words. "Add Redis cache" is not a job; "Price comparison loads in under two seconds" is.

The four layers, and why each exists:

| Layer | Question it answers | Wrong example | Right example |
|---|---|---|---|
| Goal | What outcome are we after, and how would we know? | "Build the billing page" | "Publishers earn a living here (paying members per publication)" |
| Need | What user problem stands between us and the goal? | "Stripe integration" | "A reader who likes one post cannot find the next" |
| Bet | What is our bet on how to meet the need, and is it still live? | "Phase 2" | "Recommendations between publications [validation]" |
| Job | What can someone observe when it works? | "Add webhook handler" | "A follow from another server shows up within a minute" |
