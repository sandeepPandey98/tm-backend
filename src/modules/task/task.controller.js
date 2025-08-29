const taskService = require('./task.service');
const {
  sendSuccess,
  sendError,
  sendCreated,
  sendUpdated,
  sendDeleted,
  sendNotFoundError,
  sendPaginatedResponse,
  sendAuthorizationError
} = require('../../utils/response.util');


class TaskController {
  
  async createTask(req, res) {
    try {
      console.log('=== CONTROLLER: createTask called ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User ID:', req.user._id);
      
      const taskData = req.body;
      const userId = req.user._id;
      
      const task = await taskService.createTask(taskData, userId);
      
      console.log('=== CONTROLLER: Task created successfully ===');
      console.log('Returned task:', JSON.stringify(task.toObject(), null, 2));
      
      return sendCreated(res, task, 'Task created successfully');
    } catch (error) {
      console.log('=== CONTROLLER: Error creating task ===');
      console.log('Error:', error);
      return sendError(res, error.message || 'Failed to create task', 400);
    }
  }

  
  async getTasks(req, res) {
    try {
      const userId = req.user._id;
      const options = req.query;
      
      const result = await taskService.getTasks(userId, options);
      
      return sendPaginatedResponse(
        res,
        result.tasks,
        result.pagination,
        'Tasks retrieved successfully'
      );
    } catch (error) {
      return sendError(res, error.message || 'Failed to retrieve tasks', 500);
    }
  }

 
  async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const task = await taskService.getTaskById(id, userId);
      
      return sendSuccess(res, task, 'Task retrieved successfully');
    } catch (error) {
      if (error.message === 'Task not found') {
        return sendNotFoundError(res, 'Task not found', 'task');
      }
      
      if (error.message.includes('Access denied')) {
        return sendAuthorizationError(res, error.message);
      }
      
      return sendError(res, error.message || 'Failed to retrieve task', 500);
    }
  }

  
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user._id;
      
      const task = await taskService.updateTask(id, updateData, userId);
      
      return sendUpdated(res, task, 'Task updated successfully');
    } catch (error) {
      if (error.message === 'Task not found') {
        return sendNotFoundError(res, 'Task not found', 'task');
      }
      
      if (error.message.includes('Access denied')) {
        return sendAuthorizationError(res, error.message);
      }
      
      return sendError(res, error.message || 'Failed to update task', 400);
    }
  }

  
  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const result = await taskService.deleteTask(id, userId);
      
      return sendDeleted(res, result.message);
    } catch (error) {
      if (error.message === 'Task not found') {
        return sendNotFoundError(res, 'Task not found', 'task');
      }
      
      if (error.message.includes('Access denied')) {
        return sendAuthorizationError(res, error.message);
      }
      
      return sendError(res, error.message || 'Failed to delete task', 500);
    }
  }

  
  async markTaskAsCompleted(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const task = await taskService.markTaskAsCompleted(id, userId);
      
      return sendUpdated(res, task, 'Task marked as completed successfully');
    } catch (error) {
      if (error.message === 'Task not found') {
        return sendNotFoundError(res, 'Task not found', 'task');
      }
      
      if (error.message.includes('Access denied')) {
        return sendAuthorizationError(res, error.message);
      }
      
      if (error.message === 'Task is already completed') {
        return sendError(res, 'Task is already completed', 400);
      }
      
      return sendError(res, error.message || 'Failed to mark task as completed', 500);
    }
  }

  
  async getTaskStats(req, res) {
    try {
      const userId = req.user._id;
      const stats = await taskService.getTaskStats(userId);
      
      return sendSuccess(res, stats, 'Task statistics retrieved successfully');
    } catch (error) {
      return sendError(res, error.message || 'Failed to retrieve task statistics', 500);
    }
  }

  
  async getOverdueTasks(req, res) {
    try {
      const userId = req.user._id;
      const overdueTasks = await taskService.getOverdueTasks(userId);
      
      return sendSuccess(res, overdueTasks, 'Overdue tasks retrieved successfully');
    } catch (error) {
      return sendError(res, error.message || 'Failed to retrieve overdue tasks', 500);
    }
  }

  
  async getTasksByStatus(req, res) {
    try {
      const { status } = req.params;
      const userId = req.user._id;
      const options = req.query;
      
      const result = await taskService.getTasksByStatus(userId, status, options);
      
      return sendPaginatedResponse(
        res,
        result.tasks,
        result.pagination,
        `Tasks with status '${status}' retrieved successfully`
      );
    } catch (error) {
      return sendError(res, error.message || 'Failed to retrieve tasks by status', 500);
    }
  }

  
  async searchTasks(req, res) {
    try {
      const { q: searchTerm } = req.query;
      const userId = req.user._id;
      const options = { ...req.query };
      delete options.q; // Remove search term from options
      
      if (!searchTerm) {
        return sendError(res, 'Search term is required', 400);
      }
      
      const result = await taskService.searchTasks(userId, searchTerm, options);
      
      return sendPaginatedResponse(
        res,
        result.tasks,
        result.pagination,
        `Search results for '${searchTerm}'`
      );
    } catch (error) {
      return sendError(res, error.message || 'Failed to search tasks', 500);
    }
  }

  
  async getTasksDueToday(req, res) {
    try {
      const userId = req.user._id;
      const tasks = await taskService.getTasksDueToday(userId);
      
      return sendSuccess(res, tasks, 'Tasks due today retrieved successfully');
    } catch (error) {
      return sendError(res, error.message || 'Failed to retrieve tasks due today', 500);
    }
  }

  
  async getTasksDueThisWeek(req, res) {
    try {
      const userId = req.user._id;
      const tasks = await taskService.getTasksDueThisWeek(userId);
      
      return sendSuccess(res, tasks, 'Tasks due this week retrieved successfully');
    } catch (error) {
      return sendError(res, error.message || 'Failed to retrieve tasks due this week', 500);
    }
  }

  
  async bulkUpdateTasks(req, res) {
    try {
      const { taskIds, updateData } = req.body;
      const userId = req.user._id;
      
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return sendError(res, 'Task IDs array is required', 400);
      }
      
      if (!updateData || Object.keys(updateData).length === 0) {
        return sendError(res, 'Update data is required', 400);
      }
      
      const result = await taskService.bulkUpdateTasks(taskIds, updateData, userId);
      
      return sendSuccess(res, result, 'Tasks updated successfully');
    } catch (error) {
      if (error.message.includes('not found or access denied')) {
        return sendAuthorizationError(res, error.message);
      }
      
      return sendError(res, error.message || 'Failed to update tasks', 400);
    }
  }

  
  async bulkDeleteTasks(req, res) {
    try {
      const { taskIds } = req.body;
      const userId = req.user._id;
      
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return sendError(res, 'Task IDs array is required', 400);
      }
      
      const result = await taskService.bulkDeleteTasks(taskIds, userId);
      
      return sendSuccess(res, result, 'Tasks deleted successfully');
    } catch (error) {
      if (error.message.includes('not found or access denied')) {
        return sendAuthorizationError(res, error.message);
      }
      
      return sendError(res, error.message || 'Failed to delete tasks', 500);
    }
  }
}

module.exports = new TaskController();
