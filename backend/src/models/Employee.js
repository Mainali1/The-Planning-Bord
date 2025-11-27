const knex = require('../config/database');

class Employee {
  static async findAll() {
    return await knex('employees')
      .select('*')
      .orderBy('first_name');
  }

  static async findById(employeeId) {
    return await knex('employees')
      .where({ employee_id: employeeId })
      .first();
  }

  static async create(employeeData) {
    const [employee] = await knex('employees')
      .insert(employeeData)
      .returning('*');
    return employee;
  }

  static async update(employeeId, updateData) {
    const [employee] = await knex('employees')
      .where({ employee_id: employeeId })
      .update(updateData)
      .returning('*');
    return employee;
  }

  static async delete(employeeId) {
    return await knex('employees')
      .where({ employee_id: employeeId })
      .del();
  }

  static async getAttendance(employeeId, date = null) {
    let query = knex('attendance')
      .where({ employee_id: employeeId })
      .orderBy('date', 'desc');

    if (date) {
      query = query.where({ date: date });
    }

    return await query;
  }

  static async markAttendance(employeeId, status, reason = null) {
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await knex('attendance')
      .where({ employee_id: employeeId, date: today })
      .first();

    if (existing) {
      return await knex('attendance')
        .where({ attendance_id: existing.attendance_id })
        .update({
          status: status,
          reason: reason,
          timestamp: new Date()
        })
        .returning('*');
    } else {
      return await knex('attendance')
        .insert({
          employee_id: employeeId,
          date: today,
          status: status,
          reason: reason,
          timestamp: new Date()
        })
        .returning('*');
    }
  }

  static async getTasks(employeeId) {
    return await knex('employee_tasks')
      .where({ employee_id: employeeId })
      .orderBy('due_date', 'asc');
  }

  static async assignTask(taskData) {
    return await knex('employee_tasks')
      .insert({
        ...taskData,
        status: 'pending',
        assigned_timestamp: new Date()
      })
      .returning('*');
  }

  static async getTools(employeeId) {
    return await knex('employee_tools')
      .where({ employee_id: employeeId })
      .orderBy('assigned_date', 'desc');
  }

  static async assignTool(toolData) {
    return await knex('employee_tools')
      .insert(toolData)
      .returning('*');
  }

  static async getComplaints(employeeId = null) {
    let query = knex('complaints')
      .orderBy('date_submitted', 'desc');

    if (employeeId) {
      query = query.where({ employee_id: employeeId });
    }

    return await query;
  }

  static async submitComplaint(complaintData) {
    return await knex('complaints')
      .insert({
        ...complaintData,
        date_submitted: new Date()
      })
      .returning('*');
  }
}

module.exports = Employee;