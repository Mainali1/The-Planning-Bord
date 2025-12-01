const { emailQueue, inventoryQueue, reportQueue, fileQueue } = require('../config/queue');
const logger = require('../utils/logger');

/**
 * Queue Service for handling background job processing
 * Provides methods to add jobs to different queues
 */

class QueueService {
  /**
   * Add a low-stock alert email to the queue
   * @param {Object} data - Alert data
   * @param {number} data.productId - Product ID
   * @param {number} data.businessId - Business ID
   * @param {number} data.currentStock - Current stock level
   * @param {number} data.minThreshold - Minimum threshold
   * @param {string} data.productName - Product name
   * @param {string} data.businessName - Business name
   * @param {Object} options - Job options
   * @returns {Promise} Job promise
   */
  static async addLowStockAlert(data, options = {}) {
    try {
      const job = await emailQueue.add('low-stock-alert', data, {
        priority: 1, // High priority
        delay: 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        ...options
      });

      logger.info(`Low-stock alert queued successfully`, {
        jobId: job.id,
        productId: data.productId,
        businessId: data.businessId
      });

      return job;
    } catch (error) {
      logger.error(`Failed to queue low-stock alert`, {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Add a task assignment email to the queue
   * @param {Object} data - Task assignment data
   * @param {number} data.employeeId - Employee ID
   * @param {string} data.employeeEmail - Employee email
   * @param {string} data.employeeName - Employee name
   * @param {string} data.managerName - Manager name
   * @param {Object} data.taskDetails - Task details
   * @param {Object} options - Job options
   * @returns {Promise} Job promise
   */
  static async addTaskAssignmentEmail(data, options = {}) {
    try {
      const job = await emailQueue.add('task-assignment', data, {
        priority: 1,
        delay: 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        ...options
      });

      logger.info(`Task assignment email queued successfully`, {
        jobId: job.id,
        employeeId: data.employeeId,
        taskId: data.taskDetails.id
      });

      return job;
    } catch (error) {
      logger.error(`Failed to queue task assignment email`, {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Add a welcome email to the queue
   * @param {Object} data - Welcome email data
   * @param {string} data.userEmail - User email
   * @param {string} data.userName - User name
   * @param {string} data.businessName - Business name
   * @param {Object} options - Job options
   * @returns {Promise} Job promise
   */
  static async addWelcomeEmail(data, options = {}) {
    try {
      const job = await emailQueue.add('welcome', data, {
        priority: 2, // Medium priority
        delay: 5000, // 5 second delay
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 3000
        },
        ...options
      });

      logger.info(`Welcome email queued successfully`, {
        jobId: job.id,
        userEmail: data.userEmail
      });

      return job;
    } catch (error) {
      logger.error(`Failed to queue welcome email`, {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Add inventory sync job to the queue
   * @param {Object} data - Sync data
   * @param {number} data.businessId - Business ID
   * @param {string} data.externalSystem - External system name
   * @param {Object} options - Job options
   * @returns {Promise} Job promise
   */
  static async addInventorySync(data, options = {}) {
    try {
      const job = await inventoryQueue.add('sync-external', data, {
        priority: 2,
        delay: 0,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        ...options
      });

      logger.info(`Inventory sync job queued successfully`, {
        jobId: job.id,
        businessId: data.businessId,
        externalSystem: data.externalSystem
      });

      return job;
    } catch (error) {
      logger.error(`Failed to queue inventory sync`, {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Add bulk inventory update job to the queue
   * @param {Object} data - Bulk update data
   * @param {number} data.businessId - Business ID
   * @param {Array} data.updates - Array of inventory updates
   * @param {Object} options - Job options
   * @returns {Promise} Job promise
   */
  static async addBulkInventoryUpdate(data, options = {}) {
    try {
      const job = await inventoryQueue.add('bulk-update', data, {
        priority: 3, // Lower priority for bulk operations
        delay: 0,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000 // 10 seconds
        },
        ...options
      });

      logger.info(`Bulk inventory update job queued successfully`, {
        jobId: job.id,
        businessId: data.businessId,
        updateCount: data.updates.length
      });

      return job;
    } catch (error) {
      logger.error(`Failed to queue bulk inventory update`, {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Add report generation job to the queue
   * @param {Object} data - Report data
   * @param {number} data.businessId - Business ID
   * @param {string} data.reportType - Type of report
   * @param {Object} data.filters - Report filters
   * @param {string} data.userEmail - Email to send report to
   * @param {Object} options - Job options
   * @returns {Promise} Job promise
   */
  static async addReportGeneration(data, options = {}) {
    try {
      const job = await reportQueue.add('generate-report', data, {
        priority: 3, // Lower priority for reports
        delay: 2000, // 2 second delay
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 15000 // 15 seconds
        },
        ...options
      });

      logger.info(`Report generation job queued successfully`, {
        jobId: job.id,
        businessId: data.businessId,
        reportType: data.reportType
      });

      return job;
    } catch (error) {
      logger.error(`Failed to queue report generation`, {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Add file processing job to the queue
   * @param {Object} data - File processing data
   * @param {string} data.filePath - Path to the file
   * @param {number} data.businessId - Business ID
   * @param {number} data.userId - User ID
   * @param {string} data.originalName - Original file name
   * @param {string} data.processingType - Type of processing (import, export, etc.)
   * @param {Object} options - Job options
   * @returns {Promise} Job promise
   */
  static async addFileProcessing(data, options = {}) {
    try {
      const job = await fileQueue.add('process-file', data, {
        priority: 2,
        delay: 1000, // 1 second delay
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        ...options
      });

      logger.info(`File processing job queued successfully`, {
        jobId: job.id,
        businessId: data.businessId,
        fileName: data.originalName,
        processingType: data.processingType
      });

      return job;
    } catch (error) {
      logger.error(`Failed to queue file processing`, {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Get job status by ID
   * @param {string} queueName - Name of the queue
   * @param {string} jobId - Job ID
   * @returns {Promise} Job status
   */
  static async getJobStatus(queueName, jobId) {
    try {
      let queue;
      switch (queueName) {
        case 'email':
          queue = emailQueue;
          break;
        case 'inventory':
          queue = inventoryQueue;
          break;
        case 'report':
          queue = reportQueue;
          break;
        case 'file':
          queue = fileQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return { error: 'Job not found' };
      }

      return {
        id: job.id,
        status: await job.getState(),
        data: job.data,
        returnValue: job.returnvalue,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        created: job.timestamp,
        processed: job.processedOn,
        finished: job.finishedOn
      };
    } catch (error) {
      logger.error(`Failed to get job status`, {
        error: error.message,
        queueName,
        jobId
      });
      throw error;
    }
  }

  /**
   * Cancel a job
   * @param {string} queueName - Name of the queue
   * @param {string} jobId - Job ID
   * @returns {Promise} Cancellation result
   */
  static async cancelJob(queueName, jobId) {
    try {
      let queue;
      switch (queueName) {
        case 'email':
          queue = emailQueue;
          break;
        case 'inventory':
          queue = inventoryQueue;
          break;
        case 'report':
          queue = reportQueue;
          break;
        case 'file':
          queue = fileQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return { error: 'Job not found' };
      }

      await job.remove();
      
      logger.info(`Job cancelled successfully`, {
        queueName,
        jobId
      });

      return { success: true, message: 'Job cancelled' };
    } catch (error) {
      logger.error(`Failed to cancel job`, {
        error: error.message,
        queueName,
        jobId
      });
      throw error;
    }
  }
}

module.exports = QueueService;