import { z } from 'zod';

// Domain types
export interface Soundbite {
  readonly id: string;
  readonly text: string;
  readonly voiceId: string;
  readonly userId?: string | undefined;
  readonly status: 'pending' | 'processing' | 'ready' | 'failed';
  readonly s3Key?: string | undefined;
  readonly url?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly environment: string;
}

export interface JobMessage {
  readonly id: string;
  readonly text: string;
  readonly voiceId: string;
  readonly userId?: string | undefined;
  readonly createdAt: string;
  readonly environment: string;
}

// Zod schemas for validation
export const JobMessageSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1),
  voiceId: z.string().min(1),
  userId: z.string().optional(),
  createdAt: z.string().datetime(),
  environment: z.string().min(1),
});

export const SoundbiteSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1),
  voiceId: z.string().min(1),
  userId: z.string().optional(),
  status: z.enum(['pending', 'processing', 'ready', 'failed']),
  s3Key: z.string().optional(),
  url: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  environment: z.string().min(1),
});

// Type inference from schemas
export type JobMessageType = z.infer<typeof JobMessageSchema>;
export type SoundbiteType = z.infer<typeof SoundbiteSchema>;

// Helper functions
export function parseJobMessage(raw: string): JobMessage {
  const parsed = JobMessageSchema.parse(JSON.parse(raw));
  return {
    ...parsed,
    userId: parsed.userId ?? undefined,
  };
}

export function encodeJobMessage(message: JobMessage): string {
  return JSON.stringify(JobMessageSchema.parse(message));
}

export function parseSoundbite(raw: unknown): Soundbite {
  const parsed = SoundbiteSchema.parse(raw);
  return {
    ...parsed,
    userId: parsed.userId ?? undefined,
    s3Key: parsed.s3Key ?? undefined,
    url: parsed.url ?? undefined,
  };
}
