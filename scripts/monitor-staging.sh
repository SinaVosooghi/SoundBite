#!/usr/bin/env bash
set -euo pipefail

# Monitors staging CI/CD and fetches EC2 logs on failure.
# Requirements:
#  - env: GITHUB_TOKEN, AWS_REGION (us-east-1 default), REPO (owner/repo, default: SinaVosooghi/SoundBite)
#  - aws cli configured to assume proper role (same as workflows) or static creds
#  - jq, curl

AWS_REGION=${AWS_REGION:-us-east-1}
REPO=${REPO:-SinaVosooghi/SoundBite}
CI_WORKFLOW_NAME=${CI_WORKFLOW_NAME:-"Staging/Production CI"}
CD_WORKFLOW_NAME=${CD_WORKFLOW_NAME:-".github/workflows/staging-production-cd.yml"}
BRANCH=${BRANCH:-staging}
POLL_SECONDS=${POLL_SECONDS:-15}
MAX_MINUTES=${MAX_MINUTES:-45}
INSTANCE_ID=${EC2_INSTANCE_ID:-i-0e42eb553386cc529}

gh_api() {
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    curl -sS -H "Accept: application/vnd.github+json" \
         -H "Authorization: Bearer ${GITHUB_TOKEN}" \
         -H "X-GitHub-Api-Version: 2022-11-28" \
         "$1"
  else
    curl -sS -H "Accept: application/vnd.github+json" \
         -H "X-GitHub-Api-Version: 2022-11-28" \
         "$1"
  fi
}

echo "Monitoring CI/CD for repo=$REPO branch=$BRANCH (timeout=${MAX_MINUTES}m)"

deadline=$(( $(date +%s) + MAX_MINUTES*60 ))

# 1) Wait for CI success on branch
echo "Waiting for CI workflow to succeed: ${CI_WORKFLOW_NAME}..."
while :; do
  now=$(date +%s); [[ $now -gt $deadline ]] && echo "Timeout waiting for CI" && exit 1
  runs=$(gh_api "https://api.github.com/repos/${REPO}/actions/runs?event=push&branch=${BRANCH}&per_page=10")
  ci_run_id=$(echo "$runs" | jq -r \
    --arg name "$CI_WORKFLOW_NAME" \
    '.workflow_runs[] | select(.name==$name) | .id' | head -n1)
  if [[ -z "$ci_run_id" || "$ci_run_id" == "null" ]]; then
    echo "No CI run found yet. Sleeping ${POLL_SECONDS}s..."; sleep "$POLL_SECONDS"; continue
  fi
  ci=$(gh_api "https://api.github.com/repos/${REPO}/actions/runs/${ci_run_id}")
  ci_status=$(echo "$ci" | jq -r '.status')
  ci_conclusion=$(echo "$ci" | jq -r '.conclusion')
  echo "CI status=$ci_status conclusion=$ci_conclusion (run_id=$ci_run_id)"
  if [[ "$ci_status" == "completed" ]]; then
    if [[ "$ci_conclusion" == "success" ]]; then
      echo "✅ CI passed"
      break
    else
      echo "❌ CI failed"; exit 1
    fi
  fi
  sleep "$POLL_SECONDS"
done

# 2) Wait for CD to complete
echo "Waiting for CD workflow to complete: ${CD_WORKFLOW_NAME}..."
while :; do
  now=$(date +%s); [[ $now -gt $deadline ]] && echo "Timeout waiting for CD" && exit 1
  runs=$(gh_api "https://api.github.com/repos/${REPO}/actions/runs?branch=${BRANCH}&per_page=10")
  cd_run_id=$(echo "$runs" | jq -r \
    --arg name "$CD_WORKFLOW_NAME" \
    '.workflow_runs[] | select(.name==$name) | .id' | head -n1)
  if [[ -z "$cd_run_id" || "$cd_run_id" == "null" ]]; then
    echo "No CD run found yet. Sleeping ${POLL_SECONDS}s..."; sleep "$POLL_SECONDS"; continue
  fi
  cd=$(gh_api "https://api.github.com/repos/${REPO}/actions/runs/${cd_run_id}")
  cd_status=$(echo "$cd" | jq -r '.status')
  cd_conclusion=$(echo "$cd" | jq -r '.conclusion')
  echo "CD status=$cd_status conclusion=$cd_conclusion (run_id=$cd_run_id)"
  if [[ "$cd_status" == "completed" ]]; then
    if [[ "$cd_conclusion" == "success" ]]; then
      echo "✅ CD passed"
      # Basic health check via public IP
      EC2_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' --output text --region "$AWS_REGION")
      if [[ "$EC2_IP" != "None" && -n "$EC2_IP" ]]; then
        echo "Probing http://$EC2_IP:8080/health and /staging/health"
        curl -sf "http://$EC2_IP:8080/health" >/dev/null && echo "Ingress healthy"
        curl -sf "http://$EC2_IP:8080/staging/health" >/dev/null && echo "Staging healthy"
      fi
      exit 0
    else
      echo "❌ CD failed. Fetching EC2 logs via SSM..."
      break
    fi
  fi
  sleep "$POLL_SECONDS"
done

# 3) On CD failure, gather logs via SSM
CMD_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters commands="[
    'set -e',
    'cd /home/ec2-user',
    'echo === docker-compose ps ===',
    'docker-compose -f docker-compose.ec2.yml ps | cat',
    'echo === docker logs: soundbite-staging (tail 300) ===',
    'docker logs --tail 300 soundbite-staging | cat || true',
    'echo === docker logs: soundbite-nginx (tail 300) ===',
    'docker logs --tail 300 soundbite-nginx | cat || true',
    'echo === curl local health ===',
    'curl -sv http://localhost:8080/health || true',
    'echo === curl staging health ===',
    'curl -sv http://localhost:8080/staging/health || true'
  ]" \
  --region "$AWS_REGION" \
  --query 'Command.CommandId' --output text)

echo "SSM Command: $CMD_ID"

while :; do
  inv=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --region "$AWS_REGION" || true)
  status=$(echo "$inv" | jq -r '.Status // "Unknown"')
  if [[ "$status" == "InProgress" || "$status" == "Pending" || "$status" == "Delayed" ]]; then
    echo "Waiting for SSM logs... ($status)"; sleep 5; continue
  fi
  echo "--- SSM STDOUT ---"
  echo "$inv" | jq -r '.StandardOutputContent'
  echo "--- SSM STDERR ---"
  echo "$inv" | jq -r '.StandardErrorContent'
  break
done

exit 1


