# Entry Plan (v0)

A brand enters its product, identity, target customer and a country (Japan, Singapore, India, US) and gets a staked market-entry plan grounded in Tanishka Kakkar's country research.

## How it works
- `knowledge/` is the brain. Edit these, not the code:
  - `instructions.md` - how the AI should think and write
  - `sample-plan-olvae-japan.md` - the gold-standard example (format + quality bar)
  - `countries/*.md` - one research doc per country (the "R" in RAG later)
  - `v0.md` - what this version is and isn't
- `scripts/bundle-knowledge.mjs` packs those files into the app on every build.
- `app/api/plan/route.ts` sends the form + instructions + sample plan + the chosen country's doc to Claude and streams the plan back.
- `app/page.tsx` is the one page with the form.

## Run it on your laptop
1. Install Node.js 20+ (nodejs.org).
2. In this folder: `npm install`
3. Copy `.env.example` to `.env.local` and paste your Anthropic API key after `ANTHROPIC_API_KEY=`
4. `npm run dev`, then open http://localhost:3000

## Deploy on Vercel
1. Put this folder in a new GitHub repo (GitHub Desktop is easiest: File -> Add local repository -> Publish).
2. In Vercel: Add New -> Project -> import the repo. Framework preset: Next.js. Leave the build settings as they are.
3. Before deploying, open Environment Variables and add `ANTHROPIC_API_KEY`. The key lives only there, never in the code.
4. Deploy. Every push to GitHub redeploys.

## Before you share the link
- In the Anthropic Console, set a monthly spend limit. The app also limits each visitor to 5 plans an hour, but that's best-effort.
- Optional: set `ACCESS_CODE` in Vercel to require a code (useful while you test).

## Updating the research
Edit a file in `knowledge/countries/`, commit, push. The next deploy uses it. Remove `[TANI]` placeholders as you fill them, and keep `[VERIFY]` on anything you haven't checked against a primary source.
