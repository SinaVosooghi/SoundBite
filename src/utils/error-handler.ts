import type { Logger } from '@nestjs/common';
import {
  AwsServiceException,
  ProcessingException,
} from '../exceptions/soundbite.exceptions';

/**
 * Utility class for handling and categorizing errors
 */
export class ErrorHandler {
  private static readonly AWS_ERROR_NAMES = [
    'AWS',
    'DynamoDB',
    'SQS',
    'S3',
    'Polly',
    'Lambda',
  ];

  /**
   * Determines if an error is an AWS service error
   * @param error The error to check
   * @returns True if it's an AWS service error
   */
  static isAwsError(error: Error): boolean {
    return (
      !!error.name &&
      this.AWS_ERROR_NAMES.some((awsName) => error.name.includes(awsName))
    );
  }

  /**
   * Creates an appropriate exception based on the error type
   * @param error The original error
   * @param operation The operation that failed
   * @param resourceId The ID of the resource being processed
   * @param context Additional context information
   * @returns The appropriate exception to throw
   */
  static createException(
    error: Error,
    operation: 'creation' | 'retrieval' | 'processing',
    resourceId: string,
    context: Record<string, unknown> = {},
  ): AwsServiceException | ProcessingException {
    if (this.isAwsError(error)) {
      const service = this.extractAwsService(error.name);
      const awsOperation = this.extractAwsOperation(operation);

      return new AwsServiceException(service, awsOperation, error, {
        ...context,
        resourceId,
      });
    }

    return new ProcessingException(
      operation,
      error.message,
      resourceId,
      context,
    );
  }

  /**
   * Logs an error with appropriate level and context
   * @param logger The logger instance to use
   * @param error The error to log
   * @param operation The operation that failed
   * @param resourceId The ID of the resource being processed
   * @param context Additional context information
   */
  static logError(
    logger: Logger,
    error: Error,
    operation: string,
    resourceId: string,
    context: Record<string, unknown> = {},
  ): void {
    const errorContext = {
      operation,
      resourceId,
      errorName: error.name,
      ...context,
    };

    logger.error(
      `${operation} failed: ${error.message}`,
      error.stack ?? 'No stack trace available',
      errorContext,
    );
  }

  /**
   * Handles unknown error types
   * @param logger The logger instance to use
   * @param error The unknown error
   * @param operation The operation that failed
   * @param resourceId The ID of the resource being processed
   * @param context Additional context information
   * @returns ProcessingException for unknown errors
   */
  static handleUnknownError(
    logger: Logger,
    error: unknown,
    operation: 'creation' | 'retrieval' | 'processing',
    resourceId: string,
    context: Record<string, unknown> = {},
  ): ProcessingException {
    logger.error(`${operation} failed: Unknown error type`, error, {
      operation,
      resourceId,
      ...context,
    });

    return new ProcessingException(
      operation,
      'Unknown error occurred during operation',
      resourceId,
      { ...context, originalError: error },
    );
  }

  /**
   * Extracts AWS service name from error name
   * @param errorName The error name
   * @returns The AWS service name
   */
  private static extractAwsService(errorName: string): string {
    const service = this.AWS_ERROR_NAMES.find((name) =>
      errorName.includes(name),
    );
    return service ?? 'AWS';
  }

  /**
   * Maps operation types to AWS operation names
   * @param operation The operation type
   * @returns The AWS operation name
   */
  private static extractAwsOperation(
    operation: 'creation' | 'retrieval' | 'processing',
  ): string {
    const operationMap = {
      creation: 'PutItem',
      retrieval: 'GetItem',
      processing: 'SendMessage',
    };

    return operationMap[operation];
  }
}
