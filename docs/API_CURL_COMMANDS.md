# Planning Bord API Documentation

## Authentication

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "businessName": "My Business",
    "businessType": "retail"
  }'
```

### Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Logout User
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Dashboard

### Get Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Inventory Trends
```bash
curl -X GET http://localhost:5000/api/dashboard/inventory-trends \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Attendance Stats
```bash
curl -X GET http://localhost:5000/api/dashboard/attendance-stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Inventory Management

### Get All Products
```bash
curl -X GET http://localhost:5000/api/inventory/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Product by ID
```bash
curl -X GET http://localhost:5000/api/inventory/products/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Product
```bash
curl -X POST http://localhost:5000/api/inventory/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Office Chair",
    "description": "Ergonomic office chair",
    "sku": "CHAIR-001",
    "quantity": 50,
    "price": 299.99,
    "category": "furniture",
    "minStockLevel": 10,
    "supplier": "Office Supplies Inc"
  }'
```

### Update Product
```bash
curl -X PUT http://localhost:5000/api/inventory/products/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Office Chair Pro",
    "quantity": 45,
    "price": 349.99
  }'
```

### Delete Product
```bash
curl -X DELETE http://localhost:5000/api/inventory/products/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Low Stock Items
```bash
curl -X GET http://localhost:5000/api/inventory/low-stock \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Employee Management

### Get All Employees
```bash
curl -X GET http://localhost:5000/api/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Employee by ID
```bash
curl -X GET http://localhost:5000/api/employees/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Employee
```bash
curl -X POST http://localhost:5000/api/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com",
    "phone": "+1234567890",
    "position": "Sales Manager",
    "department": "Sales",
    "salary": 65000,
    "hireDate": "2023-01-15",
    "status": "active"
  }'
```

### Update Employee
```bash
curl -X PUT http://localhost:5000/api/employees/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Senior Sales Manager",
    "salary": 75000
  }'
```

### Delete Employee
```bash
curl -X DELETE http://localhost:5000/api/employees/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Attendance Tracking

### Get Attendance Records
```bash
curl -X GET http://localhost:5000/api/employees/1/attendance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Mark Attendance
```bash
curl -X POST http://localhost:5000/api/employees/1/attendance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15",
    "status": "present",
    "checkInTime": "09:00",
    "checkOutTime": "17:00"
  }'
```

## Payment Management

### Get All Payments
```bash
curl -X GET http://localhost:5000/api/payments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Payment by ID
```bash
curl -X GET http://localhost:5000/api/payments/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Payment
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500.00,
    "type": "expense",
    "category": "office_supplies",
    "description": "Office supplies purchase",
    "paymentDate": "2024-01-15",
    "paymentMethod": "credit_card",
    "status": "completed"
  }'
```

### Get Monthly Summary
```bash
curl -X GET "http://localhost:5000/api/payments/monthly-summary?month=1&year=2024" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Reports

### Generate Business Report
```bash
curl -X GET "http://localhost:5000/api/reports/business-summary?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Export Report
```bash
curl -X GET "http://localhost:5000/api/reports/export?type=pdf&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output report.pdf
```

## Microsoft 365 Integration

### Connect Microsoft 365
```bash
curl -X POST http://localhost:5000/api/microsoft365/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }'
```

### Sync Calendar
```bash
curl -X POST http://localhost:5000/api/microsoft365/sync-calendar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Teams Status
```bash
curl -X GET http://localhost:5000/api/microsoft365/teams-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Settings

### Get Business Settings
```bash
curl -X GET http://localhost:5000/api/settings/business \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Business Settings
```bash
curl -X PUT http://localhost:5000/api/settings/business \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Updated Business Name",
    "businessType": "service",
    "address": "123 Business St, City, State 12345",
    "phone": "+1234567890",
    "email": "contact@business.com"
  }'
```

### Get User Settings
```bash
curl -X GET http://localhost:5000/api/settings/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update User Settings
```bash
curl -X PUT http://localhost:5000/api/settings/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@email.com",
    "notifications": {
      "email": true,
      "sms": false
    }
  }'
```

## Admin

### Get Database Performance
```bash
curl -X GET http://localhost:5000/api/admin/database/performance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Slow Queries
```bash
curl -X GET http://localhost:5000/api/admin/database/slow-queries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Optimize Database
```bash
curl -X POST http://localhost:5000/api/admin/database/optimize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Variables

Make sure to set these environment variables in your `.env` file:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=planning_bord
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_jwt_secret_key

# Microsoft 365 (Optional)
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```