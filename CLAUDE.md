# entry-plan

Next.js app that writes market-entry plans. Live at https://entry-plan.vercel.app.

## Rules

- **Commit author:** always commit as `Tanishka Kakkar <237167307+tanishkakakkar-max@users.noreply.github.com>`, the GitHub no-reply address for `tanishkakakkar-max`. It's set in this repo's local git config (`git config user.email`), so plain `git commit` uses it. Don't override it with `-c user.email=...`. Vercel only auto-deploys commits it can match to the GitHub account.
- **Deploys:** pushing to `main` auto-deploys to entry-plan.vercel.app through Vercel's GitHub integration. Don't run `vercel --prod` unless a push fails to deploy (check with `npx vercel ls first-port`; the Vercel project is named first-port and serves entry-plan.vercel.app).
- **Build first:** run `npm run build` before every push. Don't push if it fails.
- **Env vars live only in Vercel:** `GROQ_API_KEY` and `TAVILY_API_KEY`. Later: `ANTHROPIC_API_KEY` with `LLM_PROVIDER=anthropic` to switch to Claude. `.env.example` lists the names with empty values.
- **Never commit keys.** Before committing, check for `gsk_`, `tvly-` or `sk-ant-` values. `.env*` is gitignored (except `.env.example`).
- **Research goes in `knowledge/`, not code.** Country docs, instructions and the sample plan are markdown files in `knowledge/`. `scripts/bundle-knowledge.mjs` bundles them into `lib/knowledge.generated.ts` at build time. Never edit the generated file.
