import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface CSPReport {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    disposition: string;
    'blocked-uri': string;
    'line-number': number;
    'column-number': number;
    'source-file': string;
    'status-code': number;
    'script-sample': string;
  };
}

interface CTReport {
  'expect-ct-report': {
    'date-time': string;
    hostname: string;
    port: number;
    'effective-expiration-date': string;
    'served-certificate-chain': string[];
    'validated-certificate-chain': string[];
    scts: Array<{
      version: number;
      status: string;
      source: string;
      serialized_sct: string;
    }>;
  };
}

@ApiTags('security')
@Controller('api')
export class SecurityReportsController {
  private readonly logger = new Logger(SecurityReportsController.name);

  @Post('csp-report')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Receive CSP violation reports',
    description: 'Endpoint for Content Security Policy violation reports',
  })
  @ApiResponse({
    status: 204,
    description: 'CSP report received successfully',
  })
  handleCSPReport(
    @Body() report: CSPReport,
    @Headers() headers: Record<string, string>,
  ): void {
    const cspReport = report['csp-report'];

    if (cspReport === undefined || cspReport === null) {
      this.logger.warn('Invalid CSP report format received');
      return;
    }

    // Log CSP violation with structured data
    this.logger.warn('CSP Violation Detected', {
      type: 'csp-violation',
      documentUri: cspReport['document-uri'],
      violatedDirective: cspReport['violated-directive'],
      effectiveDirective: cspReport['effective-directive'],
      blockedUri: cspReport['blocked-uri'],
      sourceFile: cspReport['source-file'],
      lineNumber: cspReport['line-number'],
      columnNumber: cspReport['column-number'],
      scriptSample: cspReport['script-sample']?.substring(0, 100), // Limit sample size
      userAgent: headers['user-agent'],
      referrer: cspReport.referrer,
      timestamp: new Date().toISOString(),
    });

    // In production, you might want to:
    // 1. Store violations in a database
    // 2. Send alerts for critical violations
    // 3. Aggregate violations for analysis
    // 4. Rate limit reports to prevent spam

    if (this.isCriticalViolation(cspReport)) {
      this.logger.error('Critical CSP Violation', {
        type: 'critical-csp-violation',
        violation: cspReport,
        userAgent: headers['user-agent'],
      });

      // TODO: Send alert to monitoring system
    }
  }

  @Post('ct-report')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Receive Certificate Transparency reports',
    description: 'Endpoint for Certificate Transparency violation reports',
  })
  @ApiResponse({
    status: 204,
    description: 'CT report received successfully',
  })
  handleCTReport(
    @Body() report: CTReport,
    @Headers() headers: Record<string, string>,
  ): void {
    const ctReport = report['expect-ct-report'];

    if (ctReport === undefined || ctReport === null) {
      this.logger.warn('Invalid CT report format received');
      return;
    }

    // Log CT violation with structured data
    this.logger.error('Certificate Transparency Violation', {
      type: 'ct-violation',
      hostname: ctReport.hostname,
      port: ctReport.port,
      dateTime: ctReport['date-time'],
      effectiveExpirationDate: ctReport['effective-expiration-date'],
      sctCount: ctReport.scts?.length || 0,
      userAgent: headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    // CT violations are always critical - certificate issues
    // TODO: Send immediate alert to security team
  }

  private isCriticalViolation(cspReport: CSPReport['csp-report']): boolean {
    const criticalDirectives = [
      'script-src',
      'object-src',
      'base-uri',
      'form-action',
    ];

    const criticalPatterns = [/javascript:/i, /data:/i, /eval/i, /inline/i];

    // Check if violation involves critical directives
    if (
      criticalDirectives.some((directive) =>
        cspReport['violated-directive'].includes(directive),
      )
    ) {
      return true;
    }

    // Check for suspicious blocked URIs
    if (
      criticalPatterns.some((pattern) => pattern.test(cspReport['blocked-uri']))
    ) {
      return true;
    }

    // Check for external script injections
    if (
      cspReport['violated-directive'].includes('script-src') &&
      !cspReport['blocked-uri'].includes(cspReport['document-uri'])
    ) {
      return true;
    }

    return false;
  }
}
