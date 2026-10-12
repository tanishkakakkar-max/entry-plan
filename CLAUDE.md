# First Port (repo: entry-plan)

Next.js app that writes market-entry plans. Live at https://first-port-plans.vercel.app (the old https://entry-plan.vercel.app still points to the same site).

## Rules

- **Commit author:** always commit as `Tanishka Kakkar <237167307+tanishkakakkar-max@users.noreply.github.com>`, the GitHub no-reply address for `tanishkakakkar-max`. It's set in this repo's local git config (`git config user.email`), so plain `git commit` uses it. Don't override it with `-c user.email=...`. Vercel only auto-deploys commits it can match to the GitHub account.
- **Deploys:** pushing to `main` auto-deploys to first-port-plans.vercel.app through Vercel's GitHub integration. Don't run `vercel --prod` unless a push fails to deploy (check with `npx vercel ls first-port`; the Vercel project is named first-port).
- **Build first:** run `npm run build` before every push. Don't push if it fails.
- **Env vars live only in Vercel:** `ANTHROPIC_API_KEY` and `LLM_PROVIDER=anthropic` (plans run on Claude; brief check on Claude Haiku), `TAVILY_API_KEY`, `ADMIN_PASSWORD`, and the Upstash Redis vars (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, added by the Storage integration). `GROQ_API_KEY` is kept as a fallback: set `LLM_PROVIDER=groq` to switch back. `.env.example` lists the names with empty values.
- **Never commit keys.** Before committing, check for `gsk_`, `tvly-` or `sk-ant-` values. `.env*` is gitignored (except `.env.example`).
- **Research goes in `knowledge/`, not code.** Country docs, instructions and the sample plan are markdown files in `knowledge/`. `scripts/bundle-knowledge.mjs` bundles them into `lib/knowledge.generated.ts` at build time. Never edit the generated file.
