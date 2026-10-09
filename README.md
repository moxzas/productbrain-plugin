# product-plan

A Claude Code skill (and plugin) that makes a coding agent **read the product plan before it codes and write the job back when it ships**.

Coding agents start every session cold. The code says what was built, but nothing on disk says why. This skill keeps a small four-layer plan next to the code and teaches the agent to use it:

- **Goal**: an outcome with a measure
- **Need**: a user problem under a goal
- **Bet**: how you plan to meet the need, with a status (development, validation, resolved, retired). Written as `#### Approach:` in `PLAN.md` and stored as type `approach` in ProductBrain
- **Job**: an observable checkpoint under a bet, assigned to a phase, `done` only when live in production

Two modes, one file:

| Mode | Plan of record | Needs |
|---|---|---|
| **A** | `PLAN.md` at the repository root | nothing, no account |
| **B** | a [ProductBrain](https://productbrain.com) project, with `PLAN.md` as a local mirror (`scripts/pb-plan.mjs pull` / `push`) | `PRODUCTBRAIN_API_KEY` (the free tier includes the API) |

If there is no plan, the skill **bootstraps one from the repository**: the same recipe that reconstructed the public example plans for [Ghost, Plausible and Immich](https://productbrain.com/plans) from a cold start.

## Install

```bash
# as a skill, with the skills CLI (any agent that reads SKILL.md)
npx skills add moxzas/productbrain-plugin

# as a Claude Code plugin from this repository
claude plugin add https://github.com/moxzas/productbrain-plugin

# as a Gemini CLI extension (asks for your key once, stores it in your keychain)
gemini extensions install https://github.com/moxzas/productbrain-plugin
```

Or copy `skills/product-plan/` into `.claude/skills/` in your project.

Mode B, optional:

```bash
export PRODUCTBRAIN_API_KEY=pb_…          # Settings → API Keys in the app
export PRODUCTBRAIN_PROJECT_ID=my-product # or put it on the marker line in PLAN.md
node skills/product-plan/scripts/pb-plan.mjs pull
```

## What this plugin runs and connects to

- **Mode A (no key):** nothing leaves your machine. The skill reads and writes `PLAN.md` in your repository.
- **Mode B (with your key):** the skill's `scripts/pb-plan.mjs` and the bundled MCP server call the ProductBrain API at `https://productbrain.com/api/v1` with your own `pb_` key, to read and write your plan. Nothing is sent anywhere else.
- **The MCP server** is the npm package `@productbrain-com/mcp`, pinned to version `0.1.0` and started with `npx`, so your package manager downloads it from the npm registry the first time. Its source is public at [moxzas/productbrain-mcp](https://github.com/moxzas/productbrain-mcp).
- **Your key** is asked for once and kept in your system's secure credential store (Claude Code `userConfig` with `sensitive: true`, Gemini CLI keychain). It is never written to a file in this plugin.
- ProductBrain's [privacy policy](https://productbrain.com/privacy) covers what the service stores.

## What the agent does with it

1. **Before a non-trivial task**: finds the branch of the plan the task serves and says it back in one line ("this serves *need* under *goal* via *bet* (status)"). Stops and asks if the bet is retired or resolved, or if the task fits nowhere.
2. **When it ships**: adds the job if it was missing, marks it `done` only when live in production, records the decision in one line under the job.
3. **When there is no plan**: studies the repo, drafts goals with measures, needs, bets with honest status, jobs on the live ones, writes `PLAN.md`, and asks one question: "Is this the why?"

The full instructions are in [`skills/product-plan/SKILL.md`](skills/product-plan/SKILL.md). The file format is in [`references/plan-shape.md`](skills/product-plan/references/plan-shape.md), the bootstrap recipe in [`references/bootstrap.md`](skills/product-plan/references/bootstrap.md), and the API in [`references/api-sync.md`](skills/product-plan/references/api-sync.md).

## Evaluation

[`evaluation/EVALUATION.md`](evaluation/EVALUATION.md): the scenarios the skill is checked against, how the sync script was verified against a live project, and what is not yet measured.

## Licence

MIT. The plan is yours: `PLAN.md` is plain markdown, and a ProductBrain project exports to JSON and to an [OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog) markdown bundle at any time.
