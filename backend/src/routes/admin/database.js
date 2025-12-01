const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');
const databasePerformanceAnalyzer = require('../utils/databasePerformanceAnalyzer');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/admin/database/performance:
 *   get:
 *     summary: Get database performance statistics
 *     description: Retrieve comprehensive database performance metrics and analysis
 *     tags: [Admin - Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalQueries:
 *                   type: integer
 *                   description: Total number of queries analyzed
 *                 slowQueries:
 *                   type: integer
 *                   description: Number of queries exceeding threshold
 *                 slowQueryPercentage:
 *                   type: number
 *                   description: Percentage of slow queries
 *                 avgDuration:
 *                   type: integer
 *                   description: Average query duration in milliseconds
 *                 p95Duration:
 *                   type: integer
 *                   description: 95th percentile query duration
 *                 p99Duration:
 *                   type: integer
 *                   description: 99th percentile query duration
 *                 tableAnalyses:
 *                   type: object
 *                   description: Detailed analysis per table
 *                 recommendations:
 *                   type: array
 *                   description: Performance improvement recommendations
 *       500:
 *         description: Internal server error
 */
router.get('/performance', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const report = await databasePerformanceAnalyzer.generateReport();
    
    logger.info('Database performance report generated', {
      userId: req.user.id,
      totalQueries: report.summary?.totalQueries || 0,
      slowQueries: report.summary?.slowQueries || 0
    });

    res.json(report);
  } catch (error) {
    logger.error('Failed to generate database performance report', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({ 
      error: 'Failed to generate performance report',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/database/tables/{table}/analyze:
 *   get:
 *     summary: Analyze specific table performance
 *     description: Get detailed performance analysis for a specific database table
 *     tags: [Admin - Database]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *           enum: [products, inventory_logs, employees, attendance, payments]
 *         description: Name of the table to analyze
 *     responses:
 *       200:
 *         description: Table analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tableName:
 *                   type: string
 *                 rowCount:
 *                   type: integer
 *                 dataSize:
 *                   type: string
 *                 indexSize:
 *                   type: string
 *                 avgQueryDuration:
 *                   type: integer
 *                 slowQueries:
 *                   type: integer
 *                 indexes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid table name
 *       500:
 *         description: Internal server error
 */
router.get('/tables/:table/analyze', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { table } = req.params;
    
    // Validate table name
    const allowedTables = ['products', 'inventory_logs', 'employees', 'attendance', 'payments'];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ 
        error: 'Invalid table name',
        allowedTables 
      });
    }

    const analysis = await databasePerformanceAnalyzer.analyzeTable(table);
    
    logger.info('Table performance analysis completed', {
      userId: req.user.id,
      table,
      rowCount: analysis.rowCount,
      avgQueryDuration: analysis.avgQueryDuration
    });

    res.json(analysis);
  } catch (error) {
    logger.error('Failed to analyze table', {
      userId: req.user.id,
      table: req.params.table,
      error: error.message
    });
    res.status(500).json({ 
      error: 'Failed to analyze table',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/database/monitoring/start:
 *   post:
 *     summary: Start database performance monitoring
 *     description: Enable real-time query performance monitoring
 *     tags: [Admin - Database]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slowQueryThreshold:
 *                 type: integer
 *                 description: Threshold in milliseconds for considering queries slow (default: 1000)
 *     responses:
 *       200:
 *         description: Monitoring started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 slowQueryThreshold:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
router.post('/monitoring/start', authenticateToken, authorize(['admin']), (req, res) => {
  try {
    const { slowQueryThreshold } = req.body;
    
    if (slowQueryThreshold) {
      databasePerformanceAnalyzer.slowQueryThreshold = slowQueryThreshold;
    }
    
    databasePerformanceAnalyzer.startMonitoring();
    
    logger.info('Database performance monitoring started', {
      userId: req.user.id,
      slowQueryThreshold: databasePerformanceAnalyzer.slowQueryThreshold
    });

    res.json({
      message: 'Database performance monitoring started',
      slowQueryThreshold: databasePerformanceAnalyzer.slowQueryThreshold
    });
  } catch (error) {
    logger.error('Failed to start database monitoring', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({ 
      error: 'Failed to start monitoring',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/database/monitoring/stop:
 *   post:
 *     summary: Stop database performance monitoring
 *     description: Disable real-time query performance monitoring
 *     tags: [Admin - Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 queriesAnalyzed:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
router.post('/monitoring/stop', authenticateToken, authorize(['admin']), (req, res) => {
  try {
    const queriesAnalyzed = databasePerformanceAnalyzer.queryLog.length;
    
    databasePerformanceAnalyzer.stopMonitoring();
    
    logger.info('Database performance monitoring stopped', {
      userId: req.user.id,
      queriesAnalyzed
    });

    res.json({
      message: 'Database performance monitoring stopped',
      queriesAnalyzed
    });
  } catch (error) {
    logger.error('Failed to stop database monitoring', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({ 
      error: 'Failed to stop monitoring',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/database/query-log:
 *   get:
 *     summary: Get recent query log
 *     description: Retrieve recent database queries for analysis
 *     tags: [Admin - Database]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of queries to return
 *       - in: query
 *         name: slowOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Return only slow queries
 *     responses:
 *       200:
 *         description: Query log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 queries:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalCount:
 *                   type: integer
 *                 slowQueryCount:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/query-log', authenticateToken, authorize(['admin']), (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const slowOnly = req.query.slowOnly === 'true';
    
    let queries = databasePerformanceAnalyzer.queryLog;
    
    if (slowOnly) {
      queries = queries.filter(q => q.duration > databasePerformanceAnalyzer.slowQueryThreshold);
    }
    
    queries = queries.slice(-limit);
    
    // Truncate long SQL for readability
    const truncatedQueries = queries.map(q => ({
      ...q,
      sql: q.sql.length > 200 ? q.sql.substring(0, 200) + '...' : q.sql
    }));

    logger.info('Query log retrieved', {
      userId: req.user.id,
      limit,
      slowOnly,
      returnedCount: truncatedQueries.length
    });

    res.json({
      queries: truncatedQueries,
      totalCount: databasePerformanceAnalyzer.queryLog.length,
      slowQueryCount: databasePerformanceAnalyzer.queryLog.filter(
        q => q.duration > databasePerformanceAnalyzer.slowQueryThreshold
      ).length
    });
  } catch (error) {
    logger.error('Failed to retrieve query log', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({ 
      error: 'Failed to retrieve query log',
      message: error.message 
    });
  }
});

module.exports = router;