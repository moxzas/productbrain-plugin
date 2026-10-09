# Mode B: ProductBrain sync

Everything the skill needs from the API, and what the sync script does. The contract itself is one public page: <https://productbrain.com/docs/llm-guide.md> (also `https://productbrain.com/llms.txt`). Read it once per session.

## Env

| Var | Required | Meaning |
|---|---|---|
| `PRODUCTBRAIN_API_KEY` | yes (mode B) | `pb_…` key from the app's API Key modal. The free tier includes it. |
| `PRODUCTBRAIN_PROJECT_ID` | no | project id; the script also reads it from the `<!-- product-plan v1 · productbrain: <id> -->` line in `PLAN.md` |
| `PRODUCTBRAIN_API_URL` | no | default `https://productbrain.com/api/v1` |

## The calls the skill uses

| Need | Call |
|---|---|
| Find the branch a task belongs to | `GET /search?projectId=…&q=<phrase>` (ranked, with ancestor paths) |
| Read a bet in context | `GET /tree?projectId=…&nodeId=<id>&direction=down` (or `up` for ancestors) |
| Bulk read (the mirror) | `GET /nodes?projectId=…`, `GET /iterations?projectId=…` |
| Add a job / update status / notes | `POST /mutate` with `action: add` / `update`; many at once with `action: batch` |
| Create a project | `POST /mutate {action: "addProject", project: {id, name}}` |

Send an `Idempotency-Key` header on writes so a retry never double-applies. Every error carries `_meta.guide` and usually `_meta._tip`; read them before retrying.

## `scripts/pb-plan.mjs`

```bash
node scripts/pb-plan.mjs pull            # API → PLAN.md (overwrites the local mirror; asks first if PLAN.md has unsynced nodes)
node scripts/pb-plan.mjs push            # PLAN.md → API: adds nodes that have no id, updates label/status/measure/description/notes/phase on nodes that do; writes new ids back
node scripts/pb-plan.mjs push --dry-run  # print the mutations without sending
node scripts/pb-plan.mjs status          # what differs between PLAN.md and the project
```

Rules: `push` never deletes. A node that exists remotely but not in `PLAN.md` is listed as a warning; delete it in the app or with `POST /mutate {action: "delete"}` on purpose. Phases named in `(phase: …)` that do not exist yet are created in the same batch (`addIteration`). Node ids are per project (`goal-1`, `need-3`, `job-41`), stable, and written back into `PLAN.md` as `{#id}`.

## Reading the plan without the script

An agent that would rather not run Node can do mode B with curl alone: the three calls in `SKILL.md` are the whole workflow.
