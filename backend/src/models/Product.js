const knex = require('../config/database');

class Product {
  static async findAll() {
    return await knex('products')
      .join('categories', 'products.category_id', 'categories.category_id')
      .join('suppliers', 'products.supplier_id', 'suppliers.supplier_id')
      .select(
        'products.*',
        'categories.name as category_name',
        'suppliers.name as supplier_name',
        'suppliers.email as supplier_email'
      );
  }

  static async findById(productId) {
    return await knex('products')
      .join('categories', 'products.category_id', 'categories.category_id')
      .join('suppliers', 'products.supplier_id', 'suppliers.supplier_id')
      .where('products.product_id', productId)
      .select(
        'products.*',
        'categories.name as category_name',
        'suppliers.name as supplier_name',
        'suppliers.email as supplier_email',
        'suppliers.phone as supplier_phone'
      )
      .first();
  }

  static async create(productData) {
    const [product] = await knex('products')
      .insert(productData)
      .returning('*');
    return product;
  }

  static async update(productId, updateData) {
    const [product] = await knex('products')
      .where({ product_id: productId })
      .update(updateData)
      .returning('*');
    return product;
  }

  static async delete(productId) {
    return await knex('products')
      .where({ product_id: productId })
      .del();
  }

  static async getLowStockProducts() {
    return await knex('products')
      .join('suppliers', 'products.supplier_id', 'suppliers.supplier_id')
      .whereRaw('products.current_quantity < products.min_quantity')
      .select(
        'products.product_id',
        'products.name',
        'products.current_quantity',
        'products.min_quantity',
        'products.auto_order_quantity',
        'suppliers.name as supplier_name',
        'suppliers.email as supplier_email'
      );
  }

  static async updateQuantity(productId, quantityChange, changeType, notes = '') {
    await knex.transaction(async (trx) => {
      const product = await trx('products')
        .where({ product_id: productId })
        .first();

      if (!product) {
        throw new Error('Product not found');
      }

      const newQuantity = product.current_quantity + quantityChange;
      
      await trx('products')
        .where({ product_id: productId })
        .update({ current_quantity: newQuantity });

      await trx('inventory_logs').insert({
        product_id: productId,
        change_type: changeType,
        quantity_changed: quantityChange,
        notes: notes,
        timestamp: new Date()
      });
    });
  }
}

module.exports = Product;