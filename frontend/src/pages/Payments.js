import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Edit, Trash2, DollarSign, CreditCard, User, Calendar, TrendingUp } from 'lucide-react';
import { paymentService, employeeService } from '../services/api';

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedTab, setSelectedTab] = useState('payments');
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryFormData, setSalaryFormData] = useState({
    employee_id: '',
    amount: '',
    payment_cycle: 'monthly',
    last_paid_date: ''
  });
  const [salaryFormErrors, setSalaryFormErrors] = useState({});
  const [paymentFormData, setPaymentFormData] = useState({
    type: 'supplier',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery('payments', paymentService.getPayments);
  const { data: salaries, isLoading: salariesLoading } = useQuery('salaries', paymentService.getSalaries);
  const { data: employees } = useQuery('employees', employeeService.getEmployees);

  const deleteMutation = useMutation(
    (id) => paymentService.deletePayment(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payments');
      },
    }
  );

  const salaryMutation = useMutation(
    (salaryData) => paymentService.createSalary(salaryData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('salaries');
        setShowSalaryModal(false);
        setSalaryFormData({ employee_id: '', amount: '', payment_cycle: 'monthly', last_paid_date: '' });
        setSalaryFormErrors({});
      },
    }
  );

  const paymentMutation = useMutation(
    (paymentData) => paymentService.createPayment(paymentData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payments');
        setShowAddModal(false);
        setEditingPayment(null);
        setPaymentFormData({ type: 'supplier', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
        setPaymentFormErrors({});
      },
    }
  );

  const filteredPayments = payments?.data?.filter(payment =>
    payment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validateSalaryForm = () => {
    const errors = {};
    
    if (!salaryFormData.employee_id) {
      errors.employee_id = 'Please select an employee';
    }
    
    if (!salaryFormData.amount || parseFloat(salaryFormData.amount) <= 0) {
      errors.amount = 'Valid salary amount is required';
    }
    
    if (!salaryFormData.payment_cycle) {
      errors.payment_cycle = 'Payment cycle is required';
    }
    
    setSalaryFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSalaryInputChange = (e) => {
    const { name, value } = e.target;
    setSalaryFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (salaryFormErrors[name]) {
      setSalaryFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSalarySubmit = (e) => {
    e.preventDefault();
    if (validateSalaryForm()) {
      salaryMutation.mutate(salaryFormData);
    }
  };

  const getSalaryStats = () => {
    const salaryData = salaries?.data || [];
    const totalMonthly = salaryData
      .filter(s => s.payment_cycle === 'monthly')
      .reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const totalWeekly = salaryData
      .filter(s => s.payment_cycle === 'weekly')
      .reduce((sum, s) => sum + parseFloat(s.amount), 0);
    
    return {
      totalSalaries: salaryData.length,
      monthlyTotal: totalMonthly,
      weeklyTotal: totalWeekly,
      totalMonthlyEquivalent: totalMonthly + (totalWeekly * 4)
    };
  };

  const openSalaryModal = () => {
    setShowSalaryModal(true);
  };

  const closeSalaryModal = () => {
    setShowSalaryModal(false);
    setSalaryFormData({ employee_id: '', amount: '', payment_cycle: 'monthly', last_paid_date: '' });
    setSalaryFormErrors({});
  };

  const validatePaymentForm = () => {
    const errors = {};
    
    if (!paymentFormData.type) {
      errors.type = 'Payment type is required';
    }
    
    if (!paymentFormData.amount || parseFloat(paymentFormData.amount) <= 0) {
      errors.amount = 'Valid payment amount is required';
    }
    
    if (!paymentFormData.date) {
      errors.date = 'Payment date is required';
    }
    
    setPaymentFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (paymentFormErrors[name]) {
      setPaymentFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (validatePaymentForm()) {
      const paymentData = {
        ...paymentFormData,
        amount: parseFloat(paymentFormData.amount)
      };
      
      if (editingPayment) {
        // For editing, we would need an update mutation
        // For now, we'll just create a new payment
        paymentMutation.mutate(paymentData);
      } else {
        paymentMutation.mutate(paymentData);
      }
    }
  };

  const openPaymentModal = () => {
    setShowAddModal(true);
    setEditingPayment(null);
  };

  const closePaymentModal = () => {
    setShowAddModal(false);
    setEditingPayment(null);
    setPaymentFormData({ type: 'supplier', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setPaymentFormErrors({});
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        <button
          onClick={openPaymentModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Payment
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DollarSign className="inline h-4 w-4 mr-2" />
            Payments
          </button>
          <button
            onClick={() => setSelectedTab('salaries')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'salaries'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CreditCard className="inline h-4 w-4 mr-2" />
            Salaries
          </button>
        </nav>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Payments Tab */}
      {selectedTab === 'payments' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments?.map((payment) => (
                <tr key={payment.payment_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.type === 'supplier'
                        ? 'bg-blue-100 text-blue-800'
                        : payment.type === 'salary'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {payment.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(payment.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{payment.notes || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingPayment(payment)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.payment_id)}
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
          
          {filteredPayments?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No payments found
            </div>
          )}
        </div>
      )}

      {/* Salaries Tab */}
      {selectedTab === 'salaries' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Salary Management</h2>
            <button
              onClick={openSalaryModal}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Salary
            </button>
          </div>

          {/* Salary Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Salaries</p>
                  <p className="text-2xl font-semibold text-blue-600">{getSalaryStats().totalSalaries}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <User className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Total</p>
                  <p className="text-2xl font-semibold text-green-600">${getSalaryStats().monthlyTotal.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Weekly Total</p>
                  <p className="text-2xl font-semibold text-orange-600">${getSalaryStats().weeklyTotal.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Equivalent</p>
                  <p className="text-2xl font-semibold text-purple-600">${getSalaryStats().totalMonthlyEquivalent.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Salaries Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Cycle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Paid Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salariesLoading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      Loading salaries...
                    </td>
                  </tr>
                ) : salaries?.data?.length > 0 ? (
                  salaries.data.map((salary) => (
                    <tr key={salary.salary_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {salary.first_name} {salary.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{salary.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${parseFloat(salary.amount).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          salary.payment_cycle === 'monthly'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {salary.payment_cycle}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {salary.last_paid_date 
                            ? new Date(salary.last_paid_date).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center">
                      <div className="text-gray-500 mb-4">
                        <User className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p>No salaries configured yet</p>
                        <p className="text-sm">Click "Add Salary" to set up employee salaries</p>
                      </div>
                      <button
                        onClick={openSalaryModal}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Salary
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingPayment) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingPayment ? 'Edit Payment' : 'Add New Payment'}
            </h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type *
                </label>
                <select
                  name="type"
                  value={paymentFormData.type}
                  onChange={handlePaymentInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    paymentFormErrors.type ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="supplier">Supplier</option>
                  <option value="salary">Salary</option>
                  <option value="other">Other</option>
                </select>
                {paymentFormErrors.type && (
                  <p className="text-red-500 text-xs mt-1">{paymentFormErrors.type}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={paymentFormData.amount}
                  onChange={handlePaymentInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    paymentFormErrors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {paymentFormErrors.amount && (
                  <p className="text-red-500 text-xs mt-1">{paymentFormErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={paymentFormData.date}
                  onChange={handlePaymentInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    paymentFormErrors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {paymentFormErrors.date && (
                  <p className="text-red-500 text-xs mt-1">{paymentFormErrors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={paymentFormData.notes}
                  onChange={handlePaymentInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes about this payment..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentMutation.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {paymentMutation.isLoading ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Salary</h3>
            <form onSubmit={handleSalarySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
                <select
                  name="employee_id"
                  value={salaryFormData.employee_id}
                  onChange={handleSalaryInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    salaryFormErrors.employee_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select an employee</option>
                  {employees?.data?.map((employee) => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.first_name} {employee.last_name}
                    </option>
                  ))}
                </select>
                {salaryFormErrors.employee_id && (
                  <p className="text-red-500 text-xs mt-1">{salaryFormErrors.employee_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={salaryFormData.amount}
                  onChange={handleSalaryInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    salaryFormErrors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {salaryFormErrors.amount && (
                  <p className="text-red-500 text-xs mt-1">{salaryFormErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Cycle *
                </label>
                <select
                  name="payment_cycle"
                  value={salaryFormData.payment_cycle}
                  onChange={handleSalaryInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    salaryFormErrors.payment_cycle ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
                {salaryFormErrors.payment_cycle && (
                  <p className="text-red-500 text-xs mt-1">{salaryFormErrors.payment_cycle}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Paid Date (Optional)
                </label>
                <input
                  type="date"
                  name="last_paid_date"
                  value={salaryFormData.last_paid_date}
                  onChange={handleSalaryInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={closeSalaryModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={salaryMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {salaryMutation.isLoading ? 'Saving...' : 'Save Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;