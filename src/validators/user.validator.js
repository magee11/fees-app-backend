const { z } = require('zod');
const { objectId, email } = require('./common');
const { ALL_ROLES } = require('../constants');

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email,
    password: z.string().min(8).max(72),
    role: z.enum(ALL_ROLES).optional(),
    avatar: z.string().optional(),
  }),
});

const updateUserSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().min(2).optional(),
    role: z.enum(ALL_ROLES).optional(),
    isActive: z.boolean().optional(),
    avatar: z.string().optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({ id: objectId }),
});

module.exports = { createUserSchema, updateUserSchema, idParamSchema };
