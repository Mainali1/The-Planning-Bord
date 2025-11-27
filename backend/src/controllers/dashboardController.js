const knex = require('../config/database');

const getDashboardStats = async (req, res, next) => {
  try {
    const totalProducts = await knex('products').count('* as count').first();
    const lowStockProducts = await knex('products')
      .whereRaw('current_quantity < min_quantity')
      .count('* as count')
      .first();
    const activeEmployees = await knex('employees')
      .where('status', 'active')
      .count('* as count')
      .first();
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyPayments = await knex('payments')
      .where(knex.raw("DATE_TRUNC('month', date) = ?", [currentMonth + '-01']))
      .sum('amount as total')
      .first();

    res.json({
      totalProducts: parseInt(totalProducts.count),
      lowStockItems: parseInt(lowStockProducts.count),
      activeEmployees: parseInt(activeEmployees.count),
      monthlyPayments: parseFloat(monthlyPayments.total || 0)
    });
  } catch (error) {
    next(error);
  }
};

const getInventoryTrends = async (req, res, next) => {
  try {
    const trends = await knex('inventory_logs')
      .join('products', 'inventory_logs.product_id', 'products.product_id')
      .select(
        'products.name',
        knex.raw('SUM(quantity_changed) as total_change'),
        knex.raw("DATE_TRUNC('month', inventory_logs.timestamp) as month")
      )
      .groupBy('products.name', 'month')
      .orderBy('month', 'desc')
      .limit(12);

    const formattedTrends = trends.map(trend => ({
      name: trend.name,
      value: Math.abs(parseInt(trend.total_change)),
      month: new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }));

    res.json(formattedTrends);
  } catch (error) {
    next(error);
  }
};

const getAttendanceStats = async (req, res, next) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const stats = await knex('attendance')
      .select('status')
      .count('* as count')
      .where(knex.raw("DATE_TRUNC('month', date) = ?", [currentMonth + '-01']))
      .groupBy('status');

    const formattedStats = stats.map(stat => ({
      name: stat.status.charAt(0).toUpperCase() + stat.status.slice(1),
      value: parseInt(stat.count)
    }));

    res.json(formattedStats);
  } catch (error) {
    next(error);
  }
};

const getPaymentStats = async (req, res, next) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const stats = await knex('payments')
      .select('type')
      .sum('amount as total')
      .where(knex.raw("DATE_TRUNC('month', date) = ?", [currentMonth + '-01']))
      .groupBy('type');

    const formattedStats = stats.map(stat => ({
      name: stat.type.charAt(0).toUpperCase() + stat.type.slice(1),
      value: parseFloat(stat.total)
    }));

    res.json(formattedStats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getInventoryTrends,
  getAttendanceStats,
  getPaymentStats
};