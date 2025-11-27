const Payment = require('../models/Payment');
const { validationResult } = require('express-validator');

const getAllPayments = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const payments = await Payment.findAll(filters);
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

const createPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payment = await Payment.create(req.body);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

const updatePayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payment = await Payment.update(req.params.id, req.body);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

const deletePayment = async (req, res, next) => {
  try {
    const result = await Payment.delete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getSalaries = async (req, res, next) => {
  try {
    const salaries = await Payment.getSalaries();
    res.json(salaries);
  } catch (error) {
    next(error);
  }
};

const createSalary = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const salary = await Payment.createSalary(req.body);
    res.status(201).json(salary);
  } catch (error) {
    next(error);
  }
};

const updateSalary = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const salary = await Payment.updateSalary(req.params.id, req.body);
    if (!salary) {
      return res.status(404).json({ message: 'Salary not found' });
    }
    res.json(salary);
  } catch (error) {
    next(error);
  }
};

const getFinancialSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const summary = await Payment.getFinancialSummary(startDate, endDate);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getSalaries,
  createSalary,
  updateSalary,
  getFinancialSummary
};