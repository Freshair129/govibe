# Deployment Verification Checklist

GoVibe uses GitHub as the base coordination layer and Vercel as the deployment target.

## Supported Deployment Paths

1. GitHub CI/CD trigger to Vercel.
2. Direct deployment through Vercel CLI.

## Local Release Gate

- `git status --short` reviewed.
- `npm run lint` passes.
- `npm run build` passes.
- Local or preview server loads.
- Mission Control smoke flow passes.

## GitHub CI/CD Gate

- `.github/workflows/` exists for the release path.
- Workflow runs lint/build/test.
- Workflow status is visible on the PR or branch.
- Vercel deployment is linked to the commit or workflow.

If the workflow folder is missing, report a deployment readiness gap.

## Vercel CLI Gate

- `vercel --version` is available.
- Project is linked or deployment command includes the intended project context.
- Deployment command returns a preview or production URL.
- Deployment URL loads without blocking console errors.
- Mission Control smoke flow passes on the deployed URL.

## Smoke Flow

- Initial page loads to Project Overview / A1 or the documented default.
- Top navigation renders.
- Sidebar renders and switches domains.
- A2 Roadmap Board opens.
- A5 Agent Management opens.
- One Genesis Knowledge view opens.
- One Block DB view opens.
- One AI Benchmark view opens.
- Floating terminal opens/closes if enabled.
