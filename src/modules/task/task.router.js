const express = require('express');
const taskController = require('./task.controller');
const { protect } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  createTaskSchema,
  updateTaskSchema,
  getTaskByIdSchema,
  deleteTaskSchema,
  getTasksQuerySchema,
  markTaskCompleteSchema
} = require('../../schemas/task.schema');

const router = express.Router();

/**
 * Task Routes
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(protect);


// Create a new task
router.post('/', validate(createTaskSchema), taskController.createTask);

// Get all tasks for the authenticated user with pagination and filtering
router.get('/', validate(getTasksQuerySchema), taskController.getTasks);

// Get a specific task by ID
router.get('/:id', validate(getTaskByIdSchema), taskController.getTaskById);

// Update a specific task
router.patch('/:id', validate(updateTaskSchema), taskController.updateTask);

// Delete a specific task
router.delete('/:id', validate(deleteTaskSchema), taskController.deleteTask);


// Mark a task as completed
router.patch('/:id/complete', validate(markTaskCompleteSchema), taskController.markTaskAsCompleted);


// Get task statistics
router.get('/analytics/stats', taskController.getTaskStats);

// Get overdue tasks
router.get('/analytics/overdue', taskController.getOverdueTasks);

// Get tasks due today
router.get('/analytics/due-today', taskController.getTasksDueToday);

// Get tasks due this week
router.get('/analytics/due-this-week', taskController.getTasksDueThisWeek);

// Get tasks by status
router.get('/status/:status', taskController.getTasksByStatus);

// Search tasks
router.get('/search', taskController.searchTasks);


// Bulk update tasks
router.patch('/bulk/update', taskController.bulkUpdateTasks);

// Bulk delete tasks
router.delete('/bulk/delete', taskController.bulkDeleteTasks);

module.exports = router;
