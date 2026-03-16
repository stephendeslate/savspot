# Contributing to SavSpot

Thank you for considering contributing to SavSpot! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 10.30+
- Docker and Docker Compose
- PostgreSQL 16 (via Docker)
- Redis 7 (via Docker)

### Development Setup

```bash
git clone https://github.com/stephendeslate/savspot.git
cd savspot

# Start database and Redis
pnpm docker:up

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:dev

# Seed demo data
pnpm db:seed

# Start dev servers (API + Web)
pnpm dev
```

The API runs on `http://localhost:3001` and the web app on `http://localhost:3000`.

## Making Changes

### Branch Naming

- `feature/*` — new features
- `fix/*` — bug fixes
- `chore/*` — maintenance, dependencies, CI

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add service addon management
fix: correct timezone handling in availability calendar
chore: update Prisma to 6.x
```

### Code Style

- Run `pnpm lint` before committing
- Run `pnpm typecheck` to verify type safety
- Run `pnpm test` to run the test suite

### Pull Request Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Ensure `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass
5. Commit with a conventional commit message
6. Push to your fork and open a Pull Request

### What Makes a Good PR

- Focused on a single change
- Includes tests for new functionality
- Updates documentation if behavior changes
- Passes CI checks

## Project Structure

```
savspot/
  apps/
    api/          # NestJS backend
    web/          # Next.js frontend
    mobile/       # React Native (future)
  packages/
    shared/       # Shared types, enums, utilities
    ui/           # UI component library
    embed-widget/ # Embeddable booking widget
    mcp-server/   # Model Context Protocol server
  prisma/         # Database schema, migrations, seed
  scripts/        # Dev and deployment scripts
  docs/           # Documentation
  specs/          # Product specifications
```

## Contributor License Agreement

By contributing to SavSpot, you agree that your contributions will be licensed under the same [AGPL v3 license](LICENSE) that covers the project. You also grant SD Solutions, LLC a non-exclusive, irrevocable license to use your contributions under any license, including commercial licenses. This allows the project to offer dual-licensing (e.g., Pro License) while keeping the open-source version AGPL.

## Reporting Bugs

Open a [GitHub Issue](https://github.com/stephendeslate/savspot/issues) with:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, browser)

## Questions?

Open a [Discussion](https://github.com/stephendeslate/savspot/discussions) on GitHub.
