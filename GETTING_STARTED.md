# Getting Started with The Planning Bord

Welcome to The Planning Bord! This guide will help you get up and running in under 15 minutes.

## Quick Setup (3 minutes)

### 1. Account Creation
- Visit [app.planningbord.com](https://app.planningbord.com)
- Click "Start Free Trial"
- Enter your business details
- Verify your email

### 2. Initial Configuration
- **Business Info**: Add your company name and basic details
- **Users**: Invite your team members
- **Microsoft 365**: Connect your Office 365 account (optional)

### 3. Add Your First Data
- **Products**: Import your inventory
- **Employees**: Add your team
- **Suppliers**: Set up your vendor list

## Step-by-Step Setup Guide

### Phase 1: Core Setup (10 minutes)

#### Step 1: Business Configuration
```
Dashboard → Settings → Business Profile
```
- Company name and logo
- Business address and contact info
- Fiscal year settings
- Currency preferences

#### Step 2: User Management
```
Dashboard → Employees → Add Employee
```
- Add team members with appropriate roles
- Set up role-based permissions
- Configure notification preferences

#### Step 3: Microsoft 365 Integration (Optional)
```
Dashboard → Settings → Integrations → Microsoft 365
```
- Connect Outlook for email notifications
- Link Calendar for meeting scheduling
- Connect OneDrive for file storage
- Set up SharePoint for data synchronization

### Phase 2: Data Import (15 minutes)

#### Option A: Manual Entry
Perfect for small businesses starting fresh.

#### Option B: CSV Import
For businesses migrating from spreadsheets.
```
Dashboard → [Section] → Import → Upload CSV
```
Download our CSV templates:
- [Product Import Template](templates/products.csv)
- [Employee Import Template](templates/employees.csv)
- [Supplier Import Template](templates/suppliers.csv)

#### Option C: API Integration
For businesses with existing systems.
```
API Documentation: https://docs.planningbord.com/api
```

### Phase 3: Customization (10 minutes)

#### Dashboard Setup
```
Dashboard → Settings → Dashboard
```
- Choose your preferred widgets
- Set up custom alerts and notifications
- Configure reporting preferences

#### Workflow Automation
```
Dashboard → Settings → Automation
```
- Set up automatic reorder alerts
- Configure salary payment reminders
- Enable attendance tracking notifications

## Demo Data

Want to explore before adding your data? Use our demo environment:

**Demo Credentials:**
- URL: [demo.planningbord.com](https://demo.planningbord.com)
- Email: `demo@planningbord.com`
- Password: `demo123`

The demo includes:
- 50 sample products
- 15 employee profiles
- 6 months of sample transactions
- Configured Microsoft 365 integration

## Common Setup Issues

### "Email not sending"
- Check your SMTP settings in Settings → Email
- Verify firewall allows outbound connections on port 587/465
- Test with our email diagnostic tool

### "Database connection failed"
- Verify PostgreSQL is running
- Check connection string in environment variables
- Ensure database user has proper permissions

### "Microsoft 365 connection failed"
- Verify Azure app registration is complete
- Check API permissions are granted
- Confirm tenant ID and client secret are correct

## Success Metrics

After setup, you should see:
- ✅ Dashboard loads with real data
- ✅ Email notifications working
- ✅ Team members can log in
- ✅ Basic CRUD operations functional

## Next Steps

### Week 1: Core Operations
- Daily inventory updates
- Employee attendance tracking
- Process incoming orders

### Week 2: Optimization
- Set up automated alerts
- Configure custom reports
- Train additional team members

### Week 3: Advanced Features
- Microsoft 365 automation
- API integrations
- Advanced analytics

## Support Resources

- **Documentation**: [docs.planningbord.com](https://docs.planningbord.com)
- **Video Tutorials**: [youtube.com/planningbord](https://youtube.com/planningbord)
- **Community Forum**: [community.planningbord.com](https://community.planningbord.com)
- **Email Support**: support@planningbord.com
- **Live Chat**: Available 9 AM - 6 PM EST

## Upgrade from Free to Paid

Ready to unlock advanced features?
```
Dashboard → Settings → Billing → Upgrade
```

Compare plans: [pricing.planningbord.com](https://planningbord.com/pricing)

---

**Need help?** Contact our onboarding team at onboarding@planningbord.com

*This guide was last updated on December 2024*
