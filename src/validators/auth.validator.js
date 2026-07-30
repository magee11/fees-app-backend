const { z } = require('zod');
const { email } = require('./common');
const { ALL_ROLES } = require('../constants');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email,
    password: z.string().min(8).max(72),
    role: z.enum(ALL_ROLES).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1, 'Password is required'),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(72),
  }),
});

module.exports = { registerSchema, loginSchema, refreshSchema, changePasswordSchema };
