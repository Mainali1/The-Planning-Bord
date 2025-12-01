const { inventoryQueue } = require('../config/queue');
const logger = require('../utils/logger');
const knex = require('../config/database');

// External system sync processor
inventoryQueue.process('sync-external', async (job) => {
  const { businessId, externalSystem, syncType = 'full' } = job.data;
  
  logger.info(`Processing external inventory sync`, {
    businessId,
    externalSystem,
    syncType,
    jobId: job.id
  });

  try {
    // Simulate external system sync (replace with actual integration)
    const startTime = Date.now();
    
    // Update job progress
    await job.progress(10);
    
    // Step 1: Get current inventory from external system
    logger.info(`Fetching inventory from ${externalSystem}...`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
    
    await job.progress(30);
    
    // Step 2: Compare with local inventory
    logger.info(`Comparing inventory data...`);
    const localInventory = await knex('products')
      .where({ business_id: businessId, is_active: true })
      .select('id', 'name', 'stock_quantity', 'sku');
    
    await job.progress(50);
    
    // Step 3: Update local inventory with external data
    logger.info(`Updating local inventory...`);
    const updates = [];
    
    // Simulate external data (replace with actual API response)
    const externalInventory = [
      { sku: 'PROD-001', quantity: 95 },
      { sku: 'PROD-002', quantity: 47 },
      { sku: 'PROD-003', quantity: 203 }
    ];
    
    for (const externalItem of externalInventory) {
      const localItem = localInventory.find(item => item.sku === externalItem.sku);
      if (localItem && localItem.stock_quantity !== externalItem.quantity) {
        updates.push({
          productId: localItem.id,
          oldQuantity: localItem.stock_quantity,
          newQuantity: externalItem.quantity,
          sku: externalItem.sku
        });
        
        // Update the product
        await knex('products')
          .where({ id: localItem.id })
          .update({ 
            stock_quantity: externalItem.quantity,
            updated_at: new Date()
          });
        
        // Create inventory log entry
        await knex('inventory_logs').insert({
          product_id: localItem.id,
          business_id: businessId,
          action: 'sync_update',
          quantity_change: externalItem.quantity - localItem.stock_quantity,
          old_quantity: localItem.stock_quantity,
          new_quantity: externalItem.quantity,
          reason: `External sync from ${externalSystem}`,
          created_at: new Date()
        });
      }
    }
    
    await job.progress(80);
    
    // Step 4: Check for low stock after sync
    logger.info(`Checking for low stock items...`);
    const lowStockItems = await knex('products')
      .where({ business_id: businessId, is_active: true })
      .andWhereRaw('stock_quantity <= min_threshold')
      .select('id', 'name', 'stock_quantity', 'min_threshold');
    
    await job.progress(90);
    
    // Step 5: Send notifications for low stock items
    if (lowStockItems.length > 0) {
      logger.info(`Found ${lowStockItems.length} low stock items, sending notifications...`);
      
      // Queue low stock alerts (you'll need to import QueueService)
      const QueueService = require('../services/queueService');
      
      for (const item of lowStockItems) {
        await QueueService.addLowStockAlert({
          productId: item.id,
          businessId: businessId,
          currentStock: item.stock_quantity,
          minThreshold: item.min_threshold,
          productName: item.name,
          businessName: 'Your Business' // You should get this from database
        });
      }
    }
    
    await job.progress(100);
    
    const duration = Date.now() - startTime;
    
    logger.info(`External inventory sync completed successfully`, {
      businessId,
      externalSystem,
      itemsUpdated: updates.length,
      lowStockItemsFound: lowStockItems.length,
      duration: `${duration}ms`,
      jobId: job.id
    });

    return {
      synced: true,
      externalSystem,
      itemsUpdated: updates.length,
      lowStockItemsFound: lowStockItems.length,
      updates: updates,
      duration: duration,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error(`External inventory sync failed`, {
      businessId,
      externalSystem,
      error: error.message,
      jobId: job.id
    });
    
    throw error;
  }
});

// Bulk inventory update processor
inventoryQueue.process('bulk-update', async (job) => {
  const { updates, businessId, updateType = 'manual' } = job.data;
  
  logger.info(`Processing bulk inventory update`, {
    businessId,
    updateCount: updates.length,
    updateType,
    jobId: job.id
  });

  const trx = await knex.transaction();
  
  try {
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Update job progress
    await job.progress(10);
    
    // Process updates in batches of 50
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(updates.length / batchSize);
      
      logger.info(`Processing batch ${batchNumber}/${totalBatches}`, {
        batchSize: batch.length,
        processed: processedCount,
        total: updates.length
      });
      
      await job.progress(10 + (i / updates.length) * 80);
      
      for (const update of batch) {
        try {
          // Validate the update
          if (!update.productId || update.newQuantity === undefined) {
            throw new Error(`Invalid update data: missing productId or newQuantity`);
          }
          
          // Get current product info
          const product = await trx('products')
            .where({ 
              id: update.productId, 
              business_id: businessId,
              is_active: true 
            })
            .first();
          
          if (!product) {
            throw new Error(`Product ${update.productId} not found or inactive`);
          }
          
          const oldQuantity = product.stock_quantity;
          const newQuantity = update.newQuantity;
          const quantityChange = newQuantity - oldQuantity;
          
          // Update product quantity
          await trx('products')
            .where({ id: update.productId })
            .update({ 
              stock_quantity: newQuantity,
              updated_at: new Date()
            });
          
          // Create inventory log entry
          await trx('inventory_logs').insert({
            product_id: update.productId,
            business_id: businessId,
            action: updateType === 'import' ? 'bulk_import' : 'bulk_update',
            quantity_change: quantityChange,
            old_quantity: oldQuantity,
            new_quantity: newQuantity,
            reason: update.reason || `Bulk update via ${updateType}`,
            created_at: new Date()
          });
          
          processedCount++;
          
        } catch (error) {
          errorCount++;
          errors.push({
            productId: update.productId,
            error: error.message
          });
          
          logger.warn(`Failed to update product ${update.productId}`, {
            error: error.message,
            jobId: job.id
          });
        }
      }
    }
    
    await job.progress(90);
    
    // Commit the transaction
    await trx.commit();
    
    await job.progress(100);
    
    const duration = Date.now() - startTime;
    
    logger.info(`Bulk inventory update completed`, {
      businessId,
      processedCount,
      errorCount,
      duration: `${duration}ms`,
      jobId: job.id
    });

    return {
      updated: true,
      processedCount,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors
      duration,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    await trx.rollback();
    
    logger.error(`Bulk inventory update failed`, {
      businessId,
      error: error.message,
      jobId: job.id
    });
    
    throw error;
  }
});

// Stock level check processor (runs periodically)
inventoryQueue.process('stock-check', async (job) => {
  const { businessId, checkType = 'all' } = job.data;
  
  logger.info(`Processing stock level check`, {
    businessId,
    checkType,
    jobId: job.id
  });

  try {
    // Get all products for the business
    const products = await knex('products')
      .where({ business_id: businessId, is_active: true })
      .select('id', 'name', 'stock_quantity', 'min_threshold', 'sku', 'category');
    
    const lowStockItems = [];
    const outOfStockItems = [];
    const overstockItems = [];
    
    // Analyze each product
    for (const product of products) {
      if (product.stock_quantity === 0) {
        outOfStockItems.push(product);
      } else if (product.stock_quantity <= product.min_threshold) {
        lowStockItems.push(product);
      } else if (product.stock_quantity > (product.min_threshold * 5)) { // Overstock threshold
        overstockItems.push(product);
      }
    }
    
    // Generate summary report
    const summary = {
      totalProducts: products.length,
      lowStockItems: lowStockItems.length,
      outOfStockItems: outOfStockItems.length,
      overstockItems: overstockItems.length,
      healthyStockItems: products.length - lowStockItems.length - outOfStockItems.length - overstockItems.length
    };
    
    // Send notifications for critical items
    if (lowStockItems.length > 0 || outOfStockItems.length > 0) {
      const QueueService = require('../services/queueService');
      
      // Send summary email
      await QueueService.addLowStockAlert({
        productId: 'summary',
        businessId: businessId,
        currentStock: lowStockItems.length + outOfStockItems.length,
        minThreshold: 0,
        productName: `Inventory Summary: ${lowStockItems.length} low stock, ${outOfStockItems.length} out of stock`,
        businessName: 'Your Business'
      });
    }
    
    logger.info(`Stock level check completed`, {
      businessId,
      summary,
      jobId: job.id
    });

    return {
      checked: true,
      summary,
      details: {
        lowStockItems: lowStockItems.map(p => ({ id: p.id, name: p.name, stock: p.stock_quantity, threshold: p.min_threshold })),
        outOfStockItems: outOfStockItems.map(p => ({ id: p.id, name: p.name })),
        overstockItems: overstockItems.map(p => ({ id: p.id, name: p.name, stock: p.stock_quantity, threshold: p.min_threshold }))
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error(`Stock level check failed`, {
      businessId,
      error: error.message,
      jobId: job.id
    });
    
    throw error;
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Inventory worker received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Inventory worker received SIGINT, shutting down gracefully...');
  process.exit(0);
});

logger.info('📦 Inventory worker started and ready to process jobs');