const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');
const { STUDENT_STATUS } = require('../constants');

// Empty strings arrive routinely from multipart/import form fields left blank —
// treat them the same as "not provided" for genuinely optional fields.
const blankToUndefined = (val) => (val === '' || val === undefined ? undefined : val);

const createStudentSchema = z.object({
  body: z.object({
    admissionNo: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    name: z.string().min(2, 'Name is required'),
    standard: z.string().min(1, 'Standard is required'),
    section: z.string().min(1, 'Section is required'),
    joinedDate: z.coerce.date().optional(),
    activities: z.array(objectId).optional().default([]),
    status: z.enum(Object.values(STUDENT_STATUS)).optional(),
  }),
});

const updateStudentSchema = z.object({
  params: z.object({ id: objectId }),
  body: createStudentSchema.shape.body.partial(),
});

const idParamSchema = z.object({
  params: z.object({ id: objectId }),
});

const listStudentsQuerySchema = z.object({
  query: paginationQuery.extend({
    search: z.string().optional(),
    standard: z.string().optional(),
    section: z.string().optional(),
    activityId: objectId.optional(),
    status: z.enum(Object.values(STUDENT_STATUS)).optional(),
    outstanding: z.enum(['true', 'false']).optional(),
  }),
});

const exportStudentsQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    standard: z.string().optional(),
    section: z.string().optional(),
    activityId: objectId.optional(),
    status: z.enum(Object.values(STUDENT_STATUS)).optional(),
    format: z.enum(['excel', 'csv']).optional().default('excel'),
  }),
});

const importTemplateQuerySchema = z.object({
  query: z.object({
    format: z.enum(['excel', 'csv']).optional().default('excel'),
  }),
});

const bulkDeleteStudentsSchema = z.object({
  body: z.object({
    ids: z.array(objectId).min(1, 'Select at least one student').max(500, 'Too many students selected (max 500)'),
  }),
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  idParamSchema,
  listStudentsQuerySchema,
  exportStudentsQuerySchema,
  importTemplateQuerySchema,
  bulkDeleteStudentsSchema,
};
