const Task = require('../../models/Task.model');
const { withOptionalTransaction, withRetryableTransaction } = require('../../utils/transaction.util');
const webSocketService = require('../../services/websocket.service');

/**
 * Task Service
 * Handles all task-related business logic
 */
class TaskService {
 
  async createTask(taskData, userId) {
    console.log('=== TASK CREATION DEBUG ===');
    console.log('Full taskData received:', JSON.stringify(taskData, null, 2));
    console.log('UserId:', userId);
    console.log('Individual fields:');
    console.log('- title:', taskData.title);
    console.log('- description:', taskData.description);
    console.log('- status:', taskData.status);
    console.log('- priority:', taskData.priority);
    console.log('- dueDate:', taskData.dueDate);
    console.log('- tags:', taskData.tags);
    
    const { title, description, status = 'pending', priority = 'medium', dueDate, tags } = taskData;
    
    console.log('After destructuring:');
    console.log('- status:', status);
    console.log('- priority:', priority);
    console.log('- dueDate:', dueDate);

    console.log('Creating task object with:');
    console.log('- title:', title);
    console.log('- description:', description);
    console.log('- status:', status);
    console.log('- priority:', priority);
    console.log('- dueDate:', dueDate);
    console.log('- tags:', tags);
    console.log('- user:', userId);
    
    const task = new Task({
      title,
      description,
      status,
      priority,
      dueDate,
      tags,
      user: userId
    });

    console.log('Task object before save:', JSON.stringify(task.toObject(), null, 2));
    
    await task.save();
    
    console.log('Task object after save:', JSON.stringify(task.toObject(), null, 2));
    console.log('=== END TASK CREATION DEBUG ===');

    // Emit WebSocket event for real-time updates
    webSocketService.emitTaskCreated(userId, task);

    return task;
  }


  async getTasks(userId, options = {}) {
    const result = await Task.getTasksByUser(userId, options);
    return result;
  }


  async getTaskById(taskId, userId) {
    const task = await Task.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (!task.isOwnedBy(userId)) {
      throw new Error('Access denied: You can only access your own tasks');
    }

    return task;
  }

 
  async updateTask(taskId, updateData, userId) {
    const task = await Task.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (!task.isOwnedBy(userId)) {
      throw new Error('Access denied: You can only update your own tasks');
    }

    // Update task fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        task[key] = updateData[key];
      }
    });

    await task.save();

    // Emit WebSocket event for real-time updates
    webSocketService.emitTaskUpdated(userId, task);

    return task;
  }

 
  async deleteTask(taskId, userId) {
    const task = await Task.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (!task.isOwnedBy(userId)) {
      throw new Error('Access denied: You can only delete your own tasks');
    }

    await Task.findByIdAndDelete(taskId);

    // Emit WebSocket event for real-time updates
    webSocketService.emitTaskDeleted(userId, taskId);

    return { message: 'Task deleted successfully' };
  }

 
  async markTaskAsCompleted(taskId, userId) {
    const task = await Task.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (!task.isOwnedBy(userId)) {
      throw new Error('Access denied: You can only update your own tasks');
    }

    if (task.status === 'completed') {
      throw new Error('Task is already completed');
    }

    await task.markAsCompleted();

    // Emit WebSocket event for real-time updates
    webSocketService.emitTaskUpdated(userId, task);

    return task;
  }


  async getTaskStats(userId) {
    const stats = await Task.getTaskStats(userId);
    return stats;
  }


  async getOverdueTasks(userId) {
    const overdueTasks = await Task.getOverdueTasks(userId);
    return overdueTasks;
  }


  async getTasksByStatus(userId, status, options = {}) {
    const queryOptions = { ...options, status };
    return await this.getTasks(userId, queryOptions);
  }


  async searchTasks(userId, searchTerm, options = {}) {
    const queryOptions = { ...options, search: searchTerm };
    return await this.getTasks(userId, queryOptions);
  }


  async getTasksDueToday(userId) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const tasks = await Task.find({
      user: userId,
      status: { $ne: 'completed' },
      dueDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ dueDate: 1 });

    return tasks;
  }


  async getTasksDueThisWeek(userId) {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 7);

    const tasks = await Task.find({
      user: userId,
      status: { $ne: 'completed' },
      dueDate: {
        $gte: startOfWeek,
        $lt: endOfWeek
      }
    }).sort({ dueDate: 1 });

    return tasks;
  }

 
  async bulkUpdateTasks(taskIds, updateData, userId) {
    return await withRetryableTransaction(async (session) => {
      // Verify all tasks belong to the user within transaction
      const tasks = await Task.find({
        _id: { $in: taskIds },
        user: userId
      }).session(session);

      if (tasks.length !== taskIds.length) {
        throw new Error('Some tasks not found or access denied');
      }

      // Update all tasks within transaction
      const result = await Task.updateMany(
        {
          _id: { $in: taskIds },
          user: userId
        },
        {
          ...updateData,
          updatedAt: new Date() // Ensure updatedAt is set
        },
        { session }
      );

      return {
        message: `${result.modifiedCount} tasks updated successfully`,
        modifiedCount: result.modifiedCount,
        taskIds: taskIds
      };
    }, 3); // Retry up to 3 times on transient errors
  }


  async bulkDeleteTasks(taskIds, userId) {
    return await withRetryableTransaction(async (session) => {
      // Verify all tasks belong to the user within transaction
      const tasks = await Task.find({
        _id: { $in: taskIds },
        user: userId
      }).session(session);

      if (tasks.length !== taskIds.length) {
        throw new Error('Some tasks not found or access denied');
      }

      // Store task details before deletion for audit/logging
      const tasksToDelete = tasks.map(task => ({
        id: task._id,
        title: task.title,
        status: task.status
      }));

      // Delete all tasks within transaction
      const result = await Task.deleteMany({
        _id: { $in: taskIds },
        user: userId
      }, { session });

      return {
        message: `${result.deletedCount} tasks deleted successfully`,
        deletedCount: result.deletedCount,
        deletedTasks: tasksToDelete
      };
    }, 3); // Retry up to 3 times on transient errors
  }
}

module.exports = new TaskService();
