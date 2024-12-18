import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export const errorHandler = () => {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        return c.json(
          {
            message: error.message,
            code: error.status,
          },
          error.status
        );
      }

      if (error instanceof ZodError) {
        return c.json(
          {
            message: 'Validation error',
            errors: error.errors,
            code: 400,
          },
          400
        );
      }

      console.error('Unhandled error:', error);

      return c.json(
        {
          message: 'Internal server error',
          code: 500,
        },
        500
      );
    }
  };
};
