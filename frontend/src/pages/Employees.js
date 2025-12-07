import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Plus, Search, Edit, Trash2, User, Calendar, Briefcase, 
  AlertTriangle, Info, RefreshCw, Users, TrendingUp, Clock, 
  CheckCircle, XCircle, ArrowRight, UserCheck, Building 
} from 'lucide-react';
import { employeeService } from '../services/api';

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedTab, setSelectedTab] = useState('employees');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    department: '',
    phone: '',
    hire_date: '',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState({});
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assignee_id: '',
    priority: 'medium',
    due_date: '',
    status: 'pending'
  });
  const [taskFormErrors, setTaskFormErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: employees, isLoading, error, refetch } = useQuery('employees', employeeService.getEmployees, {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendanceData } = useQuery(
    ['attendance', attendanceDate],
    () => employeeService.getAttendance('all'),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000,
      enabled: selectedTab === 'attendance',
    }
  );

  const deleteMutation = useMutation(
    (id) => employeeService.deleteEmployee(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('employees');
      },
    }
  );

  const attendanceMutation = useMutation(
    ({ employeeId, status }) => employeeService.markAttendance(employeeId, { date: attendanceDate, status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['attendance', attendanceDate]);
      },
    }
  );

  const { data: tasksData } = useQuery(
    'tasks',
    () => employeeService.getTasks(),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      enabled: selectedTab === 'tasks',
    }
  );

  const taskMutation = useMutation(
    (taskData) => employeeService.assignTask(taskData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        setShowTaskModal(false);
        setTaskFormData({
          title: '',
          description: '',
          assignee_id: '',
          priority: 'medium',
          due_date: '',
          status: 'pending'
        });
        setTaskFormErrors({});
      },
    }
  );

  const filteredEmployees = employees?.data?.filter(employee =>
    employee.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleMarkAttendance = async (employeeId, status) => {
    try {
      await attendanceMutation.mutateAsync({ employeeId, status });
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const getAttendanceStatus = (employeeId) => {
    const attendance = attendanceData?.data?.find(a => a.employee_id === employeeId);
    return attendance?.status || 'not_marked';
  };

  const getAttendanceStats = () => {
    if (!attendanceData?.data || !employees?.data) return { present: 0, absent: 0, late: 0, notMarked: 0 };
    
    const stats = { present: 0, absent: 0, late: 0, notMarked: 0 };
    
    employees.data.forEach(employee => {
      const status = getAttendanceStatus(employee.employee_id || employee.id);
      switch (status) {
        case 'present':
          stats.present++;
          break;
        case 'absent':
          stats.absent++;
          break;
        case 'late':
          stats.late++;
          break;
        default:
          stats.notMarked++;
      }
    });
    
    return stats;
  };

  const validateTaskForm = () => {
    const errors = {};
    
    if (!taskFormData.title.trim()) {
      errors.title = 'Task title is required';
    }
    
    if (!taskFormData.assignee_id) {
      errors.assignee_id = 'Please select an employee';
    }
    
    if (!taskFormData.due_date) {
      errors.due_date = 'Due date is required';
    }
    
    setTaskFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (taskFormErrors[name]) {
      setTaskFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateTaskForm()) {
      return;
    }
    
    try {
      await taskMutation.mutateAsync(taskFormData);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const openTaskModal = () => {
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setTaskFormData({
      title: '',
      description: '',
      assignee_id: '',
      priority: 'medium',
      due_date: '',
      status: 'pending'
    });
    setTaskFormErrors({});
  };

  const getTaskStats = () => {
    if (!tasksData?.data) return { total: 0, completed: 0, inProgress: 0, pending: 0 };
    
    const stats = {
      total: tasksData.data.length,
      completed: tasksData.data.filter(t => t.status === 'completed').length,
      inProgress: tasksData.data.filter(t => t.status === 'in_progress').length,
      pending: tasksData.data.filter(t => t.status === 'pending').length
    };
    
    return stats;
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.role.trim()) {
      errors.role = 'Role is required';
    }
    
    if (!formData.department.trim()) {
      errors.department = 'Department is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee.employee_id || editingEmployee.id, formData);
      } else {
        await employeeService.createEmployee(formData);
      }
      
      queryClient.invalidateQueries('employees');
      setShowAddModal(false);
      setEditingEmployee(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        role: '',
        department: '',
        phone: '',
        hire_date: '',
        status: 'active'
      });
      setFormErrors({});
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee. Please try again.');
    }
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      role: employee.role || '',
      department: employee.department || '',
      phone: employee.phone || '',
      hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
      status: employee.status || 'active'
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      role: '',
      department: '',
      phone: '',
      hire_date: '',
      status: 'active'
    });
    setFormErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your team...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Employees</h3>
          <p className="text-gray-600 mb-4">
            We're having trouble loading your employee data. This might be due to missing credentials or connection issues.
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Employee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-semibold text-gray-900">{employees?.data?.length || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Employees</p>
              <p className="text-2xl font-semibold text-gray-900">
                {employees?.data?.filter(emp => emp.status === 'active').length || 0}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(employees?.data?.map(emp => emp.department).filter(Boolean)).size || 0}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Building className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Manage your team and track attendance</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Refresh employee data"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('employees')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'employees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="inline h-4 w-4 mr-2" />
              Employees
            </button>
            <button
              onClick={() => setSelectedTab('attendance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'attendance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="inline h-4 w-4 mr-2" />
              Attendance
            </button>
            <button
              onClick={() => setSelectedTab('tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="inline h-4 w-4 mr-2" />
              Tasks
            </button>
          </nav>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees by name, role, or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-500">
            <Info className="inline h-4 w-4 mr-1" />
            Tip: Search by name, role, or department to find team members quickly
          </div>
        </div>

        {/* Employees Tab */}
        {selectedTab === 'employees' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees?.map((employee) => (
                  <tr key={employee.employee_id || employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(employee)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.employee_id || employee.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredEmployees?.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No employees found' : 'No employees in your team'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms or check for typos.'
                    : 'Get started by adding your first team member.'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Employee
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {selectedTab === 'attendance' && (
          <div className="space-y-6">
            {/* Attendance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Present Today</p>
                    <p className="text-2xl font-semibold text-green-600">{getAttendanceStats().present}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Absent Today</p>
                    <p className="text-2xl font-semibold text-red-600">{getAttendanceStats().absent}</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100 text-red-600">
                    <XCircle className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Late Today</p>
                    <p className="text-2xl font-semibold text-yellow-600">{getAttendanceStats().late}</p>
                  </div>
                  <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Not Marked</p>
                    <p className="text-2xl font-semibold text-gray-600">{getAttendanceStats().notMarked}</p>
                  </div>
                  <div className="p-3 rounded-full bg-gray-100 text-gray-600">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Date Selection and Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Daily Attendance</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="attendance-date" className="text-sm font-medium text-gray-700">
                      Date:
                    </label>
                    <input
                      type="date"
                      id="attendance-date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => queryClient.invalidateQueries(['attendance', attendanceDate])}
                    className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={attendanceMutation.isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${attendanceMutation.isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Attendance Table */}
              {isLoading ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-500">Loading attendance data...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-2">Unable to load attendance data</p>
                  <p className="text-sm text-gray-500 mb-4">Please check your connection and try again</p>
                  <button
                    onClick={() => queryClient.invalidateQueries(['attendance', attendanceDate])}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                </div>
              ) : !employees?.data || employees.data.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
                  <p className="text-gray-600 mb-4">Add employees to start tracking attendance</p>
                  <button
                    onClick={() => {
                      setSelectedTab('employees');
                      setShowAddModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Employee
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.data.map((employee) => {
                        const employeeId = employee.employee_id || employee.id;
                        const status = getAttendanceStatus(employeeId);
                        return (
                          <tr key={employeeId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="h-5 w-5 text-blue-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {employee.first_name} {employee.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {employee.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{employee.department}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                status === 'present' ? 'bg-green-100 text-green-800' :
                                status === 'absent' ? 'bg-red-100 text-red-800' :
                                status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {status === 'present' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {status === 'absent' && <XCircle className="h-3 w-3 mr-1" />}
                                {status === 'late' && <Clock className="h-3 w-3 mr-1" />}
                                {status === 'not_marked' && <Info className="h-3 w-3 mr-1" />}
                                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleMarkAttendance(employeeId, 'present')}
                                  disabled={attendanceMutation.isLoading || status === 'present'}
                                  className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${
                                    status === 'present'
                                      ? 'bg-green-100 text-green-800 cursor-default'
                                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                                  } transition-colors`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Present
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(employeeId, 'absent')}
                                  disabled={attendanceMutation.isLoading || status === 'absent'}
                                  className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${
                                    status === 'absent'
                                      ? 'bg-red-100 text-red-800 cursor-default'
                                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                                  } transition-colors`}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Absent
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(employeeId, 'late')}
                                  disabled={attendanceMutation.isLoading || status === 'late'}
                                  className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${
                                    status === 'late'
                                      ? 'bg-yellow-100 text-yellow-800 cursor-default'
                                      : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                  } transition-colors`}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Late
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {selectedTab === 'tasks' && (
          <div className="space-y-6">
            {/* Task Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-semibold text-gray-900">{getTaskStats().total}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <Briefcase className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-semibold text-yellow-600">{getTaskStats().pending}</p>
                  </div>
                  <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Progress</p>
                    <p className="text-2xl font-semibold text-blue-600">{getTaskStats().inProgress}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-semibold text-green-600">{getTaskStats().completed}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Task Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Task List</h2>
                <button
                  onClick={openTaskModal}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Assign New Task
                </button>
              </div>

              {/* Task List */}
              {tasksData?.isLoading || isLoading ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-500">Loading tasks...</p>
                </div>
              ) : tasksData?.error || error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-2">Unable to load tasks</p>
                  <p className="text-sm text-gray-500 mb-4">Please check your connection and try again</p>
                  <button
                    onClick={() => queryClient.invalidateQueries('tasks')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                </div>
              ) : !tasksData?.data || tasksData.data.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks assigned</h3>
                  <p className="text-gray-600 mb-4">Start by assigning your first task to a team member</p>
                  <button
                    onClick={openTaskModal}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Assign First Task
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasksData.data.map((task) => {
                    const assignee = employees?.data?.find(emp => (emp.id === task.assignee_id) || (emp.employee_id === task.assignee_id));
                    const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed';
                    
                    return (
                      <div key={task.id} className={`border rounded-lg p-4 ${
                        isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.status === 'in_progress' ? 'In Progress' : 
                                 task.status === 'completed' ? 'Completed' : 'Pending'}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-gray-600 mb-3">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>{assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unassigned'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              </div>
                              {isOverdue && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>Overdue</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {(showAddModal || editingEmployee) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.first_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter first name"
                    />
                    {formErrors.first_name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.last_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter last name"
                    />
                    {formErrors.last_name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="employee@company.com"
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.role ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Sales Manager"
                    />
                    {formErrors.role && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.role}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.department ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a department</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Engineering">Engineering</option>
                      <option value="HR">Human Resources</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                      <option value="Other">Other</option>
                    </select>
                    {formErrors.department && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.department}</p>
                    )}
                  </div>

                  {/* Hire Date */}
                  <div>
                    <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Hire Date
                    </label>
                    <input
                      type="date"
                      id="hire_date"
                      name="hire_date"
                      value={formData.hire_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingEmployee ? 'Update Employee' : 'Add Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Task Assignment Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Assign New Task</h3>
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                {/* Task Title */}
                <div>
                  <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="task-title"
                    name="title"
                    value={taskFormData.title}
                    onChange={handleTaskInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      taskFormErrors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter task title"
                  />
                  {taskFormErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{taskFormErrors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="task-description"
                    name="description"
                    value={taskFormData.description}
                    onChange={handleTaskInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task description (optional)"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Assignee */}
                  <div>
                    <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="task-assignee"
                      name="assignee_id"
                      value={taskFormData.assignee_id}
                      onChange={handleTaskInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        taskFormErrors.assignee_id ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select an employee</option>
                      {employees?.data?.map((employee) => (
                        <option key={employee.employee_id || employee.id} value={employee.employee_id || employee.id}>
                          {employee.first_name} {employee.last_name} - {employee.role}
                        </option>
                      ))}
                    </select>
                    {taskFormErrors.assignee_id && (
                      <p className="mt-1 text-sm text-red-600">{taskFormErrors.assignee_id}</p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      id="task-priority"
                      name="priority"
                      value={taskFormData.priority}
                      onChange={handleTaskInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="task-due-date"
                    name="due_date"
                    value={taskFormData.due_date}
                    onChange={handleTaskInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      taskFormErrors.due_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {taskFormErrors.due_date && (
                    <p className="mt-1 text-sm text-red-600">{taskFormErrors.due_date}</p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeTaskModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={taskMutation.isLoading}
                  >
                    {taskMutation.isLoading ? 'Assigning...' : 'Assign Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Employees;