# SoundBite Security Guide

_Last updated: 2023-09-15_

This document outlines the security measures implemented in the SoundBite service, including application security, infrastructure security, and operational security practices.

## Security Overview

SoundBite follows a defense-in-depth approach to security, implementing multiple layers of protection:

1. **Application Security**: Input validation, output encoding, secure headers, rate limiting
2. **Infrastructure Security**: IAM least privilege, private networking, encryption at rest and in transit
3. **Operational Security**: Monitoring, alerting, vulnerability scanning, secret management
4. **CI/CD Security**: Dependency scanning, SAST, container scanning, infrastructure as code validation

## Application Security

### Content Security Policy (CSP)

SoundBite implements a nonce-based Content Security Policy to prevent XSS attacks:

```javascript
// Security middleware generates a unique nonce per request
const nonce = randomBytes(16).toString('base64');
req.nonce = nonce;

// CSP configuration with nonce
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", `'nonce-${nonce}'`],
  styleSrc: ["'self'", `'nonce-${nonce}'`],
  // Additional directives...
};

// In development only, unsafe-inline is allowed
if (isDevelopment) {
  cspDirectives.scriptSrc.push("'unsafe-inline'");
  cspDirectives.styleSrc.push("'unsafe-inline'");
}
```

**Usage in Templates/Views**:
```html
<!-- Script tags must include the nonce -->
<script nonce="{{nonce}}">
  // JavaScript code
</script>

<!-- Style tags must include the nonce -->
<style nonce="{{nonce}}">
  /* CSS styles */
</style>
```

### Security Headers

The following security headers are implemented via Helmet middleware:

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | See CSP section | Prevent XSS attacks |
| X-Content-Type-Options | nosniff | Prevent MIME type sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | Additional XSS protection |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | Enforce HTTPS |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer information |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Restrict browser features |

### Rate Limiting

Rate limiting is implemented to prevent abuse and DoS attacks:

```javascript
// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitTtl * 1000, // Convert to milliseconds
  max: config.security.rateLimitLimit, // Max requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable legacy headers
  message: {
    error: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
  },
});
```

**Environment-specific limits**:
- Development: 100 requests per 15 minutes
- Staging: 300 requests per 15 minutes
- Production: 600 requests per 15 minutes

### Input Validation

All input is validated using class-validator with strict validation rules:

```typescript
export class CreateSoundbiteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @Transform(({ value }) => value.trim())
  text: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_VOICE_IDS)
  voiceId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  userId?: string;
}
```

### CORS Configuration

CORS is configured with environment-specific allowed origins:

```javascript
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = isDevelopment
      ? ['http://localhost:3000', 'http://127.0.0.1:3000']
      : process.env.CORS_ORIGIN.split(',');

    if (allowedOrigins.includes(origin) || isDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: isProduction ? 86400 : 300, // 24 hours in prod, 5 minutes in dev
};
```

### Error Handling

Errors are handled using RFC 7807 Problem Details format to prevent information leakage:

```typescript
// Example error response
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Invalid input data",
  "instance": "POST /soundbite",
  "timestamp": "2023-09-15T12:34:56.789Z",
  "correlationId": "1694779123456-abc123def456",
  "errors": {
    "text": ["must be at least 1 character", "must be at most 1000 characters"]
  }
}
```

## Infrastructure Security

### IAM Least Privilege

All AWS resources use the principle of least privilege:

- **Lambda Execution Role**: Limited to specific SQS, S3, DynamoDB operations
- **EC2 Instance Role**: Limited to required AWS service access
- **CI/CD Role**: Separate deployment role with limited permissions

Example IAM policy for the Lambda processor:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:*:*:SoundBite-*-SoundbiteQueue"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/SoundBite-*-SoundbitesTable"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::soundbite-*-storage/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech"
      ],
      "Resource": "*"
    }
  ]
}
```

### S3 Bucket Security

S3 buckets are configured with strict security settings:

- **Public Access**: Blocked at bucket level
- **Encryption**: Server-side encryption with AWS managed keys
- **Access**: Presigned URLs with short expiration (24 hours)
- **Versioning**: Enabled for accidental deletion protection
- **Lifecycle**: Automatic transition to IA and eventual expiration

### Network Security

- **VPC Configuration**: Private subnets for application components
- **Security Groups**: Minimal required access between components
- **NACLs**: Additional network-level filtering
- **VPC Endpoints**: Private access to AWS services

## Operational Security

### Secret Management

Secrets are managed according to environment:

- **Development**: .env files (not committed to repository)
- **Staging/Production**: AWS Secrets Manager or SSM Parameter Store
- **CI/CD**: GitHub Secrets for pipeline credentials

### Logging and Monitoring

- **Structured Logging**: JSON format with correlation IDs
- **Sensitive Data**: Filtered from logs (PII, credentials)
- **CloudWatch Alarms**: Set for security-relevant events
- **CloudTrail**: Enabled for API activity monitoring

### Security Scanning

The CI/CD pipeline includes multiple security scanning steps:

- **Snyk**: Dependency vulnerability scanning
- **Trivy**: Container vulnerability scanning
- **OSV**: Open source vulnerability scanning
- **Semgrep**: Static application security testing
- **cdk-nag**: Infrastructure as code security validation

## Incident Response

### Security Reporting

Security issues can be reported to:
- Email: security@example.com
- HackerOne program: https://hackerone.com/example (if applicable)

### Incident Handling Process

1. **Detection**: Monitoring alerts or manual reporting
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove threat source
4. **Recovery**: Restore systems to normal operation
5. **Post-Incident**: Analysis and improvement

## Security Roadmap

Planned security enhancements:

1. **WAF Implementation**: AWS WAF with managed rule sets
2. **DDoS Protection**: AWS Shield Standard/Advanced
3. **Enhanced Monitoring**: Security-focused dashboards
4. **Penetration Testing**: Regular third-party testing
5. **Authentication**: JWT/OAuth2 integration if multi-tenant

## Security Compliance

The SoundBite service is designed to comply with:

- OWASP Top 10 (2021)
- SANS Top 25 Software Errors
- AWS Well-Architected Framework Security Pillar

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security)