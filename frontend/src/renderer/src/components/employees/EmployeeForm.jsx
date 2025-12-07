import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { User, Save, X, Mail, Phone, Calendar, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

const EmployeeForm = ({ onSuccess, mode = 'add' }) => {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    hire_date: '',
    salary: '',
    status: 'active',
    address: '',
    emergency_contact: '',
    emergency_phone: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && id) {
      fetchEmployee()
    }
  }, [id, mode])

  const fetchEmployee = async () => {
    try {
      setLoading(true)
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/employees/${id}`)
      if (response.ok) {
        const employee = await response.json()
        setFormData({
          name: employee.name || '',
          email: employee.email || '',
          phone: employee.phone || '',
          department: employee.department || '',
          position: employee.position || '',
          hire_date: employee.hire_date || '',
          salary: employee.salary || '',
          status: employee.status || 'active',
          address: employee.address || '',
          emergency_contact: employee.emergency_contact || '',
          emergency_phone: employee.emergency_phone || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch employee:', error)
      toast.error('Failed to load employee data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const url = mode === 'add' 
        ? `${backendUrl}/employees`
        : `${backendUrl}/employees/${id}`
      
      const method = mode === 'add' ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        toast.success(mode === 'add' ? 'Employee added successfully!' : 'Employee updated successfully!')
        if (onSuccess) {
          onSuccess()
        }
        navigate('/employees')
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to save employee')
      }
    } catch (error) {
      console.error('Failed to save employee:', error)
      toast.error('Failed to save employee')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {mode === 'add' ? 'Add New Employee' : 'Edit Employee'}
        </h1>
        <button
          onClick={() => navigate('/employees')}
          className="btn-secondary flex items-center"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter employee name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="input-field pl-10"
                  placeholder="employee@company.com"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="input-field pl-10"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="select-field"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          {/* Employment Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Employment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="e.g., Sales, Marketing, IT"
                />
              </div>
              
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                  Position *
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="e.g., Manager, Coordinator, Developer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Hire Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    id="hire_date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleInputChange}
                    required
                    className="input-field pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Salary ($) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    id="salary"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="1000"
                    className="input-field pl-10"
                    placeholder="50000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="textarea-field"
                placeholder="Enter employee address"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  id="emergency_contact"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter emergency contact name"
                />
              </div>
              
              <div>
                <label htmlFor="emergency_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  id="emergency_phone"
                  name="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'add' ? 'Add Employee' : 'Update Employee'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeForm