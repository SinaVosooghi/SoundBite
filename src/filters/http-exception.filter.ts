import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  timestamp: string;
  path: string;
  method: string;
  correlationId?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}

interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const problemDetails = this.createProblemDetails(exception, request);

    // Log the exception
    this.logException(exception, request, problemDetails);

    // Send the response
    response
      .status(problemDetails.status)
      .header('Content-Type', 'application/problem+json')
      .json(problemDetails);
  }

  private createProblemDetails(
    exception: unknown,
    request: Request,
  ): ProblemDetails {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const correlationId = this.generateCorrelationId();

    // Base problem details
    const baseProblem: Partial<ProblemDetails> = {
      timestamp,
      path,
      method,
      correlationId,
      instance: `${method} ${path}`,
    };

    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, baseProblem);
    }

    // Handle unknown errors
    return this.handleUnknownException(exception, baseProblem);
  }

  private handleHttpException(
    exception: HttpException,
    baseProblem: Partial<ProblemDetails>,
  ): ProblemDetails {
    const status = exception.getStatus();
    const response = exception.getResponse();

    // Handle validation errors (class-validator)
    if (status === 400 && typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>;
      if (Array.isArray(responseObj.message)) {
        return this.createValidationErrorProblem(
          responseObj,
          baseProblem,
          status,
        );
      }
    }

    // Handle standard HTTP exceptions
    const title = this.getHttpStatusTitle(status);
    const type = this.getTypeUri(status);

    let detail: string;
    if (typeof response === 'string') {
      detail = response;
    } else if (typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>;
      detail = (responseObj.message as string) || title;
    } else {
      detail = title;
    }

    return {
      type,
      title,
      status,
      detail,
      ...baseProblem,
    } as ProblemDetails;
  }

  private createValidationErrorProblem(
    response: Record<string, unknown>,
    baseProblem: Partial<ProblemDetails>,
    status: number,
  ): ProblemDetails {
    const messages = response.message as string[];
    const errors: Record<string, string[]> = {};

    // Parse validation error messages
    messages.forEach((message) => {
      const validationError = this.parseValidationMessage(message);
      if (validationError !== null) {
        errors[validationError.field] ??= [];
        errors[validationError.field].push(validationError.message);
      } else {
        // Fallback for unparseable messages
        errors.general ??= [];
        errors.general.push(message);
      }
    });

    return {
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Validation Failed',
      status,
      detail: 'One or more validation errors occurred.',
      errors,
      ...baseProblem,
    } as ProblemDetails;
  }

  private handleUnknownException(
    exception: unknown,
    baseProblem: Partial<ProblemDetails>,
  ): ProblemDetails {
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const title = 'Internal Server Error';
    const type = this.getTypeUri(status);

    let detail = 'An unexpected error occurred.';
    let additionalInfo: Record<string, unknown> = {};

    if (this.isDevelopment && exception instanceof Error) {
      detail = exception.message;
      additionalInfo = {
        stack: exception.stack?.split('\n'),
        name: exception.name,
      };
    }

    return {
      type,
      title,
      status,
      detail,
      ...baseProblem,
      ...additionalInfo,
    } as ProblemDetails;
  }

  private parseValidationMessage(message: string): ValidationError | null {
    // Common patterns for class-validator messages
    const patterns = [
      /^(\w+) (.+)$/, // "field must be a string"
      /^(.+) must (.+)$/, // "email must be an email"
      /^(.+) should (.+)$/, // "password should not be empty"
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          field: match[1],
          message: match[2] || message,
        };
      }
    }

    return null;
  }

  private getHttpStatusTitle(status: number): string {
    const statusTitles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      406: 'Not Acceptable',
      408: 'Request Timeout',
      409: 'Conflict',
      410: 'Gone',
      411: 'Length Required',
      412: 'Precondition Failed',
      413: 'Payload Too Large',
      414: 'URI Too Long',
      415: 'Unsupported Media Type',
      416: 'Range Not Satisfiable',
      417: 'Expectation Failed',
      418: "I'm a teapot",
      421: 'Misdirected Request',
      422: 'Unprocessable Entity',
      423: 'Locked',
      424: 'Failed Dependency',
      425: 'Too Early',
      426: 'Upgrade Required',
      428: 'Precondition Required',
      429: 'Too Many Requests',
      431: 'Request Header Fields Too Large',
      451: 'Unavailable For Legal Reasons',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
      505: 'HTTP Version Not Supported',
      506: 'Variant Also Negotiates',
      507: 'Insufficient Storage',
      508: 'Loop Detected',
      510: 'Not Extended',
      511: 'Network Authentication Required',
    };

    return statusTitles[status] || 'Unknown Error';
  }

  private getTypeUri(status: number): string {
    // Map HTTP status codes to RFC URIs
    const typeUris: Record<number, string> = {
      400: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      401: 'https://tools.ietf.org/html/rfc7235#section-3.1',
      403: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
      404: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
      405: 'https://tools.ietf.org/html/rfc7231#section-6.5.5',
      406: 'https://tools.ietf.org/html/rfc7231#section-6.5.6',
      408: 'https://tools.ietf.org/html/rfc7231#section-6.5.7',
      409: 'https://tools.ietf.org/html/rfc7231#section-6.5.8',
      410: 'https://tools.ietf.org/html/rfc7231#section-6.5.9',
      411: 'https://tools.ietf.org/html/rfc7231#section-6.5.10',
      412: 'https://tools.ietf.org/html/rfc7232#section-4.2',
      413: 'https://tools.ietf.org/html/rfc7231#section-6.5.11',
      414: 'https://tools.ietf.org/html/rfc7231#section-6.5.12',
      415: 'https://tools.ietf.org/html/rfc7231#section-6.5.13',
      416: 'https://tools.ietf.org/html/rfc7233#section-4.4',
      417: 'https://tools.ietf.org/html/rfc7231#section-6.5.14',
      421: 'https://tools.ietf.org/html/rfc7540#section-9.1.2',
      422: 'https://tools.ietf.org/html/rfc4918#section-11.2',
      423: 'https://tools.ietf.org/html/rfc4918#section-11.3',
      424: 'https://tools.ietf.org/html/rfc4918#section-11.4',
      426: 'https://tools.ietf.org/html/rfc7231#section-6.5.15',
      428: 'https://tools.ietf.org/html/rfc6585#section-3',
      429: 'https://tools.ietf.org/html/rfc6585#section-4',
      431: 'https://tools.ietf.org/html/rfc6585#section-5',
      451: 'https://tools.ietf.org/html/rfc7725#section-3',
      500: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      501: 'https://tools.ietf.org/html/rfc7231#section-6.6.2',
      502: 'https://tools.ietf.org/html/rfc7231#section-6.6.3',
      503: 'https://tools.ietf.org/html/rfc7231#section-6.6.4',
      504: 'https://tools.ietf.org/html/rfc7231#section-6.6.5',
      505: 'https://tools.ietf.org/html/rfc7231#section-6.6.6',
      507: 'https://tools.ietf.org/html/rfc4918#section-11.5',
      508: 'https://tools.ietf.org/html/rfc5842#section-7.2',
      510: 'https://tools.ietf.org/html/rfc2774#section-7',
      511: 'https://tools.ietf.org/html/rfc6585#section-6',
    };

    return typeUris[status] || 'about:blank';
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logException(
    exception: unknown,
    request: Request,
    problemDetails: ProblemDetails,
  ): void {
    const { method, url, ip, headers } = request;
    const userAgentHeader = headers['user-agent'];
    const userAgent =
      userAgentHeader !== undefined &&
      userAgentHeader !== null &&
      userAgentHeader.length > 0
        ? userAgentHeader
        : 'Unknown';
    const correlationId = problemDetails.correlationId;

    const logContext = {
      correlationId,
      method,
      url,
      ip,
      userAgent,
      status: problemDetails.status,
      timestamp: problemDetails.timestamp,
    };

    if (problemDetails.status >= 500) {
      // Server errors - log as error with full details
      this.logger.error(`Server Error: ${problemDetails.title}`, {
        ...logContext,
        detail: problemDetails.detail,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else if (problemDetails.status >= 400) {
      // Client errors - log as warning
      this.logger.warn(`Client Error: ${problemDetails.title}`, {
        ...logContext,
        detail: problemDetails.detail,
        errors: problemDetails.errors,
      });
    } else {
      // Other status codes - log as info
      this.logger.log(`HTTP Exception: ${problemDetails.title}`, logContext);
    }
  }
}
