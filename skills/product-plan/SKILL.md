---
name: product-plan
description: Read the product plan before coding and write the job back when it ships. Use when the user mentions the plan, PLAN.md, ProductBrain, "why does this exist", "what are we building and why", a roadmap or a product bet. Also use it before starting any non-trivial feature, and at the end of a task to record what changed. If no plan exists, bootstraps one from the repository as PLAN.md (no account needed); if PRODUCTBRAIN_API_KEY is set, syncs it with ProductBrain over the API.
---

# product-plan

A coding agent starts every session cold. The code says what was built; nothing on disk says why. This skill gives the agent one thing to read first and one place to write back: a product plan in four layers, kept as `PLAN.md` in the repository (mode A) or in ProductBrain (mode B), which is the same plan with an API, a canvas, share links and history.

**Read before you code. Write back when it ships. Bootstrap when there is nothing.**

## The four layers

Read `references/plan-shape.md` for the full format. In one breath:

- **Goal**: an outcome with a measure. Not a feature.
- **Need**: a user problem under a goal.
- **Bet**: how you plan to meet the need, with a status: `development`, `validation`, `resolved`, `retired`. Written as `#### Approach:` in `PLAN.md` and stored as type `approach` in ProductBrain.
- **Job**: an observable checkpoint under a bet ("a follow from another server shows up within a minute"), assigned to a phase, `done` only when live in production.

Implementation detail is not a job. It goes in the job's notes or in the code.

## Which mode

1. `PRODUCTBRAIN_API_KEY` set → **mode B**. The plan of record is the ProductBrain project (`PRODUCTBRAIN_PROJECT_ID`, or ask). `PLAN.md` is a local mirror written by `scripts/pb-plan.mjs pull`.
2. Otherwise, `PLAN.md` exists at the repository root → **mode A**. The file is the plan of record.
3. Otherwise → **bootstrap** (below), then mode A.

Never search the filesystem, env files or credential stores for a key. If the user wants mode B and the key is not set, say so and stop.

## Before coding (every non-trivial task)

1. Find the branch of the plan the task belongs to. Mode A: read `PLAN.md` and locate the bet whose need the task serves. Mode B: `GET /api/v1/search?q=<task in the user's words>` returns nodes with ancestor paths; read the bet with `GET /api/v1/tree?nodeId=<id>&direction=up`.
2. State it back in one line before starting: "This serves *<need>* under *<goal>* via the bet *<bet>* (status <status>)." If the task fits nowhere, say that instead of inventing a place; ask whether it is a new bet, a new need, or a task outside the tree.
3. If the bet is `retired` or `resolved`, stop and ask. Rebuilding a retired bet by accident is the failure this skill exists to prevent.

## When it ships

1. Add the job if it was not in the plan: under the bet it serves, as a checkpoint someone can observe, with the phase it belongs to.
2. Mark it `done` only when the change is live in production. Merged to a staging branch is not done.
3. Record what changed in one line under the job (mode A: a `Notes:` line; mode B: the `notes` field via `POST /api/v1/mutate`). Decisions go here, not in chat.
4. Mode B: `scripts/pb-plan.mjs push` after editing `PLAN.md`, or call the API directly; `pull` to refresh the mirror.

## Bootstrap (no plan exists)

Build the plan the product genuinely warrants: not padded to look thorough, not held back to keep it small. `references/bootstrap.md` is the recipe (it is the same one that reconstructed the public example plans from open-source repositories, so it has been shown to produce 100-node plans from a cold start).

1. Study the repository: README, docs, package manifests, the shape of the code, recent history. Understand what the product does and what is actually being built and shipped now.
2. Draft goals (usually 1 to 6), each with a measure. Then the needs under each. Then the bets, with an honest status: what is shipped and settled is `resolved` or `validation` and stays job-free; only actively worked bets get jobs.
3. Write `PLAN.md` in the format in `references/plan-shape.md`. Show the user the goals and ask one question: "Is this the why?" Adjust, then continue.
4. Mode B: `scripts/pb-plan.mjs push` creates the project's nodes and writes the ids back into `PLAN.md`.

## Mode B: the API in three calls

Base URL `https://productbrain.com/api/v1`, header `Authorization: Bearer $PRODUCTBRAIN_API_KEY`. The full contract is one page: <https://productbrain.com/docs/llm-guide.md>. Read it once per session in mode B.

```bash
curl -s "$API_URL/search?projectId=$P&q=<phrase>" -H "Authorization: Bearer $PRODUCTBRAIN_API_KEY"      # find the branch
curl -s "$API_URL/tree?projectId=$P&nodeId=approach-3&direction=down" -H "Authorization: Bearer $PRODUCTBRAIN_API_KEY"   # read it in context
curl -s -X POST "$API_URL/mutate" -H "Authorization: Bearer $PRODUCTBRAIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"action":"add","projectId":"'"$P"'","node":{"type":"job","parentId":"approach-3","data":{"label":"<observable checkpoint>","iteration":"<phase>"}}}'
```

`references/api-sync.md` has the rest: batch, idempotency keys, phases, the free tier's 100-node cap, and what `scripts/pb-plan.mjs` does on `pull` and `push`. The same server is also available as an MCP server (`npx -y @productbrain-com/mcp`) if the client supports it; the skill works without it.

## What this skill does not do

It does not manage tickets, sprints or assignees; those stay in the tracker. It does not decide the why for the user; it makes the user's why readable to the agent and keeps it current. It never marks something `done` because tests pass.
