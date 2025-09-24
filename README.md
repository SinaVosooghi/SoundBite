# SoundBite 🎵

Minimal NestJS + AWS TTS service with idempotency and CI/CD.

## Quick Start

Prereqs: Node 22, Yarn 4, Docker, AWS CLI

Local (LocalStack):
```bash
localstack start
./scripts/soundbite.sh setup
./scripts/soundbite.sh dev localstack
curl http://localhost:3000/health
```

Local (AWS):
```bash
aws configure
./scripts/soundbite.sh dev aws
curl http://localhost:3001/health
```

Deploy Staging:
```bash
./scripts/soundbite.sh deploy staging
```

## API

- Health: `GET /health`
- Create Soundbite (TTS): `POST /soundbite`
  - Headers: `Idempotency-Key: <uuid-v4>`
- Get Soundbite: `GET /soundbite/:id`
- Swagger: `GET /api`

## Tests

```bash
yarn test        # run all
yarn test:watch  # watch mode
yarn test:e2e    # e2e suite
```

## CI/CD & Envs

- Workflows: `dev-ci.yml`, `staging-production-ci.yml`, `staging-production-cd.yml` (+ promotion/rollback/monitoring)
- Environments: Dev LocalStack (3000), Dev AWS (3001), Staging (EC2 via CD). Production planned.

## Docs

- Dev Status: `DEVSTATUS.md`
- Human docs: `human-docs/`
- AI docs: `ai-docs/`
- Legacy: `docs/`

Notes: dev-aws uses mixed resource naming (S3/SQS MultiEnv vs env-specific DynamoDB). See `DEVSTATUS.md` for options.