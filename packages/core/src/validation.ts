import { z } from 'zod';
import { ValidationError } from './errors';

export function validateRequest<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(
      'Request validation failed',
      result.error.errors
    );
  }

  return result.data;
}

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
  after: z.string().optional()
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

export function validateUserId(userId: unknown): string {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new ValidationError('Invalid user ID', [{ message: 'userId must be a non-empty string' }]);
  }
  return userId;
}
