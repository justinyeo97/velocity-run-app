# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## CI/CD deployment

The GitHub Actions workflow in `.github/workflows/ci-cd.yml` installs dependencies, runs Jest, and builds the frontend for pushes and pull requests targeting `main`. A push to `main` deploys to Vercel only after those checks pass.

Before the first production deployment:

1. Create a Vercel project for this app and set its framework to Vite, build command to `npm run build`, and output directory to `dist`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the Vercel project's **Production** environment variables.
3. In GitHub, open **Settings > Secrets and variables > Actions**. Add `VERCEL_TOKEN` as a secret. Add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as variables. Get the IDs from Vercel's project settings or from `.vercel/project.json` after running `vercel link` locally.
4. In GitHub, create the `production` environment if needed and restrict deployments to the `main` branch.
5. Add the deployed site URL ending in `/login` to Supabase Auth's allowed redirect URLs so Google sign-in can return to production.

The Vercel project and GitHub Actions credentials are not stored in this repository. Never commit `VERCEL_TOKEN` or `.env`.
