# PRD: Release Radar

**Status:** Draft  
**Last Updated:** 2026-04-20  
**Estimated MVP:** 7 weeks, 1–2 engineers

---

## Product Summary

Release Radar is a dependency intelligence platform that helps engineering teams understand the real-world impact of upgrading third-party packages. It gathers evidence from changelogs, commits, migration guides, and community discussions, then synthesizes them into a structured upgrade brief with a risk score, blast radius estimate, and suggested smoke tests.

---

## Problem Statement

Dependency management is noisy, but business-critical. Teams receive hundreds of update notifications per year, yet the important question remains unanswered: "What will this actually break?"

Current workflows fail because:

- Changelogs are inconsistently maintained or missing entirely
- Semver promises are often not honored
- Breaking changes are buried in GitHub issues, commit messages, or migration guides nobody reads
- Engineers don't have time to manually audit every upgrade
- Automated tools (Renovate, Dependabot) surface updates but offer no context about risk

The result: teams either blindly merge (risky) or let updates pile up for months (also risky).

---

## Goals

| Goal | Target | Measurement |
|---|---|---|
| Save upgrade review time | 60% reduction per upgrade | Self-reported time saved in onboarding survey |
| Detect breaking changes | > 75% recall on known breaking changes | Test corpus of 50 labeled historical updates |
| False positive rate on breaking change detection | < 20% | Same labeled test corpus |
| Brief generation speed | < 2 minutes per upgrade brief | Job timing in worker logs |
| Weekly active use | > 30% of connected repos have a brief viewed | Engagement query |

---

## Non-Goals

- Automatically merging dependency updates (always human-approved)
- Becoming a full SBOM (Software Bill of Materials) platform or CVE scanner replacement
- Supporting every package ecosystem in the first release (npm and PyPI only in MVP)
- Analyzing internal/private package registries in MVP

---

## Target Users

- Platform and infrastructure engineers managing multi-service repositories
- Staff engineers making upgrade decisions for core libraries
- Startup CTOs reviewing dependency PRs across a small team
- Security-conscious product teams that want to catch breaking changes before production

---

## User Personas

### Dana — Platform Engineer
Manages 12 services across 3 repos. Gets 20+ Renovate PRs per week. Needs to know which ones need real attention and which are safe to merge in bulk.

### Tomas — Staff Engineer
Owns the upgrade of `express` from v4 to v5. Has seen the migration guide but wants to know what else might be lurking in commits and issue threads before he schedules the work.

### Rei — Startup CTO
Three engineers, no dedicated platform team. Wants a weekly brief of what needs upgrading and why, without spending an hour in changelogs herself.

---

## Core Use Cases

### Use Case 1: Upgrade Brief Generation

**Trigger:** A new version of a tracked dependency is detected.

**Flow:**
1. Celery task: detect new version against `dependencies.current_version` for all connected repos.
2. Crawl evidence sources:
   - npm/PyPI registry: full changelog text, release dates
   - GitHub: commit log between versions (if repo is public), migration guide in docs/, linked issues on release
3. Normalize evidence into structured spans: feature addition, deprecation, breaking change, bug fix, security fix.
4. Generate brief via AI: problem summary (2 sentences), breaking changes list with evidence links, affected files in your repo, suggested smoke tests.
5. Calculate risk score (0–100) using:
   - Semver type: major=high, minor=medium, patch=low (base weight)
   - Breaking change signals detected: +30 per confirmed breaking change
   - Package criticality score (number of dependents in ecosystem): scaled 0–20
   - Version delta magnitude: e.g., 1.x → 2.x = higher than 1.0.0 → 1.0.1
   - Blast radius: how many internal packages/services depend on this package
6. Brief stored in DB. Maintainer notified via dashboard + optional Slack.

**Acceptance Criteria:**
- Brief must be generated within 2 minutes of new version detection.
- Every breaking change claim must include at least one evidence link (changelog line, commit URL, or issue URL). Unsubstantiated claims must not appear.
- If no evidence can be found for a claim, the brief must state "insufficient evidence" rather than generating an unsupported assertion.
- Risk score must be displayed with a plain-English explanation of the top 2 contributing factors.
- Users must be able to mark a brief as "reviewed" and add a decision note.

---

### Use Case 2: Blast Radius Analysis

**Trigger:** User opens an upgrade brief or specifically requests blast radius for a dependency.

**Definition:** Blast radius = the set of internal files, modules, or services that directly import or transitively depend on the package being upgraded.

**Flow:**
1. Parse connected repo's dependency graph from lock file.
2. Identify all direct import sites of the package (grep-based analysis on repo checkout or file tree).
3. Identify transitive dependents within the same monorepo (via workspace graph if available).
4. Categorize affected surfaces by service / app / package boundary.
5. Display as a list: "38 files in apps/api, 12 files in apps/webhooks."

**Acceptance Criteria:**
- Blast radius must be computed from the actual dependency graph, not estimated.
- Each affected surface must link to example import sites (file path + line number for top 3 matches).
- Monorepo workspace boundaries must be detected for npm workspaces and Python packages.
- Blast radius computation must complete within 30 seconds for repos up to 100,000 lines.

---

### Use Case 3: Slack Weekly Digest

**Trigger:** Scheduled Celery beat job (default: Monday 08:00 UTC, configurable per organization).

**Delivery:** Slack message to configured channel.

**Contents:**
- Top 3 high-urgency upgrades (risk score ≥ 70) with brief summaries
- Count of total pending updates grouped by ecosystem and risk level
- Link to full dashboard

**Acceptance Criteria:**
- Digest must be sent within 10 minutes of scheduled time.
- Only updates that have generated briefs may appear in the digest.
- Users must be able to suppress the digest for a specific repo via config.
- Slack message must include direct links to individual upgrade briefs.

---

### Use Case 4: GitHub PR Comment Integration

**Trigger:** A Renovate or Dependabot PR is opened on a connected repo.

**Flow:**
1. GitHub webhook event received: `pull_request.opened` with branch matching `renovate/*` or `dependabot/*` pattern.
2. Parse updated package(s) from PR description or diff.
3. Look up or generate upgrade brief for the updated package.
4. Post brief summary as a GitHub PR comment: risk score, top breaking changes, blast radius, and link to full brief.

**Acceptance Criteria:**
- PR comment must be posted within 5 minutes of webhook receipt.
- If a brief for the same version already exists in the DB, use cached brief rather than regenerating.
- Comment must clearly label itself as automated ("Release Radar analysis").
- If no brief can be generated (e.g., private package), post a note explaining why rather than silently skipping.

---

## API Endpoints

```
# Repositories
GET   /api/repos
POST  /api/repos                       # Connect a new repo (GitHub install)
GET   /api/repos/:id
DELETE /api/repos/:id                  # Disconnect

# Dependencies
GET   /api/repos/:rid/dependencies     # All tracked deps with current + latest version
GET   /api/repos/:rid/dependencies/:id

# Updates
GET   /api/updates                     # All pending updates across repos, sortable
GET   /api/updates/:id                 # Single update with full brief
POST  /api/updates/:id/mark-reviewed   # Body: { decision_note }
GET   /api/updates/:id/blast-radius    # Compute or return cached blast radius

# Briefs
GET   /api/briefs/:id                  # Full brief with evidence items
POST  /api/briefs/:id/regenerate       # Force fresh crawl and regeneration

# Organization Config
GET   /api/config
PUT   /api/config                      # Slack webhook, digest schedule, risk thresholds

# Webhooks
POST  /webhooks/github                 # GitHub App webhook (PR opened, push)
```

All routes require session auth except `/webhooks/github` (HMAC-SHA256 verification).

---

## Data Model

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id     BIGINT UNIQUE,
  email         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_org    TEXT,
  slack_webhook TEXT,
  digest_schedule TEXT DEFAULT 'monday 08:00 UTC',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE repos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id),
  github_full_name TEXT NOT NULL UNIQUE,   -- e.g., "acme/backend"
  installation_id  BIGINT NOT NULL,
  default_branch   TEXT NOT NULL DEFAULT 'main',
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dependencies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id          UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  ecosystem        TEXT NOT NULL CHECK (ecosystem IN ('npm', 'pypi', 'go', 'cargo')),
  package_name     TEXT NOT NULL,
  current_version  TEXT NOT NULL,
  latest_version   TEXT,
  last_checked_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repo_id, ecosystem, package_name)
);
CREATE INDEX idx_deps_repo ON dependencies (repo_id);

CREATE TABLE updates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dependency_id    UUID NOT NULL REFERENCES dependencies(id),
  from_version     TEXT NOT NULL,
  to_version       TEXT NOT NULL,
  risk_score       INT CHECK (risk_score BETWEEN 0 AND 100),
  risk_factors     JSONB,              -- { semver_type, breaking_count, blast_count, criticality }
  blast_radius     JSONB,              -- { file_count, service_count, example_files[] }
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'reviewed', 'merged', 'skipped')),
  decision_note    TEXT,
  reviewed_by      UUID REFERENCES users(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_updates_status_risk ON updates (status, risk_score DESC);

CREATE TABLE evidence_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id        UUID NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN (
                     'breaking_change', 'deprecation', 'feature',
                     'bug_fix', 'security_fix', 'migration_note'
                   )),
  source           TEXT NOT NULL CHECK (source IN (
                     'changelog', 'commit', 'github_issue',
                     'migration_guide', 'release_notes'
                   )),
  summary          TEXT NOT NULL,
  evidence_url     TEXT,
  confidence       FLOAT CHECK (confidence BETWEEN 0 AND 1),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE briefs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id        UUID NOT NULL REFERENCES updates(id) UNIQUE,
  summary          TEXT NOT NULL,                -- 2-sentence human-readable overview
  breaking_changes JSONB NOT NULL DEFAULT '[]',  -- array of { description, evidence_id, severity }
  smoke_tests      JSONB NOT NULL DEFAULT '[]',  -- array of { description }
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_version    TEXT NOT NULL
);
```

---

## Risk Scoring Algorithm

```
base_score = semver_component(from_version, to_version)
  MAJOR version bump → 40
  MINOR version bump → 15
  PATCH version bump → 5

breaking_score = MIN(COUNT(breaking_change evidence_items) * 20, 40)

criticality_score = LOG10(npm_weekly_downloads + 1) * 2     # 0-20 range
  # Or PyPI equivalent. Normalized to 0-20.

blast_score = MIN(blast_file_count / 10, 10)                # 0-10 range
  # Capped at 10 to not over-penalize large codebases

risk_score = MIN(base_score + breaking_score + criticality_score + blast_score, 100)
```

Risk labels: LOW = 0–29, MEDIUM = 30–59, HIGH = 60–79, CRITICAL = 80–100.

---

## Evidence Crawling Strategy

**Phase 1 — Registry metadata** (fast, always available):
- Fetch full changelog text from npm registry or PyPI JSON API
- Parse semver type, release date, release notes field

**Phase 2 — GitHub (if public repo link available):**
- Compare commit log between tags using GitHub API
- Look for "breaking", "BREAKING CHANGE", "migration" keywords in commit messages
- Check for `MIGRATION.md`, `UPGRADING.md`, or `docs/migration/` in the release tag

**Phase 3 — Issue/discussion crawl** (best-effort):
- Search GitHub issues on the upstream repo for mentions of the version with breaking/regression keywords
- Limited to 5 API pages to avoid rate limit exhaustion

All evidence is stored in `evidence_items` with source and confidence score. Brief is only generated after Phase 1 completes; Phases 2 and 3 run concurrently and update the brief if they find additional evidence.

---

## Auth and Security

- **User auth:** GitHub OAuth, session stored in HTTP-only cookie
- **GitHub App:** Installation token scoped per repo; used for PR comment posting and code content access
- **Slack webhook:** Stored encrypted in `organizations.slack_webhook`
- **Webhook validation:** All GitHub webhooks must pass HMAC-SHA256 verification
- **Data isolation:** All queries scoped to `org_id` through the authenticated user session

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| Upgrade review time per package | ~45 min (estimated) | < 18 min | Self-reported in onboarding survey |
| Breaking change recall | — | > 75% | Labeled test corpus of 50 historical updates |
| Breaking change false positive rate | — | < 20% | Same corpus |
| Brief generation time | — | < 2 min | Worker job duration (p95) |
| Weekly active brief views | — | > 30% of repos | Engagement query |

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| AI-hallucinated breaking change claims undermine trust | Critical | Evidence-backed claims only; "insufficient evidence" fallback; all claims link to source |
| Upstream changelog quality varies wildly | High | Multi-source evidence crawl; confidence scores surfaced to user |
| GitHub API rate limits during crawl | Medium | Rate-aware crawler; queue with backoff; cache evidence for 24h |
| npm/PyPI API downtime breaks detection | Medium | Retry with exponential backoff; staleness indicator on briefs |
| Blast radius analysis is slow for large repos | Medium | Async computation; cached per-repo on each sync; timeout with partial results |

---

## Third-Party Dependencies

| Service | Purpose | Notes |
|---|---|---|
| npm registry JSON API | Package metadata, changelog, version list | Free, no auth required |
| PyPI JSON API | Same for Python packages | Free, no auth required |
| GitHub API | Commit log, issues, file search | GitHub App installation token; watch rate limits (5,000 req/hr per installation) |
| Slack Incoming Webhooks | Digest delivery | Free |
| OpenAI / Anthropic | Brief summarization from evidence | ~$0.01–0.03 per brief at haiku/gpt-4o-mini |
| Celery + Redis | Crawl and brief generation jobs | Redis Cloud free tier |
| PostgreSQL | All storage | $5–20/month on managed hosting |

---

## Sprint Breakdown (7 weeks, 1–2 engineers)

**Sprint 1 (Weeks 1–2):** Ingestion + Detection
- GitHub App setup and repo connection
- Dependency manifest parsing (package.json, requirements.txt)
- npm and PyPI version detection jobs (Celery)
- Core data model migrations

**Sprint 2 (Weeks 3–4):** Evidence Crawl + Brief Generation
- Registry metadata crawler (Phase 1)
- GitHub commit + file crawler (Phase 2)
- AI brief generation from evidence items
- Risk scoring algorithm

**Sprint 3 (Weeks 5–6):** Frontend + Blast Radius
- React dashboard: update list, brief detail view, risk badges
- Blast radius computation (lock file parse + import site grep)
- Slack digest Celery beat job

**Sprint 4 (Week 7):** GitHub Integration + Polish
- GitHub PR comment posting on Renovate/Dependabot PRs
- Mark-as-reviewed workflow
- End-to-end tests
- Breaking change accuracy test corpus

---

## Testing Requirements

- **Unit:** Risk score calculation with known inputs; semver parsing edge cases; evidence type classification
- **Integration:** Full pipeline: detect version → crawl evidence → generate brief → store in DB
- **Accuracy:** Labeled test corpus of 50 historical dependency updates (npm + PyPI) with known breaking changes; measure precision and recall
- **GitHub webhook:** PR comment posted correctly on simulated Renovate PR payload
- **Rate limit resilience:** Crawler handles 429 responses with backoff without data loss
- **Blast radius:** Verified against a known repo dependency graph with expected import counts

---

## Open-Source Strategy

- Core platform under MIT license
- Hosted tier for teams wanting multi-repo dashboards, SSO, and AI usage included
- Community ecosystem adapters (Go, Rust, Maven) accepted as PRs with standard adapter interface
