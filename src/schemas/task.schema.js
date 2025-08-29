const { z } = require('zod');

// Task status enum
const TaskStatus = z.enum(['pending', 'in-progress', 'completed'], {
  errorMap: () => ({ message: 'Status must be either pending, in-progress, or completed' })
});

// Task priority enum
const TaskPriority = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Priority must be either low, medium, high, or urgent' })
});

// Create task schema
const createTaskSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Task title is required')
      .max(100, 'Task title must not exceed 100 characters')
      .trim(),
    
    description: z
      .string()
      .min(1, 'Task description is required')
      .max(500, 'Task description must not exceed 500 characters')
      .trim(),
    
    status: TaskStatus.optional().default('pending'),
    
    priority: TaskPriority.optional().default('medium'),
    
    dueDate: z
      .string()
      .datetime({ message: 'Due date must be a valid ISO 8601 datetime' })
      .transform(date => new Date(date))
      .optional()
      .nullable(),
    
    tags: z
      .array(z.string().min(1, 'Tag cannot be empty').max(50, 'Tag must not exceed 50 characters'))
      .max(10, 'Cannot have more than 10 tags')
      .optional()
      .default([])
  })
});

// Update task schema
const updateTaskSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format')
  }),
  
  body: z.object({
    title: z
      .string()
      .min(1, 'Task title is required')
      .max(100, 'Task title must not exceed 100 characters')
      .trim()
      .optional(),
    
    description: z
      .string()
      .min(1, 'Task description is required')
      .max(500, 'Task description must not exceed 500 characters')
      .trim()
      .optional(),
    
    status: TaskStatus.optional(),
    
    priority: TaskPriority.optional(),
    
    dueDate: z
      .string()
      .datetime({ message: 'Due date must be a valid ISO 8601 datetime' })
      .transform(date => new Date(date))
      .optional()
      .nullable(),
    
    tags: z
      .array(z.string().min(1, 'Tag cannot be empty').max(50, 'Tag must not exceed 50 characters'))
      .max(10, 'Cannot have more than 10 tags')
      .optional()
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  )
});

// Get task by ID schema
const getTaskByIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format')
  })
});

// Delete task schema
const deleteTaskSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format')
  })
});

// Get tasks query schema
const getTasksQuerySchema = z.object({
  query: z.object({
    status: TaskStatus.optional(),
    
    priority: TaskPriority.optional(),
    
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a positive number')
      .transform(Number)
      .refine(val => val > 0, 'Page must be greater than 0')
      .optional()
      .default('1'),
    
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive number')
      .transform(Number)
      .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .optional()
      .default('10'),
    
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'title', 'status'])
      .optional()
      .default('createdAt'),
    
    sortOrder: z
      .enum(['asc', 'desc'])
      .optional()
      .default('desc'),
    
    search: z
      .string()
      .max(100, 'Search term must not exceed 100 characters')
      .trim()
      .optional()
  })
});

// Mark task as complete schema
const markTaskCompleteSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID format')
  })
});

module.exports = {
  TaskStatus,
  TaskPriority,
  createTaskSchema,
  updateTaskSchema,
  getTaskByIdSchema,
  deleteTaskSchema,
  getTasksQuerySchema,
  markTaskCompleteSchema
};
