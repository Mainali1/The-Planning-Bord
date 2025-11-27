const knex = require('../config/database');

class Payment {
  static async findAll(filters = {}) {
    let query = knex('payments')
      .leftJoin('employees', 'payments.employee_id', 'employees.employee_id')
      .leftJoin('suppliers', 'payments.supplier_id', 'suppliers.supplier_id')
      .select(
        'payments.*',
        'employees.first_name as employee_first_name',
        'employees.last_name as employee_last_name',
        'suppliers.name as supplier_name'
      )
      .orderBy('payments.date', 'desc');

    if (filters.type) {
      query = query.where('payments.type', filters.type);
    }

    if (filters.startDate && filters.endDate) {
      query = query.whereBetween('payments.date', [filters.startDate, filters.endDate]);
    }

    return await query;
  }

  static async findById(paymentId) {
    return await knex('payments')
      .leftJoin('employees', 'payments.employee_id', 'employees.employee_id')
      .leftJoin('suppliers', 'payments.supplier_id', 'suppliers.supplier_id')
      .where('payments.payment_id', paymentId)
      .select(
        'payments.*',
        'employees.first_name as employee_first_name',
        'employees.last_name as employee_last_name',
        'suppliers.name as supplier_name'
      )
      .first();
  }

  static async create(paymentData) {
    const [payment] = await knex('payments')
      .insert(paymentData)
      .returning('*');
    return payment;
  }

  static async update(paymentId, updateData) {
    const [payment] = await knex('payments')
      .where({ payment_id: paymentId })
      .update(updateData)
      .returning('*');
    return payment;
  }

  static async delete(paymentId) {
    return await knex('payments')
      .where({ payment_id: paymentId })
      .del();
  }

  static async getSalaries() {
    return await knex('salaries')
      .join('employees', 'salaries.employee_id', 'employees.employee_id')
      .select(
        'salaries.*',
        'employees.first_name',
        'employees.last_name',
        'employees.email'
      )
      .orderBy('employees.first_name');
  }

  static async createSalary(salaryData) {
    const [salary] = await knex('salaries')
      .insert(salaryData)
      .returning('*');
    return salary;
  }

  static async updateSalary(salaryId, updateData) {
    const [salary] = await knex('salaries')
      .where({ salary_id: salaryId })
      .update(updateData)
      .returning('*');
    return salary;
  }

  static async getFinancialSummary(startDate, endDate) {
    const payments = await knex('payments')
      .whereBetween('date', [startDate, endDate])
      .select('type', 'amount');

    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0),
      byType: {}
    };

    payments.forEach(payment => {
      if (!summary.byType[payment.type]) {
        summary.byType[payment.type] = {
          count: 0,
          total: 0
        };
      }
      summary.byType[payment.type].count++;
      summary.byType[payment.type].total += parseFloat(payment.amount);
    });

    return summary;
  }
}

module.exports = Payment;