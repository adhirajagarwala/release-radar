# AGENTS.md

## Git Identity — Non-Negotiable

Every commit and push in this repo must be authored as:
  Name:  Adhiraj Agarwala
  Email: adhirajagarwala2007@gmail.com

Before the first commit in any session, run:
  git config user.name "Adhiraj Agarwala"
  git config user.email "adhirajagarwala2007@gmail.com"

Rules:
- Never commit unless git config user.name is exactly Adhiraj Agarwala.
- Never commit unless git config user.email is exactly adhirajagarwala2007@gmail.com.
- Never add Co-Authored-By lines.
- Never add Signed-off-by lines.
- Never add AI/tool/assistant contributor metadata.
- The commit author must be always and only Adhiraj Agarwala.

## Project

This repository is Release Radar: a dependency upgrade brief generator.

Release Radar monitors upstream package releases and generates evidence-backed
upgrade briefs — risk scores, changelog summaries, and migration notes — so
engineers can make fast, confident decisions about dependency updates.

## Core Rules

1. Do not fake risk scores or changelog data.
2. If using mock data, label it clearly as mock.
3. Every implemented feature must have tests.
4. Keep the codebase simple and dependency-light.
