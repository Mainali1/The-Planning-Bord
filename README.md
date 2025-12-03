# The Planning Bord

[![License: Commercial](https://img.shields.io/badge/License-Commercial-red.svg)](EULA.md)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![Dependencies](https://img.shields.io/badge/dependencies-updated-green.svg)](.github/dependabot.yml)
[![Security](https://img.shields.io/badge/security-scanned-green.svg)](.github/workflows/codeql.yml)
[![Accessibility](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-blue.svg)](frontend/accessibility.config.yml)

A comprehensive business management system that integrates inventory tracking, employee management, payment processing, and Microsoft 365 integration.

## Features

### 🏪 Inventory Management
- Product catalog with categories and suppliers
- Real-time stock level tracking
- Automatic low-stock alerts and email notifications
- Inventory logs and history
- Supplier management

### 👥 Employee Management
- Employee profiles and roles
- Attendance tracking system
- Task assignment and management
- Tool/equipment assignment
- Complaint management system

### 💰 Payment & Finance
- Payment tracking (supplier, salary, other)
- Salary management with payment cycles
- Financial reporting and summaries
- Monthly/yearly expense tracking

### 📊 Dashboard & Analytics
- Real-time business metrics
- Inventory trends visualization
- Attendance statistics
- Payment distribution charts
- Customizable reports

### 🔐 Security & Authentication
- JWT-based authentication
- Role-based access control
- Secure password policies
- Session management
- **Security Scanning**: CodeQL analysis and secret scanning
- **Dependency Updates**: Automated Dependabot alerts

### ♿ Accessibility & Quality
- **WCAG 2.1 AA Compliance**: Full accessibility support
- **Responsive Design**: Mobile-first, tablet-friendly interface
- **Screen Reader Support**: ARIA labels, semantic HTML
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: High contrast ratios for readability

### 📧 Communication & Integration
- **Automated Email Notifications**: Welcome emails, password resets, low-stock alerts
- **Background Job Processing**: Redis queue system for reliable email delivery
- **Queue Monitoring**: Bull Board dashboard for job monitoring and management
- **Auto-restock Alerts**: Automated notifications for low inventory
- **Task Assignment Notifications**: Email alerts for new task assignments
- **Microsoft 365 Integration**:
  - Outlook email sending
  - Calendar event creation
  - OneDrive file uploads
  - SharePoint list management
  - Teams messaging
  - Business data synchronization

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **Knex.js** query builder
- **JWT** authentication
- **Nodemailer** for email notifications
- **Bull + Redis** for background job processing
- **Cron** jobs for automated tasks
- **Microsoft Graph API** for 365 integration

### Frontend
- **React** with functional components
- **TailwindCSS** for styling
- **React Query** for data fetching
- **React Router** for navigation
- **Recharts** for data visualization

## Quick Start

### Demo Data
We provide demo data for easy testing. Run the seed script to populate your database:

```bash
# Make the script executable
chmod +x scripts/seed_demo_data.sh

# Run the seed script
./scripts/seed_demo_data.sh

# Apply the demo data to your database
psql -d planning_bord -f seed_data.sql
```

**Demo Credentials:**
- Admin: `admin@demo.com` / `password`
- Demo: `demo@demo.com` / `password`

### API Documentation
- **Postman Collection**: [docs/API_POSTMAN_COLLECTION.json](docs/API_POSTMAN_COLLECTION.json)
- **Curl Commands**: [docs/API_CURL_COMMANDS.md](docs/API_CURL_COMMANDS.md)
- **Database Schema**: [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)

## Desktop Application (Standalone)

The Planning Bord is now available as a standalone desktop application that runs locally without requiring a browser.

### Quick Setup
```powershell
# 1. Run the setup script
.\setup-desktop.ps1

# 2. Start the desktop application
.\start-desktop.ps1

# 3. Build standalone installer (optional)
.\build-desktop.ps1
```

### Desktop Features
- **Standalone Application**: Runs locally without browser dependency
- **Integrated Backend**: Node.js backend starts automatically
- **Web API Support**: Full access to external APIs and integrations
- **Auto-updater**: Built-in update mechanism
- **Native Installer**: Professional Windows installer with shortcuts
- **File Protocol Support**: Uses file:// protocol for enhanced security

### Desktop Requirements
- Windows 10/11
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

For detailed desktop setup instructions, see [DESKTOP_SETUP.md](DESKTOP_SETUP.md).

## Installation (Web Version)

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd the-planning-bord
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Database Setup
Create a PostgreSQL database and update the connection settings:

```bash
# Copy environment variables
cp .env.example .env

# Edit .env file with your database credentials
```

### 4. Run Database Migrations
```bash
npm run migrate
```

### 5. Frontend Setup
```bash
cd ../frontend
npm install
```

### 6. Start Redis (for background jobs)
```bash
# Option 1: Using Docker (recommended)
cd backend
npm run redis:up

# Option 2: Local Redis installation
redis-server ../redis.conf
```

### 7. Start Workers (for background jobs)
```bash
# Start all workers with PM2
npm run workers:start

# Or start individual workers
npm run worker:email &
npm run worker:inventory &
npm run worker:report &
npm run worker:file &
```

### 8. Start the Application

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm start
```

### 9. Access Queue Monitoring
Visit `http://localhost:5000/admin/queues` to monitor background job processing.

## Directory Structure

```
the-planning-bord/
├── backend/                    # Node.js backend API
│   ├── src/
│   │   ├── config/            # Database & queue configuration
│   │   ├── controllers/       # Business logic controllers
│   │   ├── middleware/        # Authentication & error handling
│   │   ├── models/           # Database models
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business services (email, Microsoft)
│   │   ├── utils/            # Utility functions
│   │   ├── workers/          # Background job workers
│   │   └── server.js         # Main server file
│   ├── tests/                # Test files
│   └── package.json          # Backend dependencies
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── config/           # Frontend configuration
│   │   ├── context/          # React context providers
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service calls
│   │   ├── utils/            # Frontend utilities
│   │   └── App.js            # Main React component
│   └── package.json          # Frontend dependencies
├── electron/                 # Desktop application wrapper
│   ├── main.js              # Electron main process
│   ├── preload.js           # Security bridge
│   └── package.json         # Electron dependencies
├── build/                    # Build configuration files
│   ├── docker-compose.yml     # Docker stack configuration
│   ├── docker-compose.redis.yml # Redis-only Docker
│   ├── redis.conf           # Redis server configuration
│   ├── ecosystem.config.js  # PM2 process manager config
│   └── *.config.js          # Various configuration files
├── scripts/                  # Utility scripts
├── docs/                     # Documentation
└── *.ps1                    # PowerShell setup/build scripts
```

## Environment Variables

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=planning_bord
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Redis Queue System
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
QUEUE_PREFIX=planning-bord

# Microsoft 365 Integration
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=your_microsoft_tenant_id
MICROSOFT_USER_ID=your_microsoft_user_id
SHAREPOINT_SITE_ID=your_sharepoint_site_id
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## API Documentation

### Authentication

#### Login
- **POST** `/api/auth/login`
- **Body**: `{ "email": "user@example.com", "password": "password123" }`
- **Response**: `{ "token": "jwt_token", "user": { "id": 1, "email": "user@example.com" } }`

#### Register
- **POST** `/api/auth/register`
- **Body**: `{ "email": "user@example.com", "password": "password123", "first_name": "John", "last_name": "Doe" }`
- **Response**: `{ "message": "User created successfully" }`

### Inventory Management

#### Get All Products
- **GET** `/api/inventory/products`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `?search=product_name&category_id=1`
- **Response**: Array of products with categories and suppliers

#### Create Product
- **POST** `/api/inventory/products`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "name": "Product A", "description": "Description", "category_id": 1, "supplier_id": 1, "current_quantity": 100, "min_quantity": 20, "unit_price": 25.50 }`

#### Update Product
- **PUT** `/api/inventory/products/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Same as create product

#### Delete Product
- **DELETE** `/api/inventory/products/:id`
- **Headers**: `Authorization: Bearer <token>`

#### Get Low Stock Products
- **GET** `/api/inventory/low-stock`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of products with current quantity below minimum

#### Update Inventory
- **POST** `/api/inventory/update`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "product_id": 1, "quantity_change": -5, "reason": "Sale", "notes": "Customer purchase" }`

### Employee Management

#### Get All Employees
- **GET** `/api/employees`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of employees with roles and departments

#### Create Employee
- **POST** `/api/employees`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "first_name": "John", "last_name": "Doe", "email": "john@example.com", "role": "Manager", "department": "Sales", "date_joined": "2024-01-15" }`

#### Get Employee Attendance
- **GET** `/api/employees/:id/attendance`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `?date=2024-01-15`

#### Mark Attendance
- **POST** `/api/employees/:id/attendance`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "status": "present", "reason": "Working from office" }`

#### Assign Task
- **POST** `/api/employees/tasks`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "employee_id": 1, "task_title": "Complete inventory", "task_description": "Count all products", "due_date": "2024-01-20" }`

### Payment Management

#### Get All Payments
- **GET** `/api/payments`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `?type=supplier&start_date=2024-01-01&end_date=2024-01-31`

#### Create Payment
- **POST** `/api/payments`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "type": "supplier", "amount": 1500.00, "date": "2024-01-15", "notes": "Payment for January supplies" }`

#### Get Financial Summary
- **GET** `/api/payments/summary`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `?start_date=2024-01-01&end_date=2024-01-31`

### Microsoft 365 Integration

#### Send Outlook Email
- **POST** `/api/microsoft/send-email`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "to": "recipient@example.com", "subject": "Test Email", "body": "<h1>Hello</h1>", "importance": "normal" }`

#### Create Calendar Event
- **POST** `/api/microsoft/create-calendar-event`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "subject": "Meeting", "start": "2024-01-15T10:00:00Z", "end": "2024-01-15T11:00:00Z", "attendees": ["attendee@example.com"], "body": "Meeting description" }`

#### Upload File to OneDrive
- **POST** `/api/microsoft/upload-file`
- **Headers**: `Authorization: Bearer <token>`
- **Form Data**: File upload with optional `folderPath`

#### Get OneDrive Files
- **GET** `/api/microsoft/files`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `?folderPath=/BusinessApp`

#### Create SharePoint List Item
- **POST** `/api/microsoft/create-sharepoint-item`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "listName": "Inventory", "itemData": { "Title": "Product A", "Quantity": 100 } }`

#### Send Teams Message
- **POST** `/api/microsoft/send-teams-message`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "teamId": "team_id", "channelId": "channel_id", "messageContent": "Hello from Planning Bord!" }`

#### Sync Inventory to SharePoint
- **POST** `/api/microsoft/sync-inventory`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "inventoryItems": [{ "name": "Product A", "quantity": 100, "price": 25.50, "category": "Electronics", "low_stock_threshold": 20, "supplier": "Supplier A" }] }`

#### Sync Employees to SharePoint
- **POST** `/api/microsoft/sync-employees`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "employees": [{ "first_name": "John", "last_name": "Doe", "email": "john@example.com", "position": "Manager", "department": "Sales", "salary": 50000, "hire_date": "2024-01-15" }] }`

#### Get Microsoft 365 Status
- **GET** `/api/microsoft/status`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ "connected": true, "features": ["outlook-email", "calendar-events", "onedrive-storage", "sharepoint-lists", "teams-messaging", "business-sync"] }`

### Dashboard Analytics

#### Get Dashboard Stats
- **GET** `/api/dashboard/stats`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ "totalProducts": 150, "lowStockItems": 12, "activeEmployees": 25, "monthlyPayments": 45000 }`

#### Get Inventory Trends
- **GET** `/api/dashboard/inventory-trends`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of monthly inventory changes

#### Get Attendance Stats
- **GET** `/api/dashboard/attendance-stats`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Attendance distribution for current month

## Database Schema

### Core Tables
- **users**: User authentication and profiles
- **products**: Product catalog with inventory tracking
- **categories**: Product categories
- **suppliers**: Supplier information
- **inventory_logs**: Inventory change history
- **employees**: Employee profiles and roles
- **attendance**: Daily attendance records
- **tasks**: Employee task assignments
- **payments**: Payment records and transactions
- **tools**: Equipment and tool management
- **complaints**: Employee complaint system

## Automated Features

### Cron Jobs
- **Daily Inventory Check**: Runs at 9:00 AM daily
- **Weekly Salary Reminder**: Runs every Monday at 8:00 AM
- **Monthly Salary Check**: Runs on the 1st of each month at 9:00 AM

### Email Notifications
- Low stock alerts
- Task assignment notifications
- Salary payment reminders

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Helmet.js security headers
- Input validation with express-validator

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Database Migrations
```bash
# Create new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback
```

## Deployment

### Production Build
```bash
# Frontend build
cd frontend
npm run build

# Backend (already production ready)
cd backend
npm start
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Redis Queue System

The Planning Bord uses **Bull** (Redis-based queue) for background job processing, providing reliable and scalable task execution.

### Features
- **Background Email Processing**: Welcome emails, password resets, low-stock alerts
- **Inventory Synchronization**: External system sync, bulk updates, stock checks
- **Report Generation**: Automated business reports with PDF/CSV export
- **File Processing**: CSV imports/exports with validation and error handling
- **Queue Monitoring**: Bull Board dashboard for job inspection and management

### Queue Types
- **Email Queue**: High-priority email notifications
- **Inventory Queue**: Inventory sync and bulk operations
- **Report Queue**: Business report generation
- **File Queue**: Import/export file processing

### Monitoring
Access the Bull Board monitoring dashboard at: `http://localhost:5000/admin/queues`

### Management Commands
```bash
# Start Redis (Docker)
npm run redis:up

# Start all workers
npm run workers:start

# Check worker status
pm2 status

# View worker logs
pm2 logs

# Stop workers
npm run workers:stop
```

For detailed implementation guide, see [REDIS_QUEUE_IMPLEMENTATION.md](REDIS_QUEUE_IMPLEMENTATION.md).

## Microsoft 365 Integration Setup

### 1. Azure App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Set redirect URI to: `http://localhost:5000/auth/microsoft/callback`
5. Note down the Application (client) ID and Directory (tenant) ID

### 2. API Permissions
Add the following Microsoft Graph permissions:
- `Mail.Send` (Application)
- `Calendars.ReadWrite` (Application)
- `Files.ReadWrite.All` (Application)
- `Sites.ReadWrite.All` (Application)
- `Team.ReadBasic.All` (Application)
- `ChannelMessage.Send` (Application)

### 3. Client Secret
1. Go to "Certificates & secrets"
2. Create a new client secret
3. Note down the secret value

### 4. Environment Configuration
Update your `.env` file with the Microsoft 365 credentials:
```env
MICROSOFT_CLIENT_ID=your_application_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_directory_tenant_id
MICROSOFT_USER_ID=your_user_object_id
SHAREPOINT_SITE_ID=your_sharepoint_site_id
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## License

**COMMERCIAL SOFTWARE LICENSE**

This software is proprietary and confidential. All rights reserved.

- **License Type**: Commercial End User License Agreement (EULA)
- **Usage**: Requires valid license key and payment
- **Distribution**: Strictly prohibited without written consent
- **Modification**: Not permitted without explicit authorization

**NOTICE**: This is commercial software. Unauthorized use, copying, or distribution is strictly prohibited and may result in legal action.

For licensing inquiries, please contact: **licensing@planningbord.com**

See [EULA.md](EULA.md) for complete license terms and conditions.

## Support

For support and questions, please contact: admin@planningbord.com

## Roadmap

### Phase 1 (Completed)
- ✅ Basic inventory management
- ✅ Employee management system
- ✅ Payment tracking
- ✅ Dashboard analytics
- ✅ Authentication system
- ✅ Microsoft 365 integration
- ✅ **Redis Queue System**: Background job processing for emails, inventory sync, reports
- ✅ **Bull Board Monitoring**: Web-based queue monitoring dashboard
- ✅ **WCAG 2.1 AA Accessibility**: Full accessibility compliance
- ✅ **Responsive Design**: Mobile-first, tablet-friendly interface

### Phase 2 (In Progress)
- 🔄 Advanced reporting with PDF generation
- 🔄 Multi-language support
- 🔄 Advanced analytics and insights

### Phase 3 (Planned)
- 📋 Multi-tenant support
- 📋 Mobile app development
- 📋 AI-powered business insights
- 📋 Advanced Microsoft 365 features

---

## Security & Privacy

### 🔒 Security Features
- **JWT Authentication**: Secure token-based authentication with automatic expiration
- **Role-Based Access Control**: Granular permissions system with admin/user roles
- **Data Encryption**: Sensitive data encrypted at rest and in transit
- **Input Validation**: Comprehensive input sanitization and validation
- **Rate Limiting**: API protection against abuse and DDoS attacks
- **Security Headers**: Helmet.js protection against common web vulnerabilities
- **SQL Injection Prevention**: Parameterized queries and ORM protection
- **XSS Protection**: Content Security Policy and input sanitization
- **CORS Protection**: Strict origin policies for cross-origin requests

### 🛡️ Privacy Protection
- **Data Minimization**: Only essential business data is collected
- **PII Handling**: Personal information is encrypted and access-controlled
- **Audit Logging**: All data access and modifications are logged
- **Data Retention**: Configurable retention policies for compliance
- **Right to Deletion**: User data can be permanently deleted upon request
- **Data Portability**: Export functionality for user data
- **Consent Management**: Clear consent for data processing activities

### 🔐 Encryption Standards
- **Transport Layer**: TLS 1.3 for all communications
- **Database Encryption**: AES-256 encryption for sensitive fields
- **Password Security**: bcrypt hashing with salt rounds
- **JWT Tokens**: RS256 algorithm with secure key management
- **Backup Encryption**: Encrypted backups with separate key storage

### 📋 Compliance
- **GDPR Compliance**: European data protection regulations
- **CCPA Compliance**: California Consumer Privacy Act
- **SOC 2 Type II**: Security and availability controls
- **ISO 27001**: Information security management standards
- **Industry Standards**: Following OWASP security guidelines

### 🚨 Security Monitoring
- **Real-time Monitoring**: 24/7 security event monitoring
- **Automated Scanning**: Regular vulnerability assessments
- **Incident Response**: Defined procedures for security incidents
- **Threat Detection**: Anomaly detection for suspicious activities
- **Regular Audits**: Third-party security assessments

### 📞 Security Contact
- **Security Issues**: Report security vulnerabilities to [security@planningbord.com](mailto:security@planningbord.com)
- **Responsible Disclosure**: Follow our [Security Policy](SECURITY.md)
- **Incident Response**: security-incident@planningbord.com for active incidents
- **Compliance Questions**: compliance@planningbord.com for regulatory inquiries

**See our [Security Policy](SECURITY.md) for detailed security information and vulnerability reporting process.**

---

**The Planning Bord** - Your comprehensive business management solution with Microsoft 365 integration.