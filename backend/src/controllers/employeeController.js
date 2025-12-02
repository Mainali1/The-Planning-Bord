const Employee = require('../models/Employee');
const { sendTaskNotification } = require('../services/emailService');
const { validationResult } = require('express-validator');

const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.findAll();
    res.json(employees);
  } catch (error) {
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    next(error);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const employee = await Employee.update(req.params.id, req.body);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const result = await Employee.delete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getEmployeeAttendance = async (req, res, next) => {
  try {
    const { date } = req.query;
    const attendance = await Employee.getAttendance(req.params.id, date);
    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, reason } = req.body;
    const attendance = await Employee.markAttendance(req.params.id, status, reason);
    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

const getEmployeeTasks = async (req, res, next) => {
  try {
    const tasks = await Employee.getTasks(req.params.id);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

const assignTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Employee.assignTask(req.body);
    
    // Send email notification to employee
    if (task.employee_id) {
      const employee = await Employee.findById(task.employee_id);
      if (employee && employee.email) {
        await sendTaskNotification(employee, task);
      }
    }
    
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

const getEmployeeTools = async (req, res, next) => {
  try {
    const tools = await Employee.getTools(req.params.id);
    res.json(tools);
  } catch (error) {
    next(error);
  }
};

const assignTool = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tool = await Employee.assignTool(req.body);
    res.status(201).json(tool);
  } catch (error) {
    next(error);
  }
};

const getComplaints = async (req, res, next) => {
  try {
    const { employee_id } = req.query;
    
    // Validate employee_id parameter
    if (!employee_id) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    
    if (!/^\d+$/.test(employee_id)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }
    
    const employeeId = parseInt(employee_id, 10);
    if (isNaN(employeeId) || employeeId <= 0) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }
    
    const complaints = await Employee.getComplaints(employeeId);
    res.json(complaints);
  } catch (error) {
    next(error);
  }
};

const submitComplaint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const complaint = await Employee.submitComplaint(req.body);
    res.status(201).json(complaint);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeAttendance,
  markAttendance,
  getEmployeeTasks,
  assignTask,
  getEmployeeTools,
  assignTool,
  getComplaints,
  submitComplaint
};