import { z } from 'zod';
import { AppError } from '../utils/errors.js';

const emailSchema = z.string().trim().email().max(255).transform((email) => email.toLowerCase());

const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200)
});

export const parseSignup = (input) => {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) throw new AppError('Invalid signup payload.', 400, 'INVALID_PAYLOAD');
  return parsed.data;
};

export const parseLogin = (input) => {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) throw new AppError('Invalid login payload.', 400, 'INVALID_PAYLOAD');
  return parsed.data;
};
