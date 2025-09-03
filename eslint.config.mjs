// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist',
      '.pnp.cjs',
      '.pnp.loader.mjs',
      '**/cdk.out/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.js',
      '**/*.mjs'
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Type Safety - Strict Rules
      '@typescript-eslint/no-explicit-any': 'error', // Changed from 'off' to 'error'
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      
      // Promise Handling
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      
      // Code Quality
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      
      // Function and Method Rules
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      
      // Import/Export Rules
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      }],
      '@typescript-eslint/consistent-type-exports': 'error',
      
      // Naming Conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'method',
          format: ['camelCase'],
        },
        {
          selector: 'property',
          format: ['camelCase', 'UPPER_CASE'],
        },
        // AWS API Properties - allow PascalCase for AWS service properties
        {
          selector: 'property',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          filter: {
            regex: '^(InstanceId|FunctionName|TableName|QueueName|BucketName|StorageType|MetricName|Namespace|Statistic|Period|Threshold|EvaluationPeriods|ComparisonOperator|AttributeName|AttributeType|KeyType|KeySchema|AttributeDefinitions|BillingMode|PointInTimeRecoverySpecification|PointInTimeRecoveryEnabled|Environment|DataType|StringValue|Item|Key|MessageBody|MessageAttributes|Description|Tags|Value|OutputFormat|Text|VoiceId|Bucket|Body|ContentType|Metadata|QueueUrl|MaxNumberOfMessages|WaitTimeSeconds|VisibilityTimeout|Records|ReceiptHandle)$',
            match: true,
          },
        },
        // Security headers - allow kebab-case for HTTP headers
        {
          selector: 'property',
          format: null,
          filter: {
            regex: '^(X-Content-Type-Options|X-Frame-Options|X-XSS-Protection|Strict-Transport-Security|Referrer-Policy|X-Permitted-Cross-Domain-Policies|X-Download-Options|X-DNS-Prefetch-Control|Content-Security-Policy-Nonce|csp-report|document-uri|violated-directive|effective-directive|original-policy|blocked-uri|line-number|column-number|source-file|status-code|script-sample|expect-ct-report|date-time|effective-expiration-date|served-certificate-chain|validated-certificate-chain|serialized_sct|soundbite-id|voice-id|text-length|_idempotent|_cached|_originalTimestamp)$',
            match: true,
          },
        },
        // HTTP status codes - allow numeric property names
        {
          selector: 'property',
          format: null,
          filter: {
            regex: '^[1-5][0-9][0-9]$',
            match: true,
          },
        },
      ],
      
      // General ESLint Rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);