# entry-plan

Next.js app that writes market-entry plans. Live at https://entry-plan.vercel.app.

## Rules

- **Commit author:** always commit as `Tanishka Kakkar <tanishka.kakkar05@gmail.com>` (e.g. `git -c user.email=tanishka.kakkar05@gmail.com commit ...`). The global git config uses a different email, so don't rely on it.
- **Deploys:** pushing to `main` auto-deploys to entry-plan.vercel.app through Vercel's GitHub integration. Don't run `vercel --prod` unless a push fails to deploy (check with `npx vercel ls entry-plan`).
- **Build first:** run `npm run build` before every push. Don't push if it fails.
- **Env vars live only in Vercel:** `GROQ_API_KEY` and `TAVILY_API_KEY`. Later: `ANTHROPIC_API_KEY` with `LLM_PROVIDER=anthropic` to switch to Claude. `.env.example` lists the names with empty values.
- **Never commit keys.** Before committing, check for `gsk_`, `tvly-` or `sk-ant-` values. `.env*` is gitignored (except `.env.example`).
- **Research goes in `knowledge/`, not code.** Country docs, instructions and the sample plan are markdown files in `knowledge/`. `scripts/bundle-knowledge.mjs` bundles them into `lib/knowledge.generated.ts` at build time. Never edit the generated file.
