const Product = require('../models/Product');
const { sendRestockEmail } = require('../services/emailService');
const { validationResult } = require('express-validator');

const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.update(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const result = await Product.delete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.getLowStockProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const updateProductQuantity = async (req, res, next) => {
  try {
    const { quantityChange, changeType, notes } = req.body;
    
    await Product.updateQuantity(req.params.id, quantityChange, changeType, notes);
    
    const product = await Product.findById(req.params.id);
    
    if (product.current_quantity < product.min_quantity) {
      await sendRestockEmail(product);
    }
    
    res.json({ 
      message: 'Quantity updated successfully',
      product: product 
    });
  } catch (error) {
    next(error);
  }
};

const triggerAutoRestock = async (req, res, next) => {
  try {
    const lowStockProducts = await Product.getLowStockProducts();
    
    const results = [];
    for (const product of lowStockProducts) {
      const result = await sendRestockEmail(product);
      results.push({
        product_id: product.product_id,
        product_name: product.name,
        email_sent: result.success,
        message: result.message
      });
    }
    
    res.json({
      message: 'Auto-restock emails processed',
      results: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  updateProductQuantity,
  triggerAutoRestock
};