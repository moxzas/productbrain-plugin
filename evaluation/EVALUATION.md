# Evaluation notes

What the skill is checked against, what was verified, and what is not yet measured. Kept honest on purpose: a skill that reads a plan is useless to a first-time installer with no plan, so the bootstrap path matters as much as the read path.

## Scenarios (manual, per release)

| # | Scenario | Expected behaviour | Status |
|---|---|---|---|
| 1 | Repo with `PLAN.md`, no key; user asks for a feature that fits a bet in `development` | Agent names need/goal/bet in one line before coding; adds the job if missing; does not mark it done | specified, not yet run |
| 2 | Same, but the bet is `retired` | Agent stops and asks instead of building | specified, not yet run |
| 3 | Same, task fits nowhere | Agent says so and offers new bet / new need / task outside the tree | specified, not yet run |
| 4 | Repo with no `PLAN.md`, no key | Agent studies the repo, drafts goals with measures, asks "Is this the why?", writes `PLAN.md` in the documented shape | specified, not yet run (the shape itself parses: see the parser check below) |
| 5 | `PRODUCTBRAIN_API_KEY` set, no `PLAN.md`, project exists | `pull` writes the mirror; agent reads it | **verified live** (below) |
| 6 | Key set, `PLAN.md` edited (new job, status change, reopen) | `push` adds / updates / reopens; ids written back; `status` reports clean | **verified live** (below) |
| 7 | Key not set, user asks for mode B | Agent says the key is missing and stops; never searches for credentials | specified, not yet run (the script itself exits 2 with the message: verified) |
| 8 | Job marked `[x]` after merge to a staging branch only | Agent refuses: `done` means production | specified, not yet run |

"Specified, not yet run" is exactly that: the expected behaviour is written down against the SKILL.md text and has not been exercised in an agent session. Running scenarios 1–4, 7 and 8 in a Claude Code session against a fixture repository is the first thing to do after the skill is installed anywhere; an automated harness (a fixture repo per scenario, a judge prompt on the transcript) is the step after and is not built.

## Sync script, verified against a live project (2026-09-20)

Against a throwaway project on a ProductBrain staging account, in order: `push --dry-run` (listed 2 phases and 7 nodes to create) → `push` (created phases 6.0 and 6.1, then goal-1, need-1, approach-1, job-1, job-2, approach-2, task-1; ids written back) → `status` (clean: 0/0/0/0) → edit `PLAN.md` (bet status to `validation`, job-1 unchecked) → `push` (2 updates) → `pull` (7 nodes, file regenerated identically to the local edits) → uncheck a done job → `push` (`status: open`) → `pull` (reflected). The parser round-trips the documented example (`parsePlan(renderPlan(parsePlan(x)))` is stable). The project was archived afterwards.

One API fact the script hides: `measure` is a field on bets only, so a goal's `Measure:` line rides as the first line of the goal's description and is lifted back out on `pull`.

## Not yet measured

- Whether an agent with this skill re-steers less than one without it. The honest comparison (three arms, tasks from real repos, a defined re-steering event, several seeds) is a 60-to-100-hour build and is not planned.
- Install counts: skills.sh lists a skill through the CLI's telemetry, so a zero-install skill is invisible; the plugin marketplace publishes no install counts. Proxies: GitHub traffic on this repository (snapshotted fortnightly by ProductBrain's seed report), and API keys created with the `productbrain-skill/product-plan` user agent.
