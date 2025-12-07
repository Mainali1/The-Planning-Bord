# Hybrid Server Setup Guide

The Planning Bord supports both cloud and local server deployment modes, allowing you to choose the best option for your business needs.

## Deployment Options

### 1. Local Server (Offline-First)
- **Best for**: Small businesses, limited internet connectivity, data privacy concerns
- **Pros**: Full offline capability, no recurring costs, complete data control
- **Cons**: Limited to local network, manual backups required, no automatic updates

### 2. Cloud Server (Online-First)
- **Best for**: Multi-location businesses, remote teams, automatic scaling
- **Pros**: Global access, automatic backups, high availability, automatic updates
- **Cons**: Requires internet connection, ongoing costs, data hosted externally

### 3. Hybrid Mode (Recommended)
- **Best for**: Businesses wanting both local control and cloud benefits
- **Pros**: Local primary server with cloud sync, backup redundancy, flexible access
- **Cons**: More complex setup, requires both local and cloud management

## Quick Start

### Local Server Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd The-Planning-Bord/backend
   ```

2. **Set up local environment**
   ```bash
   cp config/local.example.env .env
   # Edit .env with your local settings
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server**
   ```bash
   python main.py
   ```

5. **Access the application**
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Cloud Server Setup

1. **Prepare your cloud environment**
   - Choose a cloud provider (AWS, Google Cloud, Azure, DigitalOcean)
   - Set up a virtual machine with at least 2GB RAM
   - Configure a PostgreSQL database
   - Set up cloud storage for file uploads

2. **Set up cloud environment**
   ```bash
   cp config/cloud.example.env .env
   # Edit .env with your cloud settings
   ```

3. **Deploy using Docker (recommended)**
   ```bash
   docker build -t planning-bord-backend .
   docker run -d -p 8000:8000 --env-file .env planning-bord-backend
   ```

4. **Set up domain and SSL**
   - Configure your domain DNS
   - Set up SSL certificates (Let's Encrypt recommended)
   - Configure reverse proxy (Nginx recommended)

## Configuration Details

### Environment Variables

| Variable | Local | Cloud | Description |
|----------|--------|--------|-------------|
| `BACKEND_HOST` | localhost | 0.0.0.0 | Server bind address |
| `BACKEND_PORT` | 8000 | 8000 | Server port |
| `DATABASE_URL` | SQLite | PostgreSQL | Database connection string |
| `OFFLINE_MODE` | true | false | Enable offline features |
| `STORAGE_TYPE` | local | cloud | File storage type |
| `MS_CLIENT_ID` | Optional | Required | Microsoft 365 client ID |

### Database Options

#### Local (SQLite)
- **Pros**: Zero configuration, file-based, perfect for single-user/small teams
- **Cons**: Limited concurrent access, no advanced features
- **Use case**: Development, small businesses, offline-first

#### Cloud (PostgreSQL)
- **Pros**: High performance, concurrent access, advanced features
- **Cons**: Requires setup, resource usage
- **Use case**: Production, multi-user, cloud deployment

### File Storage Options

#### Local Storage
- Files stored in `./uploads` directory
- Simple backup by copying directory
- Limited by local disk space

#### Cloud Storage (AWS S3, Google Cloud Storage)
- Scalable storage
- Automatic redundancy
- CDN integration for global access

## Hybrid Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Frontend      │    │   Frontend      │
│   (Electron)    │    │   (Web Browser) │    │   (Mobile)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │    Load Balancer        │
                    │    (CloudFlare/CDN)     │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │    Cloud Server           │
                    │    (FastAPI Backend)      │
                    │    PostgreSQL Database      │
                    │    Cloud Storage           │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │    Local Server          │
                    │    (FastAPI Backend)     │
                    │    SQLite Database        │
                    │    Local Storage          │
                    └─────────────────────────┘
```

## Sync Strategy

### Automatic Sync (Cloud Primary)
- Local server syncs with cloud every 5 minutes
- Cloud server handles conflict resolution
- Offline changes queued and synced when online

### Manual Sync (Local Primary)
- User initiates sync when needed
- Full control over what gets synced
- Backup to cloud on demand

## Security Considerations

### Local Server Security
- Use strong passwords for database
- Enable firewall rules
- Regular local backups
- Secure file permissions

### Cloud Server Security
- Use HTTPS/TLS encryption
- Implement proper authentication
- Regular security updates
- Monitor access logs
- Use VPN for admin access

## Monitoring and Maintenance

### Local Server Monitoring
- Check disk space regularly
- Monitor server logs
- Test backup restoration
- Update dependencies monthly

### Cloud Server Monitoring
- Set up uptime monitoring
- Configure alerting
- Monitor resource usage
- Set up automated backups
- Review security logs

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database URL in .env file
   - Verify database service is running
   - Check network connectivity

2. **Port Already in Use**
   - Change BACKEND_PORT in .env file
   - Kill existing process using the port

3. **Permission Errors**
   - Check file permissions
   - Run with appropriate user privileges
   - Verify directory ownership

4. **Microsoft 365 Integration Issues**
   - Verify client credentials
   - Check redirect URI configuration
   - Ensure internet connectivity

### Getting Help
- Check the logs in the console output
- Review API documentation at `/docs`
- Check GitHub issues for known problems
- Contact support for assistance

## Performance Optimization

### Local Server
- Use SSD storage for better performance
- Allocate sufficient RAM (minimum 2GB)
- Regular database maintenance
- Optimize file storage location

### Cloud Server
- Use CDN for static assets
- Implement caching strategies
- Use database connection pooling
- Monitor and scale resources as needed