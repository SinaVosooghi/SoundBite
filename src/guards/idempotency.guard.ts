import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';
import { HEADERS } from '../constants/paths';

interface IdempotencyMetadata {
  required: boolean;
  ttl: number;
}

interface IdempotencyRequest extends Request {
  idempotencyMetadata?: IdempotencyMetadata;
}

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<IdempotencyRequest>();
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Get idempotency metadata from decorator
    const idempotencyMetadata =
      this.reflector.getAllAndOverride<IdempotencyMetadata>(IDEMPOTENT_KEY, [
        handler,
        classRef,
      ]);

    if (idempotencyMetadata === null || idempotencyMetadata === undefined) {
      // No idempotency decorator, allow request
      return true;
    }

    const { required } = idempotencyMetadata;
    const idempotencyKey = request.headers[HEADERS.IDEMPOTENCY_KEY] as
      | string
      | undefined;

    if (
      required &&
      (idempotencyKey === undefined ||
        idempotencyKey === null ||
        idempotencyKey.length === 0)
    ) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Idempotency-Key header is required for this operation',
        statusCode: 400,
        details: {
          header: HEADERS.IDEMPOTENCY_KEY,
          description:
            'Provide a unique identifier to prevent duplicate requests',
          example: `${HEADERS.IDEMPOTENCY_KEY}: 550e8400-e29b-41d4-a716-446655440000`,
        },
      });
    }

    // Store metadata in request for middleware to use
    request.idempotencyMetadata = idempotencyMetadata;

    return true;
  }
}
