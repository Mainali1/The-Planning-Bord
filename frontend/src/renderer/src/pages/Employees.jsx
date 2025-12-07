import React, { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, User, Mail, Phone, Calendar } from 'lucide-react'
import EmployeeList from '../components/employees/EmployeeList'
import EmployeeForm from '../components/employees/EmployeeForm'

const Employees = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/employees`)
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      // Mock data for demo
      setEmployees([
        {
          id: 1,
          name: 'John Smith',
          email: 'john.smith@company.com',
          phone: '(555) 123-4567',
          department: 'Sales',
          position: 'Sales Manager',
          hire_date: '2023-01-15',
          salary: 65000,
          status: 'active'
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          email: 'sarah.johnson@company.com',
          phone: '(555) 987-6543',
          department: 'Marketing',
          position: 'Marketing Coordinator',
          hire_date: '2023-03-20',
          salary: 52000,
          status: 'active'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
        
        const response = await fetch(`${backendUrl}/employees/${id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          fetchEmployees() // Refresh the list
        }
      } catch (error) {
        console.error('Failed to delete employee:', error)
      }
    }
  }

  const filteredEmployees = employees.filter(employee => {
    return employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <Routes>
        <Route path="/" element={
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
              <Link
                to="/employees/add"
                className="btn-primary flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Link>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Employees Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Employees</h2>
              </div>
              <EmployeeList 
                employees={filteredEmployees}
                onDelete={handleDeleteEmployee}
                loading={loading}
              />
            </div>
          </div>
        } />
        
        <Route path="/add" element={
          <EmployeeForm 
            onSuccess={fetchEmployees}
            mode="add"
          />
        } />
        
        <Route path="/edit/:id" element={
          <EmployeeForm 
            onSuccess={fetchEmployees}
            mode="edit"
          />
        } />
      </Routes>
    </div>
  )
}

export default Employees