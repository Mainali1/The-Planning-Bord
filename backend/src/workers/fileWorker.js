const { fileQueue } = require('../config/queue');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { Readable } = require('stream');
const knex = require('../config/database');

// File processing for inventory imports
fileQueue.process('process-inventory-import', async (job) => {
  const { filePath, businessId, userId, originalName, processingType = 'import' } = job.data;
  
  logger.info(`Processing inventory import file`, {
    filePath,
    businessId,
    originalName,
    processingType,
    jobId: job.id
  });

  try {
    const startTime = Date.now();
    const results = [];
    const errors = [];
    let processedCount = 0;
    let errorCount = 0;
    
    // Update job progress
    await job.progress(10);
    
    // Read and parse the CSV file
    const fileContent = await fs.readFile(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    const totalLines = lines.length - 1; // Subtract header row
    
    logger.info(`Found ${totalLines} data rows to process`);
    
    // Parse CSV manually (you could also use csv-parser library)
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Validate headers
    const requiredHeaders = ['name', 'sku', 'category', 'stock_quantity', 'price'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }
    
    await job.progress(20);
    
    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        const rowData = {};
        
        // Map data to headers
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });
        
        // Validate required fields
        if (!rowData.name || !rowData.sku) {
          throw new Error(`Missing required fields: name or SKU`);
        }
        
        // Parse numeric fields
        const stockQuantity = parseInt(rowData.stock_quantity) || 0;
        const price = parseFloat(rowData.price) || 0;
        const minThreshold = parseInt(rowData.min_threshold) || 10;
        
        if (isNaN(stockQuantity) || isNaN(price)) {
          throw new Error(`Invalid numeric values for stock_quantity or price`);
        }
        
        // Check if product already exists
        const existingProduct = await knex('products')
          .where({ 
            business_id: businessId, 
            sku: rowData.sku,
            is_active: true 
          })
          .first();
        
        if (existingProduct) {
          // Update existing product
          await knex('products')
            .where({ id: existingProduct.id })
            .update({
              name: rowData.name,
              description: rowData.description || existingProduct.description,
              category: rowData.category || existingProduct.category,
              stock_quantity: stockQuantity,
              min_threshold: minThreshold,
              price: price,
              updated_at: new Date()
            });
          
          // Create inventory log for update
          await knex('inventory_logs').insert({
            product_id: existingProduct.id,
            business_id: businessId,
            action: 'bulk_import_update',
            quantity_change: stockQuantity - existingProduct.stock_quantity,
            old_quantity: existingProduct.stock_quantity,
            new_quantity: stockQuantity,
            reason: `Bulk import update from CSV: ${originalName}`,
            created_at: new Date()
          });
          
          results.push({
            sku: rowData.sku,
            name: rowData.name,
            action: 'updated',
            oldStock: existingProduct.stock_quantity,
            newStock: stockQuantity
          });
          
        } else {
          // Insert new product
          const [productId] = await knex('products').insert({
            business_id: businessId,
            name: rowData.name,
            description: rowData.description || '',
            sku: rowData.sku,
            category: rowData.category || 'General',
            stock_quantity: stockQuantity,
            min_threshold: minThreshold,
            price: price,
            created_at: new Date(),
            updated_at: new Date()
          });
          
          // Create inventory log for new product
          await knex('inventory_logs').insert({
            product_id: productId,
            business_id: businessId,
            action: 'bulk_import_new',
            quantity_change: stockQuantity,
            old_quantity: 0,
            new_quantity: stockQuantity,
            reason: `Bulk import new from CSV: ${originalName}`,
            created_at: new Date()
          });
          
          results.push({
            sku: rowData.sku,
            name: rowData.name,
            action: 'created',
            stock: stockQuantity
          });
        }
        
        processedCount++;
        
        // Update progress every 10 items
        if (processedCount % 10 === 0) {
          const progress = 20 + (processedCount / totalLines) * 60;
          await job.progress(Math.min(progress, 80));
        }
        
      } catch (error) {
        errorCount++;
        errors.push({
          row: i + 1,
          data: lines[i],
          error: error.message
        });
        
        logger.warn(`Failed to process row ${i + 1}`, {
          error: error.message,
          rowData: lines[i]
        });
      }
    }
    
    await job.progress(80);
    
    // Clean up the uploaded file
    try {
      await fs.unlink(filePath);
      logger.info(`Cleaned up uploaded file: ${filePath}`);
    } catch (cleanupError) {
      logger.warn(`Failed to clean up file ${filePath}:`, cleanupError.message);
    }
    
    await job.progress(90);
    
    // Generate summary
    const summary = {
      totalRows: totalLines,
      processed: processedCount,
      errors: errorCount,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length
    };
    
    const duration = Date.now() - startTime;
    
    logger.info(`Inventory import completed successfully`, {
      businessId,
      originalName,
      summary,
      duration: `${duration}ms`,
      jobId: job.id
    });

    return {
      processed: true,
      fileName: originalName,
      summary,
      errors: errors.slice(0, 10), // Return first 10 errors
      duration,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error(`Inventory import failed`, {
      businessId,
      originalName,
      error: error.message,
      jobId: job.id
    });
    
    // Clean up the uploaded file even on error
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      logger.warn(`Failed to clean up file ${filePath} after error:`, cleanupError.message);
    }
    
    throw error;
  }
});

// File export processor
fileQueue.process('process-inventory-export', async (job) => {
  const { businessId, format = 'csv', filters = {}, userEmail } = job.data;
  
  logger.info(`Processing inventory export`, {
    businessId,
    format,
    userEmail,
    jobId: job.id
  });

  try {
    const startTime = Date.now();
    
    // Update job progress
    await job.progress(10);
    
    // Get inventory data
    let query = knex('products')
      .where({ business_id: businessId, is_active: true })
      .select('id', 'name', 'sku', 'category', 'description', 'stock_quantity', 'min_threshold', 'price', 'created_at', 'updated_at');
    
    // Apply filters
    if (filters.category) {
      query = query.where({ category: filters.category });
    }
    
    if (filters.lowStock) {
      query = query.whereRaw('stock_quantity <= min_threshold');
    }
    
    if (filters.search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${filters.search}%`)
          .orWhere('sku', 'ilike', `%${filters.search}%`)
          .orWhere('description', 'ilike', `%${filters.search}%`);
      });
    }
    
    const inventory = await query.orderBy('name');
    
    await job.progress(40);
    
    // Generate file based on format
    let fileContent;
    let fileName;
    
    if (format === 'csv') {
      fileContent = generateCSV(inventory);
      fileName = `inventory-export-${businessId}-${Date.now()}.csv`;
    } else if (format === 'json') {
      fileContent = JSON.stringify(inventory, null, 2);
      fileName = `inventory-export-${businessId}-${Date.now()}.json`;
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
    
    await job.progress(70);
    
    // Save file
    const exportsDir = path.join(__dirname, '../../exports');
    await fs.mkdir(exportsDir, { recursive: true });
    
    const filePath = path.join(exportsDir, fileName);
    await fs.writeFile(filePath, fileContent);
    
    await job.progress(90);
    
    // Send email with download link if email is provided
    if (userEmail) {
      const downloadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/downloads/${fileName}`;
      
      // Queue the email instead of sending directly
      const QueueService = require('../services/queueService');
      
      await QueueService.addReportEmail({
        userEmail,
        reportTitle: 'Inventory Export',
        downloadUrl,
        format,
        recordCount: inventory.length
      });
    }
    
    await job.progress(100);
    
    const duration = Date.now() - startTime;
    
    logger.info(`Inventory export completed successfully`, {
      businessId,
      format,
      recordCount: inventory.length,
      fileName,
      duration: `${duration}ms`,
      jobId: job.id
    });

    return {
      exported: true,
      format,
      recordCount: inventory.length,
      fileName,
      filePath,
      duration,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error(`Inventory export failed`, {
      businessId,
      format,
      error: error.message,
      jobId: job.id
    });
    
    throw error;
  }
});

// Helper function to generate CSV
function generateCSV(inventory) {
  const headers = ['Name', 'SKU', 'Category', 'Description', 'Stock Quantity', 'Min Threshold', 'Price', 'Created At', 'Updated At'];
  
  let csv = headers.join(',') + '\n';
  
  for (const item of inventory) {
    const row = [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.sku.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      item.stock_quantity,
      item.min_threshold,
      item.price,
      item.created_at,
      item.updated_at
    ];
    
    csv += row.join(',') + '\n';
  }
  
  return csv;
}

// Cleanup old export files (runs periodically)
fileQueue.process('cleanup-exports', async (job) => {
  const { maxAgeHours = 24 } = job.data;
  
  logger.info(`Starting export cleanup`, {
    maxAgeHours,
    jobId: job.id
  });

  try {
    const exportsDir = path.join(__dirname, '../../exports');
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
    const now = Date.now();
    
    let deletedCount = 0;
    
    try {
      const files = await fs.readdir(exportsDir);
      
      for (const file of files) {
        const filePath = path.join(exportsDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`Deleted old export file: ${file}`);
        }
      }
    } catch (dirError) {
      logger.warn(`Could not read exports directory:`, dirError.message);
    }
    
    logger.info(`Export cleanup completed`, {
      deletedCount,
      maxAgeHours,
      jobId: job.id
    });

    return {
      cleaned: true,
      deletedCount,
      maxAgeHours,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error(`Export cleanup failed`, {
      maxAgeHours,
      error: error.message,
      jobId: job.id
    });
    
    throw error;
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('File worker received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('File worker received SIGINT, shutting down gracefully...');
  process.exit(0);
});

logger.info('📁 File worker started and ready to process jobs');