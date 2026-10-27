import { z } from 'zod';

export const loginBody = z.object({
  username: z.string().trim().min(1, 'Enter your username').max(100),
  password: z.string().min(1, 'Enter your password').max(200),
});

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(200)
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/[0-9]/, 'Include at least one number'),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from your current one',
  });
