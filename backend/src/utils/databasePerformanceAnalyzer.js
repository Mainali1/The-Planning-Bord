const knex = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Database Performance Analyzer
 * Provides tools for analyzing query performance and identifying bottlenecks
 */
class DatabasePerformanceAnalyzer {
  constructor() {
    this.slowQueryThreshold = 1000; // 1 second
    this.queryLog = [];
    this.isMonitoring = false;
  }

  /**
   * Start query performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Database performance monitoring already active');
      return;
    }

    // Hook into knex query events
    knex.on('query', (query) => {
      query.__startTime = Date.now();
    });

    knex.on('query-response', (response, query) => {
      const duration = Date.now() - query.__startTime;
      
      if (duration > this.slowQueryThreshold) {
        this.logSlowQuery(query, duration);
      }

      this.queryLog.push({
        sql: query.sql,
        bindings: query.bindings,
        duration,
        timestamp: new Date().toISOString()
      });

      // Keep only last 1000 queries to prevent memory issues
      if (this.queryLog.length > 1000) {
        this.queryLog.shift();
      }
    });

    knex.on('query-error', (error, query) => {
      const duration = Date.now() - query.__startTime;
      logger.error('Database query error', {
        sql: query.sql,
        bindings: query.bindings,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    this.isMonitoring = true;
    logger.info('Database performance monitoring started');
  }

  /**
   * Stop query performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      logger.warn('Database performance monitoring not active');
      return;
    }

    // Remove event listeners
    knex.removeAllListeners('query');
    knex.removeAllListeners('query-response');
    knex.removeAllListeners('query-error');

    this.isMonitoring = false;
    logger.info('Database performance monitoring stopped');
  }

  /**
   * Log slow queries
   */
  logSlowQuery(query, duration) {
    logger.warn('Slow query detected', {
      sql: query.sql,
      bindings: query.bindings,
      duration: `${duration}ms`,
      threshold: `${this.slowQueryThreshold}ms`,
      timestamp: new Date().toISOString()
    });

    // Send to error tracking service if configured
    if (process.env.SENTRY_DSN) {
      const { ErrorTrackingService } = require('./errorTrackingService');
      ErrorTrackingService.captureMessage(
        `Slow query detected: ${duration}ms`,
        'warning',
        {
          sql: query.sql,
          bindings: query.bindings,
          duration,
          threshold: this.slowQueryThreshold
        }
      );
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    if (this.queryLog.length === 0) {
      return { message: 'No query data available' };
    }

    const totalQueries = this.queryLog.length;
    const slowQueries = this.queryLog.filter(q => q.duration > this.slowQueryThreshold);
    const totalDuration = this.queryLog.reduce((sum, q) => sum + q.duration, 0);
    
    // Group queries by table
    const tableStats = {};
    this.queryLog.forEach(query => {
      const table = this.extractTableName(query.sql);
      if (!tableStats[table]) {
        tableStats[table] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          slowQueries: 0
        };
      }
      
      tableStats[table].count++;
      tableStats[table].totalDuration += query.duration;
      if (query.duration > this.slowQueryThreshold) {
        tableStats[table].slowQueries++;
      }
    });

    // Calculate averages
    Object.keys(tableStats).forEach(table => {
      const stats = tableStats[table];
      stats.avgDuration = Math.round(stats.totalDuration / stats.count);
      stats.slowQueryPercentage = Math.round((stats.slowQueries / stats.count) * 100);
    });

    return {
      totalQueries,
      slowQueries: slowQueries.length,
      slowQueryPercentage: Math.round((slowQueries.length / totalQueries) * 100),
      avgDuration: Math.round(totalDuration / totalQueries),
      maxDuration: Math.max(...this.queryLog.map(q => q.duration)),
      minDuration: Math.min(...this.queryLog.map(q => q.duration)),
      p95Duration: this.calculatePercentile(95),
      p99Duration: this.calculatePercentile(99),
      tableStats,
      topSlowQueries: slowQueries
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map(q => ({
          sql: q.sql.substring(0, 200) + (q.sql.length > 200 ? '...' : ''),
          duration: q.duration,
          timestamp: q.timestamp
        }))
    };
  }

  /**
   * Extract table name from SQL query
   */
  extractTableName(sql) {
    const match = sql.match(/(?:FROM|JOIN|UPDATE|INTO)\s+`?(\w+)`?/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Calculate percentile for query durations
   */
  calculatePercentile(percentile) {
    const sorted = this.queryLog.map(q => q.duration).sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return sorted[index] || 0;
  }

  /**
   * Analyze specific table performance
   */
  async analyzeTable(tableName) {
    try {
      // Get table size and row count
      const [tableInfo] = await knex.raw(`
        SELECT 
          table_name,
          table_rows,
          data_length,
          index_length,
          (data_length + index_length) as total_size
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = ?
      `, [tableName]);

      // Get index information
      const indexes = await knex.raw(`
        SELECT 
          index_name,
          column_name,
          cardinality,
          nullable
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = ?
        ORDER BY index_name, seq_in_index
      `, [tableName]);

      // Analyze query patterns for this table
      const tableQueries = this.queryLog.filter(q => 
        this.extractTableName(q.sql) === tableName
      );

      const avgDuration = tableQueries.length > 0 
        ? Math.round(tableQueries.reduce((sum, q) => sum + q.duration, 0) / tableQueries.length)
        : 0;

      const slowQueries = tableQueries.filter(q => q.duration > this.slowQueryThreshold);

      return {
        tableName,
        rowCount: tableInfo?.table_rows || 0,
        dataSize: this.formatBytes(tableInfo?.data_length || 0),
        indexSize: this.formatBytes(tableInfo?.index_length || 0),
        totalSize: this.formatBytes(tableInfo?.total_size || 0),
        queryCount: tableQueries.length,
        avgQueryDuration: avgDuration,
        slowQueries: slowQueries.length,
        indexes: indexes.map(idx => ({
          name: idx.index_name,
          column: idx.column_name,
          cardinality: idx.cardinality,
          nullable: idx.nullable === 'YES'
        })),
        recommendations: this.generateTableRecommendations(tableName, tableQueries)
      };
    } catch (error) {
      logger.error('Failed to analyze table', { tableName, error: error.message });
      throw error;
    }
  }

  /**
   * Generate performance recommendations for a table
   */
  generateTableRecommendations(tableName, queries) {
    const recommendations = [];
    const slowQueries = queries.filter(q => q.duration > this.slowQueryThreshold);

    if (slowQueries.length > queries.length * 0.1) { // More than 10% slow queries
      recommendations.push({
        type: 'performance',
        priority: 'high',
        description: `High percentage of slow queries (${Math.round((slowQueries.length / queries.length) * 100)}%) detected for table ${tableName}`
      });
    }

    // Analyze query patterns for missing indexes
    const patterns = this.analyzeQueryPatterns(queries);
    patterns.forEach(pattern => {
      if (pattern.frequency > 5 && !pattern.hasIndex) {
        recommendations.push({
          type: 'index',
          priority: 'medium',
          description: `Consider adding index on ${tableName}.${pattern.column} for frequent ${pattern.operation} operations`
        });
      }
    });

    return recommendations;
  }

  /**
   * Analyze query patterns to identify missing indexes
   */
  analyzeQueryPatterns(queries) {
    const patterns = {};
    
    queries.forEach(query => {
      const sql = query.sql.toLowerCase();
      
      // Look for WHERE clauses
      const whereMatch = sql.match(/where\s+`?(\w+)`?\s*=\s*\?/);
      if (whereMatch) {
        const column = whereMatch[1];
        const key = `where_${column}`;
        patterns[key] = patterns[key] || { column, operation: 'WHERE', frequency: 0, hasIndex: false };
        patterns[key].frequency++;
      }

      // Look for JOIN clauses
      const joinMatch = sql.match(/join\s+`?(\w+)`?\s+on\s+`?(\w+)`?\.`?(\w+)`?\s*=\s*/);
      if (joinMatch) {
        const column = joinMatch[3];
        const key = `join_${column}`;
        patterns[key] = patterns[key] || { column, operation: 'JOIN', frequency: 0, hasIndex: false };
        patterns[key].frequency++;
      }
    });

    return Object.values(patterns);
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate performance report
   */
  async generateReport() {
    const stats = this.getPerformanceStats();
    
    if (stats.message) {
      return stats;
    }

    // Analyze top tables
    const tables = ['products', 'inventory_logs', 'employees', 'attendance', 'payments'];
    const tableAnalyses = {};

    for (const table of tables) {
      try {
        tableAnalyses[table] = await this.analyzeTable(table);
      } catch (error) {
        logger.error(`Failed to analyze table ${table}`, { error: error.message });
        tableAnalyses[table] = { error: error.message };
      }
    }

    return {
      summary: stats,
      tableAnalyses,
      recommendations: this.generateOverallRecommendations(stats, tableAnalyses),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate overall performance recommendations
   */
  generateOverallRecommendations(stats, tableAnalyses) {
    const recommendations = [];

    // High-level recommendations
    if (stats.slowQueryPercentage > 10) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        description: `High slow query rate (${stats.slowQueryPercentage}%) - consider adding indexes or optimizing queries`
      });
    }

    if (stats.p95Duration > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        description: `High P95 response time (${stats.p95Duration}ms) - investigate slowest queries`
      });
    }

    // Table-specific recommendations
    Object.entries(tableAnalyses).forEach(([table, analysis]) => {
      if (analysis.recommendations) {
        recommendations.push(...analysis.recommendations.map(rec => ({
          ...rec,
          table
        })));
      }
    });

    return recommendations;
  }
}

// Create singleton instance
const performanceAnalyzer = new DatabasePerformanceAnalyzer();

module.exports = performanceAnalyzer;