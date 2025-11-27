const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/employeeController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const employeeValidation = [
  body('first_name').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('last_name').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('role').trim().isLength({ min: 1 }).withMessage('Role is required'),
  body('department').trim().isLength({ min: 1 }).withMessage('Department is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('date_joined').isISO8601().withMessage('Valid date is required')
];

const attendanceValidation = [
  body('status').isIn(['present', 'absent', 'late']).withMessage('Status must be present, absent, or late'),
  body('reason').optional().trim()
];

const taskValidation = [
  body('employee_id').isInt({ min: 1 }).withMessage('Employee ID is required'),
  body('task_title').trim().isLength({ min: 1 }).withMessage('Task title is required'),
  body('task_description').trim().isLength({ min: 1 }).withMessage('Task description is required'),
  body('due_date').isISO8601().withMessage('Valid due date is required')
];

const toolValidation = [
  body('employee_id').isInt({ min: 1 }).withMessage('Employee ID is required'),
  body('tool_name').trim().isLength({ min: 1 }).withMessage('Tool name is required'),
  body('condition').trim().isLength({ min: 1 }).withMessage('Tool condition is required'),
  body('assigned_date').isISO8601().withMessage('Valid assigned date is required'),
  body('return_date').optional().isISO8601()
];

const complaintValidation = [
  body('employee_id').optional().isInt({ min: 1 }),
  body('complaint_text').trim().isLength({ min: 1 }).withMessage('Complaint text is required'),
  body('is_anonymous').isBoolean().withMessage('Anonymous flag must be boolean')
];

router.use(authenticateToken);

router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);
router.post('/', employeeValidation, createEmployee);
router.put('/:id', employeeValidation, updateEmployee);
router.delete('/:id', deleteEmployee);

router.get('/:id/attendance', getEmployeeAttendance);
router.post('/:id/attendance', attendanceValidation, markAttendance);

router.get('/:id/tasks', getEmployeeTasks);
router.post('/tasks', taskValidation, assignTask);

router.get('/:id/tools', getEmployeeTools);
router.post('/tools', toolValidation, assignTool);

router.get('/complaints/all', getComplaints);
router.post('/complaints', complaintValidation, submitComplaint);

module.exports = router;