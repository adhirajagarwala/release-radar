# Release Radar

> Dependency change intelligence for engineering teams that need more than a Renovate PR title.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green)](https://fastapi.tiangolo.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Release Radar watches your repositories for dependency updates and synthesizes changelogs, commits, migration guides, and community discussions into a single upgrade brief — with a risk score, evidence links, and suggested smoke tests — so your team can make confident upgrade decisions instead of guessing.

---

## The Problem

Teams receive dozens of dependency update PRs per week. Changelogs are inconsistent. Breaking changes get buried in commit threads or migration docs nobody reads. Semver is unreliable. Engineers either blindly merge and hope, or ignore updates until the pile becomes a security liability.

Release Radar turns noisy dependency noise into a readable, evidence-backed upgrade decision.

---

## Features

- **Repository sync** — connects to GitHub repos and reads dependency manifests
- **Upgrade brief generation** — synthesizes release notes, commit history, migration docs, and linked issues into a 1-page summary
- **Breaking change detection** — flags API removals, config renames, behavior changes with source evidence
- **Risk scoring** — rates each update by version delta, package criticality, breaking change signals, and your repo's usage footprint
- **Smoke test suggestions** — generates a checklist of targeted tests based on what changed
- **Blast radius estimation** — shows which internal packages or services are affected by a transitive update
- **Slack digest** — weekly summary sorted by urgency, delivered to a channel
- **GitHub PR comments** — posts the upgrade brief directly on Renovate or Dependabot PRs

---

## Supported Ecosystems

| Ecosystem | Manifest File | Registry |
|---|---|---|
| npm / Node.js | `package.json`, `package-lock.json`, `yarn.lock` | npmjs.com |
| Python | `requirements.txt`, `pyproject.toml`, `poetry.lock` | pypi.org |
| Go | `go.mod`, `go.sum` | pkg.go.dev |
| Rust | `Cargo.toml`, `Cargo.lock` | crates.io |

Go and Rust support are in active development. Open an issue to request an ecosystem.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.12, FastAPI |
| Background jobs | Celery + Redis |
| Storage | PostgreSQL 15 |
| Frontend | React, TypeScript, Tailwind |
| Integrations | GitHub API, npm registry, PyPI JSON API, Slack |

---

## Prerequisites

- Python 3.12+
- PostgreSQL 15+
- Redis 7+
- A GitHub OAuth App or Personal Access Token with `repo` scope

---

## Quick Start

```bash
# Clone
git clone https://github.com/your-org/release-radar.git
cd release-radar

# Create virtual environment and install dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Fill in DATABASE_URL, GITHUB_TOKEN, AI_API_KEY

# Run migrations
alembic upgrade head

# Start API + worker
uvicorn app.main:app --reload &
celery -A app.worker worker --loglevel=info &

# Frontend
cd frontend && npm install && npm run dev
```

Open `http://localhost:3000` to connect your first repository.

---

## Configuration

```env
# Database
DATABASE_URL=postgresql://localhost:5432/release_radar

# Redis
REDIS_URL=redis://localhost:6379

# GitHub
GITHUB_TOKEN=ghp_...         # Personal access token or GitHub App installation token

# AI provider
AI_PROVIDER=openai
AI_API_KEY=

# Optional: Slack digest delivery
SLACK_BOT_TOKEN=
SLACK_CHANNEL_ID=

# Optional: GitHub PR comment posting
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY_PATH=
```

---

## What an Upgrade Brief Looks Like

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  express  4.18.2 → 5.0.0
  Risk: HIGH  |  Blast Radius: 3 services
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY
  Express 5 drops Node 14/16 support and changes error handling for
  async routes. Path matching behavior changed for optional parameters.

BREAKING CHANGES  (3 detected)
  ✗ req.query parsing — values are now always strings [migration guide]
  ✗ Async errors — rejected promises now forwarded to error handler [commit]
  ✗ Path syntax — removed * wildcard, replaced with :param* [issue #3305]

AFFECTED IN YOUR REPO
  apps/api/src/routes/*.ts  (38 route files)
  apps/webhooks/index.ts

SUGGESTED SMOKE TESTS
  □ Run existing route tests
  □ Test error handler on async route rejection
  □ Verify wildcard route matching in apps/api
  □ Check query string parsing in search endpoints

ADOPTION  (from npm download trends)
  Major adoption after 5.0.0-beta.3 — ~60% of express users still on v4

EVIDENCE LINKS
  [CHANGELOG] [migration guide] [#3305] [npm trends]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Repository Structure

```
app/
  api/
    routers/          # FastAPI route handlers
    services/         # Brief generation, risk scoring, blast radius
    integrations/     # GitHub, npm, PyPI, Slack clients
  worker/
    tasks/            # Celery tasks: fetch updates, crawl evidence, generate briefs
  models/             # SQLAlchemy models
  migrations/         # Alembic migrations
frontend/
  src/
    pages/            # React pages: dashboard, repo detail, brief view
    components/       # BriefCard, RiskBadge, EvidenceLink, SmokeTasks
```

---

## MVP Scope

- GitHub repository sync
- npm and PyPI package support
- Upgrade brief generation with linked evidence
- Risk scoring (version delta + breaking change signals)
- Slack weekly digest

## Roadmap

- [ ] GitHub PR comment integration (auto-post brief on Renovate/Dependabot PRs)
- [ ] Organization-wide dashboard with blast radius graph
- [ ] Go and Rust ecosystem support
- [ ] SBOM export
- [ ] Customizable risk weights per team

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). New ecosystem adapters and improved breaking change heuristics are the highest-value contributions.

## License

[MIT](LICENSE)

## Local Prototype

This folder now includes a repo-ready dependency-brief starter:

```bash
npm test
npm run dev
```

Implemented pieces:

- `data/sample-updates.js`: sample update dataset
- `src/brief.js`: risk scoring and brief generation
- `src/server.js` + `web/`: lightweight browser dashboard
