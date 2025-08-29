const mongoose = require('mongoose');

/**
 * Transaction utility for MongoDB operations
 * Provides helper functions for handling database transactions
 */

/**
 * Execute operations within a MongoDB transaction
 * @param {Function} operations - Async function containing database operations
 * @param {Object} options - Transaction options
 * @returns {Promise<any>} - Result of the operations
 */
const withTransaction = async (operations, options = {}) => {
  // Check if MongoDB replica set is available for transactions
  const session = await mongoose.startSession();
  
  try {
    let result;
    
    await session.withTransaction(async () => {
      result = await operations(session);
    }, {
      readPreference: 'primary',
      readConcern: { level: 'local' },
      writeConcern: { w: 'majority' },
      ...options
    });
    
    return result;
  } catch (error) {
    // Transaction automatically aborted on error
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Execute operations within a transaction with manual session management
 * Useful when you need more control over the session
 * @param {Function} operations - Async function that receives session
 * @param {Object} options - Transaction options
 * @returns {Promise<any>} - Result of the operations
 */
const withManualTransaction = async (operations, options = {}) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction({
      readConcern: { level: 'local' },
      writeConcern: { w: 'majority' },
      ...options
    });
    
    const result = await operations(session);
    
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Check if transactions are supported (requires replica set)
 * @returns {Promise<boolean>} - True if transactions are supported
 */
const isTransactionSupported = async () => {
  try {
    const adminDb = mongoose.connection.db.admin();
    const status = await adminDb.replSetGetStatus();
    return !!status;
  } catch (error) {
    // Not a replica set or other error
    return false;
  }
};

/**
 * Execute operations with transaction support if available, otherwise without
 * @param {Function} operations - Async function containing database operations
 * @param {Function} fallback - Fallback operations without session
 * @param {Object} options - Transaction options
 * @returns {Promise<any>} - Result of the operations
 */
const withOptionalTransaction = async (operations, fallback = null, options = {}) => {
  try {
    const transactionSupported = await isTransactionSupported();
    
    if (transactionSupported) {
      return await withTransaction(operations, options);
    } else {
      // Fall back to non-transactional operations
      console.warn('Transactions not supported (requires replica set), executing without transaction');
      
      if (fallback) {
        return await fallback();
      } else {
        // Execute operations without session
        return await operations(null);
      }
    }
  } catch (error) {
    // If transaction fails and fallback is provided, try fallback
    if (fallback && error.message.includes('transaction')) {
      console.warn('Transaction failed, falling back to non-transactional operations');
      return await fallback();
    }
    throw error;
  }
};

/**
 * Retry transaction on transient errors
 * @param {Function} operations - Async function containing database operations
 * @param {number} maxRetries - Maximum number of retries
 * @param {Object} options - Transaction options
 * @returns {Promise<any>} - Result of the operations
 */
const withRetryableTransaction = async (operations, maxRetries = 3, options = {}) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(operations, options);
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (isRetryableError(error) && attempt < maxRetries) {
        console.warn(`Transaction attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100)); // Exponential backoff
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

/**
 * Check if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error is retryable
 */
const isRetryableError = (error) => {
  const retryableErrorCodes = [
    11000, // DuplicateKey
    16500, // TransientTransactionError
    17280, // WriteConflict
    251,   // NoSuchTransaction
  ];
  
  const retryableLabels = [
    'TransientTransactionError',
    'UnknownTransactionCommitResult'
  ];
  
  return (
    retryableErrorCodes.includes(error.code) ||
    retryableLabels.some(label => error.hasOwnProperty('hasErrorLabel') && error.hasErrorLabel(label))
  );
};

/**
 * Execute multiple independent operations in parallel within a single transaction
 * @param {Array<Function>} operationsList - Array of async functions
 * @param {Object} options - Transaction options
 * @returns {Promise<Array>} - Array of results
 */
const withParallelTransaction = async (operationsList, options = {}) => {
  return await withTransaction(async (session) => {
    // Execute all operations in parallel with the same session
    const results = await Promise.all(
      operationsList.map(operation => operation(session))
    );
    return results;
  }, options);
};

/**
 * Transaction statistics and monitoring
 */
const transactionStats = {
  successful: 0,
  failed: 0,
  retried: 0,
  
  incrementSuccess() {
    this.successful++;
  },
  
  incrementFailure() {
    this.failed++;
  },
  
  incrementRetry() {
    this.retried++;
  },
  
  getStats() {
    return {
      successful: this.successful,
      failed: this.failed,
      retried: this.retried,
      total: this.successful + this.failed
    };
  },
  
  reset() {
    this.successful = 0;
    this.failed = 0;
    this.retried = 0;
  }
};

module.exports = {
  withTransaction,
  withManualTransaction,
  withOptionalTransaction,
  withRetryableTransaction,
  withParallelTransaction,
  isTransactionSupported,
  transactionStats
};
