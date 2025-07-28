# AccessManager - Starlink Internet Access Management System

A comprehensive web application for managing Internet access through a Starlink connection with captive portal functionality. This system provides secure authentication, device management, and network access control with a limit of 4 devices per user.

## 🌟 Features

### 🔐 User Authentication & Security
- JWT-based authentication with refresh tokens
- bcrypt password hashing (12 salt rounds)
- Rate limiting and CORS protection
- Secure session management
- Role-based access control (User/Admin)

### 📱 Device Management
- Automatic device detection and registration
- MAC address-based device identification
- Maximum 4 devices per user limit
- Device whitelisting with iptables integration
- Real-time device monitoring

### 🌐 Network Control
- Captive portal functionality
- Automatic IP/MAC whitelisting
- iptables-based access control
- Network traffic monitoring
- Emergency disconnect capabilities

### 👨‍💼 Admin Features
- User management (CRUD operations)
- Real-time network monitoring
- Device and connection analytics
- Audit logging
- System configuration management
- Network rule management

### 📊 Monitoring & Analytics
- Real-time connection statistics
- Data usage tracking
- Connection history
- Device activity monitoring
- Comprehensive audit trails

## 🏗️ Architecture

### Backend (Node.js + Express.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with bcrypt
- **Security**: Rate limiting, CORS, Joi validation, Helmet.js
- **Network**: iptables integration for access control
- **Monitoring**: Winston logging, audit trails

### Frontend (React.js + TypeScript)
- **UI Framework**: Material-UI (MUI)
- **State Management**: React Query for server state
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Yup validation
- **Notifications**: React Hot Toast

### Infrastructure
- **Containerization**: Docker with docker-compose
- **Reverse Proxy**: Nginx with SSL/TLS
- **Database**: PostgreSQL 15
- **Network**: iptables-based captive portal

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Root access for network configuration
- Open ports: 80, 443, 3000, 5000, 5432

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AccessManager
   ```

2. **Run the setup script**
   ```bash
   sudo ./scripts/setup.sh
   ```

3. **Access the application**
   - Web Interface: https://localhost
   - Admin Login: `admin@accessmanager.local` / `Admin@123456`
   - Test User: `user@example.com` / `User@123456`

## 📋 Manual Installation

### 1. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 2. Network Setup
```bash
sudo ./scripts/network-setup.sh
```

### 3. Build and Start Services
```bash
docker-compose build
docker-compose up -d
```

### 4. Database Setup
```bash
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

## 🛠️ Management Commands

### Captive Portal Management
```bash
# Start the system
sudo ./scripts/captive-portal.sh start

# Show status
./scripts/captive-portal.sh status

# View logs
./scripts/captive-portal.sh logs

# Manually whitelist a device
sudo ./scripts/captive-portal.sh whitelist aa:bb:cc:dd:ee:ff

# List connected devices
./scripts/captive-portal.sh list-devices
```

### Docker Commands
```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Database console
docker-compose exec postgres psql -U postgres -d accessmanager
```

## 📁 Project Structure

```
AccessManager/
├── docker-compose.yml          # Docker orchestration
├── .env.example               # Environment variables template
├── README.md                  # This file
├── backend/                   # Node.js/Express backend
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── models/           # Database models (Prisma)
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utilities and helpers
│   │   └── app.js            # Express application
│   └── prisma/
│       ├── schema.prisma     # Database schema
│       └── seed.js           # Database seeding
├── frontend/                  # React.js frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── components/       # React components
│       ├── pages/            # Page components
│       ├── services/         # API services
│       ├── hooks/            # Custom React hooks
│       ├── types/            # TypeScript type definitions
│       └── utils/            # Frontend utilities
├── nginx/                     # Reverse proxy configuration
│   ├── Dockerfile
│   ├── nginx.conf            # Main nginx configuration
│   ├── default.conf          # Site configuration
│   └── generate-ssl.sh       # SSL certificate generation
└── scripts/                   # Management scripts
    ├── setup.sh              # Complete system setup
    ├── network-setup.sh      # Network configuration
    └── captive-portal.sh     # Portal management
```

## 🔧 Configuration

### Environment Variables

Key environment variables in `.env`:

```bash
# Database
POSTGRES_DB=accessmanager
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Network
MAX_DEVICES_PER_USER=4
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Network Configuration

The system automatically configures iptables rules for:
- Captive portal functionality
- Device whitelisting
- NAT for internet access
- DNS traffic allowance
- Access to portal endpoints

## 🔒 Security Features

### Authentication & Authorization
- JWT access tokens (15-minute expiration)
- Refresh tokens (7-day expiration)
- bcrypt password hashing
- Role-based access control
- Session management

### Network Security
- HTTPS with SSL/TLS encryption
- Rate limiting on sensitive endpoints
- CORS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers

### Infrastructure Security
- Docker container isolation
- Nginx security headers
- Secure cookie configuration
- Environment variable protection
- Audit logging

## 📊 API Documentation

### Authentication Endpoints
```
POST /api/auth/login          # User login
POST /api/auth/refresh        # Refresh access token
POST /api/auth/logout         # User logout
GET  /api/auth/me            # Get current user
```

### User Endpoints
```
GET  /api/users/profile       # Get user profile
PUT  /api/users/profile       # Update user profile
PUT  /api/users/change-password # Change password
GET  /api/users/devices       # Get user devices
GET  /api/users/connections   # Get user connections
GET  /api/users/stats         # Get user statistics
```

### Device Endpoints
```
GET    /api/devices           # Get user devices
GET    /api/devices/:id       # Get device details
PUT    /api/devices/:id       # Update device
POST   /api/devices/:id/disconnect # Disconnect device
DELETE /api/devices/:id       # Delete device
```

### Admin Endpoints
```
GET  /api/admin/dashboard     # Admin dashboard stats
GET  /api/admin/users         # Get all users
POST /api/admin/users         # Create user
PUT  /api/admin/users/:id     # Update user
DELETE /api/admin/users/:id   # Delete user
GET  /api/admin/audit-logs    # Get audit logs
```

### Network Endpoints
```
GET  /api/network/status      # Network status
POST /api/network/initialize  # Initialize captive portal
GET  /api/network/rules       # Get network rules
POST /api/network/rules       # Create network rule
GET  /api/network/monitor     # Real-time monitoring
```

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Manual Testing
1. Access the login page at https://localhost
2. Login with admin credentials
3. Test device registration by connecting a new device
4. Verify device limit enforcement
5. Test admin functionality

## 🚨 Troubleshooting

### Common Issues

**1. Permission denied errors**
```bash
# Ensure scripts are executable
chmod +x scripts/*.sh
```

**2. Network connectivity issues**
```bash
# Check iptables rules
sudo iptables -L ACCESSMANAGER_FORWARD

# Restart network setup
sudo ./scripts/network-setup.sh
```

**3. Database connection errors**
```bash
# Check database status
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

**4. SSL certificate issues**
```bash
# Regenerate SSL certificates
docker-compose exec nginx /usr/local/bin/generate-ssl.sh
docker-compose restart nginx
```

### Logs and Monitoring
```bash
# Application logs
docker-compose logs -f

# Network traffic logs
sudo tail -f /var/log/kern.log | grep ACCESSMANAGER

# System status
./scripts/captive-portal.sh status
```

## 🔄 Backup and Recovery

### Database Backup
```bash
docker-compose exec postgres pg_dump -U postgres accessmanager > backup.sql
```

### Configuration Backup
```bash
# Backup iptables rules
sudo iptables-save > iptables_backup.rules

# Backup environment
cp .env .env.backup
```

### Recovery
```bash
# Restore database
docker-compose exec postgres psql -U postgres accessmanager < backup.sql

# Restore iptables
sudo iptables-restore < iptables_backup.rules
```

## 🔧 Production Deployment

### SSL Certificates
Replace self-signed certificates with proper SSL certificates:
```bash
# Copy your certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

### Security Hardening
1. Change all default passwords
2. Configure firewall rules
3. Enable automatic security updates
4. Set up monitoring and alerting
5. Configure log rotation
6. Regular security audits

### Performance Optimization
1. Configure database connection pooling
2. Enable Redis for session storage
3. Set up CDN for static assets
4. Configure database indexing
5. Enable gzip compression

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the logs for error details

## 🏷️ Version

Current Version: 1.0.0

---

**⚠️ Important Notes:**
- This system requires root privileges for network configuration
- Change all default passwords before production use
- Configure proper SSL certificates for production
- Regularly update dependencies for security
- Monitor system resources and performance

**🎯 Starlink Integration:**
This system is designed to work with Starlink internet connections, providing controlled access through a captive portal while maintaining the stable satellite connection.
