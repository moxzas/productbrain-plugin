# Bootstrap: build a plan from a repository

This is the recipe that reconstructed the public example plans (Ghost, Plausible, Immich) from a cold start: one prompt, the public guide, a shallow clone, about 100 nodes. Transcripts: <https://productbrain.com/docs/transcripts/how-built.html>.

## 1. Study, do not skim

Read the README and any docs folder, the package manifest(s), the top-level layout, the most-changed areas in recent history (`git log --stat -50` is enough), open issues or a roadmap if the repository has one. Write, for yourself, one paragraph: what the product does, who it is for, and what the team is building *now* as opposed to what already works.

## 2. Goals: the outcomes (1 to 6)

Each goal is an outcome with a measure. Ask "why does this product exist for its users, and what would change in the world if it succeeded?" A product usually has a small number of real outcomes and many features; resist listing features here. If you cannot name a measure, it is probably not a goal yet.

## 3. Needs: the problems under each goal

For each goal, the user problems standing in the way. Write them as the user would ("a reader who likes one post has no way to find the next"), not as features. Three to six per goal is typical.

## 4. Bets, with honest status

For each need, the bets the team has taken or is taking. This is where a reconstruction earns its keep: mark what is shipped and settled as `resolved` (or `validation` if it is live but still being judged) and give it **no jobs**; mark what is being actively built `development` and give it jobs; mark abandoned directions `retired`. Read status from the code, flags and releases, not from assumption. Do not manufacture done jobs across the shipped core; that is coverage, not judgment, and it buries the live frontier.

## 5. Jobs: observable checkpoints on the live bets

Under each `development` bet, the checkpoints someone could observe from the running product, each assigned to a phase if the project has releases. `done` only for checkpoints that are genuinely live. Implementation detail goes in notes.

## 6. Write it down, then ask one question

Write `PLAN.md` in the `plan-shape.md` format. Show the user the goals only and ask: "Is this the why?" Adjust and continue. Do not ask a list of questions; the plan is the question.

## 7. Sync (mode B)

With `PRODUCTBRAIN_API_KEY` set: `node scripts/pb-plan.mjs push` creates the project nodes through the API and writes the assigned ids back into `PLAN.md`. The free tier caps a project at 100 nodes; a bigger bootstrap either trims to the live frontier or continues on a paid tier.
