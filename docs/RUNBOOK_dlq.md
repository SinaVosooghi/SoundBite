# SoundBite DLQ Redrive Runbook

_Last updated: 2023-09-15_

This runbook provides step-by-step procedures for handling messages in the Dead Letter Queue (DLQ) for the SoundBite service.

## Overview

The SoundBite service uses an SQS Dead Letter Queue (DLQ) to capture messages that failed processing after multiple attempts. This runbook covers:

1. Monitoring DLQ messages
2. Investigating failure causes
3. Redriving messages back to the main queue
4. Handling persistent failures

## Prerequisites

- AWS CLI configured with appropriate permissions
- Access to CloudWatch Logs
- Access to SQS console or CLI
- Access to Lambda console or CLI

## Monitoring DLQ Messages

### CloudWatch Alarm

A CloudWatch alarm is configured to trigger when any messages appear in the DLQ:

- **Alarm Name**: `${environment}-DLQDepthAlarm`
- **Metric**: `ApproximateNumberOfVisibleMessages`
- **Threshold**: >= 1
- **Period**: 1 minute
- **Evaluation Periods**: 1

### Manual Checking

To manually check for messages in the DLQ:

```bash
# Replace {environment} with dev, staging, or prod
aws sqs get-queue-attributes \
  --queue-url https://sqs.{region}.amazonaws.com/{account-id}/SoundBite-{environment}-SoundbiteDLQ \
  --attribute-names ApproximateNumberOfMessages
```

## Investigating Failure Causes

### 1. Check CloudWatch Logs

```bash
# Replace {environment} with dev, staging, or prod
aws logs filter-log-events \
  --log-group-name "/aws/lambda/SoundBite-{environment}-Processor" \
  --filter-pattern "ERROR" \
  --start-time $(date -v-1d +%s)000
```

### 2. Examine DLQ Messages

```bash
# Receive up to 10 messages from the DLQ for inspection
aws sqs receive-message \
  --queue-url https://sqs.{region}.amazonaws.com/{account-id}/SoundBite-{environment}-SoundbiteDLQ \
  --max-number-of-messages 10 \
  --visibility-timeout 300 \
  --attribute-names All \
  --message-attribute-names All
```

### 3. Common Failure Patterns

| Error Pattern | Likely Cause | Recommended Action |
|---------------|--------------|-------------------|
| `AccessDenied` | IAM permission issues | Check Lambda execution role |
| `ThrottlingException` | Rate limits exceeded | Reduce concurrency or increase provisioned capacity |
| `ValidationException` | Invalid input data | Fix data validation or filter bad messages |
| `ResourceNotFoundException` | Missing resource | Check resource existence and permissions |
| `InternalServerError` | AWS service issues | Wait and retry or check AWS status page |

## Redriving Messages

### Automatic Redrive (Non-Production)

In development and staging environments, an automatic redrive process runs every 15 minutes via EventBridge rule. This process:

1. Checks for messages in the DLQ
2. Moves them back to the main queue with a 30-second delay
3. Adds retry metadata to track attempts

### Manual Redrive via Lambda

For production or urgent cases:

```bash
# Invoke the DLQ redrive Lambda function manually
aws lambda invoke \
  --function-name SoundBite-{environment}-DLQRedrive \
  --payload '{"source": "manual", "trigger": "runbook"}' \
  response.json

# Check the response
cat response.json
```

### Manual Redrive via Console

1. Open the AWS SQS Console
2. Navigate to the DLQ (`SoundBite-{environment}-SoundbiteDLQ`)
3. Select "Start DLQ redrive"
4. Choose the destination queue (`SoundBite-{environment}-SoundbiteQueue`)
5. Set the redrive rate (recommended: 10 messages per second)
6. Start the redrive process

## Handling Persistent Failures

If messages continue to fail processing after redrive attempts:

### 1. Analyze Message Content

```bash
# Receive a specific message for detailed analysis
aws sqs receive-message \
  --queue-url https://sqs.{region}.amazonaws.com/{account-id}/SoundBite-{environment}-SoundbiteDLQ \
  --max-number-of-messages 1 \
  --visibility-timeout 300 \
  --attribute-names All \
  --message-attribute-names All
```

### 2. Test Processing Locally

1. Copy the message body to a JSON file
2. Use the Lambda test environment to process the message
3. Debug any issues in the processing logic

### 3. Fix or Purge

Based on the analysis:

- **If fixable**: Deploy a fix and then redrive the messages
- **If unfixable**: Consider purging the problematic messages

```bash
# Purge specific message (use with caution)
aws sqs delete-message \
  --queue-url https://sqs.{region}.amazonaws.com/{account-id}/SoundBite-{environment}-SoundbiteDLQ \
  --receipt-handle "{receipt-handle-from-receive-message}"
```

## Monitoring Redrive Progress

### Check Remaining Messages

```bash
# Check how many messages remain in the DLQ
aws sqs get-queue-attributes \
  --queue-url https://sqs.{region}.amazonaws.com/{account-id}/SoundBite-{environment}-SoundbiteDLQ \
  --attribute-names ApproximateNumberOfMessages
```

### Monitor Processing

```bash
# Watch the CloudWatch logs for the processor Lambda
aws logs tail "/aws/lambda/SoundBite-{environment}-Processor" --follow
```

## Post-Incident Actions

After resolving a DLQ incident:

1. Document the root cause in the incident log
2. Update monitoring if needed
3. Consider implementing preventive measures
4. Review and update this runbook if new patterns were discovered

## Contacts

If you need assistance with DLQ issues:

- **Primary Contact**: DevOps Team (devops@example.com)
- **Secondary Contact**: Backend Team (backend@example.com)
- **Emergency**: On-call Engineer (oncall@example.com)