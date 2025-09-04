import { SetMetadata } from '@nestjs/common';
import {
  Idempotent,
  OptionallyIdempotent,
  IdempotentWithTTL,
  IDEMPOTENT_KEY,
} from './idempotent.decorator';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  SetMetadata: jest.fn(),
}));

describe('Idempotent Decorators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('@Idempotent', () => {
    it('should call SetMetadata with correct default parameters', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');

      const result = Idempotent();

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      });
      expect(result).toBe('mocked-decorator');
    });

    it('should call SetMetadata with custom required parameter', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');

      const result = Idempotent(false);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: false,
        ttl: 24 * 60 * 60 * 1000,
      });
      expect(result).toBe('mocked-decorator');
    });

    it('should call SetMetadata with custom TTL parameter', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');
      const customTTL = 60 * 60 * 1000; // 1 hour

      const result = Idempotent(true, customTTL);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: customTTL,
      });
      expect(result).toBe('mocked-decorator');
    });

    it('should call SetMetadata with both custom parameters', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');
      const customTTL = 30 * 60 * 1000; // 30 minutes

      const result = Idempotent(false, customTTL);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: false,
        ttl: customTTL,
      });
      expect(result).toBe('mocked-decorator');
    });
  });

  describe('@OptionallyIdempotent', () => {
    it('should call SetMetadata with required=false and default TTL', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');

      const result = OptionallyIdempotent();

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: false,
        ttl: 24 * 60 * 60 * 1000,
      });
      expect(result).toBe('mocked-decorator');
    });
  });

  describe('@IdempotentWithTTL', () => {
    it('should call SetMetadata with required=true and custom TTL', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');
      const customTTL = 2 * 60 * 60 * 1000; // 2 hours

      const result = IdempotentWithTTL(customTTL);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: customTTL,
      });
      expect(result).toBe('mocked-decorator');
    });

    it('should handle zero TTL', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');

      const result = IdempotentWithTTL(0);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: 0,
      });
      expect(result).toBe('mocked-decorator');
    });

    it('should handle negative TTL', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');

      const result = IdempotentWithTTL(-1000);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: -1000,
      });
      expect(result).toBe('mocked-decorator');
    });

    it('should handle very large TTL', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');
      const largeTTL = Number.MAX_SAFE_INTEGER;

      const result = IdempotentWithTTL(largeTTL);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: largeTTL,
      });
      expect(result).toBe('mocked-decorator');
    });
  });

  describe('IDEMPOTENT_KEY constant', () => {
    it('should have the correct value', () => {
      expect(IDEMPOTENT_KEY).toBe('idempotent');
    });
  });

  describe('Type Safety', () => {
    it('should return the correct type from SetMetadata', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      const mockReturnValue = Symbol('decorator');
      mockSetMetadata.mockReturnValue(mockReturnValue);

      const result = Idempotent();

      expect(result).toBe(mockReturnValue);
      expect(typeof result).toBe('symbol');
    });
  });

  describe('Parameter Validation', () => {
    it('should handle boolean required parameter correctly', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');

      // Test with explicit true
      Idempotent(true);
      expect(mockSetMetadata).toHaveBeenLastCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: 24 * 60 * 60 * 1000,
      });

      // Test with explicit false
      Idempotent(false);
      expect(mockSetMetadata).toHaveBeenLastCalledWith(IDEMPOTENT_KEY, {
        required: false,
        ttl: 24 * 60 * 60 * 1000,
      });
    });

    it('should handle number TTL parameter correctly', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('mocked-decorator');

      // Test with integer
      Idempotent(true, 5000);
      expect(mockSetMetadata).toHaveBeenLastCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: 5000,
      });

      // Test with float
      Idempotent(true, 5000.5);
      expect(mockSetMetadata).toHaveBeenLastCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: 5000.5,
      });
    });
  });

  describe('Common Use Cases', () => {
    it('should create decorator for required idempotency with default TTL', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('required-default-ttl');

      const decorator = Idempotent();

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: 24 * 60 * 60 * 1000,
      });
      expect(decorator).toBe('required-default-ttl');
    });

    it('should create decorator for optional idempotency', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('optional-idempotency');

      const decorator = OptionallyIdempotent();

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: false,
        ttl: 24 * 60 * 60 * 1000,
      });
      expect(decorator).toBe('optional-idempotency');
    });

    it('should create decorator for short-lived idempotency', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('short-lived');
      const fiveMinutes = 5 * 60 * 1000;

      const decorator = IdempotentWithTTL(fiveMinutes);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: fiveMinutes,
      });
      expect(decorator).toBe('short-lived');
    });

    it('should create decorator for long-lived idempotency', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('long-lived');
      const oneWeek = 7 * 24 * 60 * 60 * 1000;

      const decorator = IdempotentWithTTL(oneWeek);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true,
        ttl: oneWeek,
      });
      expect(decorator).toBe('long-lived');
    });
  });

  describe('Edge Cases', () => {
    it('should handle default parameters when none provided', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('default-params');

      const decorator = Idempotent();

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: true, // defaults to true
        ttl: 86400000, // defaults to 24 hours
      });
      expect(decorator).toBe('default-params');
    });

    it('should handle explicit false required parameter', () => {
      const mockSetMetadata = SetMetadata as jest.Mock;
      mockSetMetadata.mockReturnValue('explicit-false');

      const decorator = Idempotent(false);

      expect(mockSetMetadata).toHaveBeenCalledWith(IDEMPOTENT_KEY, {
        required: false,
        ttl: 86400000, // defaults to 24 hours
      });
      expect(decorator).toBe('explicit-false');
    });
  });
});
