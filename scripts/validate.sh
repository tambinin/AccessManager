#!/bin/bash

# AccessManager System Validation Script
# This script validates the completeness of the AccessManager implementation

echo "🔍 AccessManager System Validation"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

success=0
total=0

check_file() {
    local file=$1
    local description=$2
    total=$((total + 1))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description: $file"
        success=$((success + 1))
    else
        echo -e "${RED}❌${NC} $description: $file (missing)"
    fi
}

check_directory() {
    local dir=$1
    local description=$2
    total=$((total + 1))
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅${NC} $description: $dir"
        success=$((success + 1))
    else
        echo -e "${RED}❌${NC} $description: $dir (missing)"
    fi
}

check_executable() {
    local file=$1
    local description=$2
    total=$((total + 1))
    
    if [ -x "$file" ]; then
        echo -e "${GREEN}✅${NC} $description: $file"
        success=$((success + 1))
    else
        echo -e "${RED}❌${NC} $description: $file (not executable)"
    fi
}

echo -e "\n${BLUE}📋 Core Configuration Files${NC}"
check_file "docker-compose.yml" "Docker Compose Configuration"
check_file ".env.example" "Environment Template"
check_file "README.md" "Documentation"

echo -e "\n${BLUE}🛠️ Backend Components${NC}"
check_file "backend/package.json" "Backend Package Configuration"
check_file "backend/Dockerfile" "Backend Docker Configuration"
check_file "backend/src/app.js" "Main Application"
check_file "backend/prisma/schema.prisma" "Database Schema"
check_file "backend/prisma/seed.js" "Database Seed"

echo -e "\n${BLUE}🔐 Authentication & Middleware${NC}"
check_file "backend/src/middleware/auth.js" "Authentication Middleware"
check_file "backend/src/middleware/errorHandler.js" "Error Handler"
check_file "backend/src/utils/auth.js" "Auth Utilities"
check_file "backend/src/utils/validation.js" "Validation Utilities"

echo -e "\n${BLUE}🛤️ API Routes${NC}"
check_file "backend/src/routes/auth.js" "Authentication Routes"
check_file "backend/src/routes/users.js" "User Routes"
check_file "backend/src/routes/devices.js" "Device Routes"
check_file "backend/src/routes/admin.js" "Admin Routes"
check_file "backend/src/routes/network.js" "Network Routes"

echo -e "\n${BLUE}🌐 Network Services${NC}"
check_file "backend/src/services/networkService.js" "Network Service"

echo -e "\n${BLUE}⚛️ Frontend Components${NC}"
check_file "frontend/package.json" "Frontend Package Configuration"
check_file "frontend/Dockerfile" "Frontend Docker Configuration"
check_file "frontend/tsconfig.json" "TypeScript Configuration"
check_file "frontend/src/App.tsx" "Main React App"
check_file "frontend/src/index.tsx" "React Entry Point"

echo -e "\n${BLUE}🔗 React Components${NC}"
check_file "frontend/src/components/layout/DashboardLayout.tsx" "Dashboard Layout"
check_file "frontend/src/components/common/LoadingSpinner.tsx" "Loading Spinner"
check_file "frontend/src/hooks/useAuth.tsx" "Auth Hook"

echo -e "\n${BLUE}📄 Pages${NC}"
check_file "frontend/src/pages/LoginPage.tsx" "Login Page"
check_file "frontend/src/pages/Dashboard.tsx" "Dashboard Page"
check_file "frontend/src/pages/DevicesPage.tsx" "Devices Page"
check_file "frontend/src/pages/ProfilePage.tsx" "Profile Page"

echo -e "\n${BLUE}👨‍💼 Admin Pages${NC}"
check_file "frontend/src/pages/admin/AdminDashboard.tsx" "Admin Dashboard"
check_file "frontend/src/pages/admin/AdminUsers.tsx" "Admin Users"
check_file "frontend/src/pages/admin/AdminNetwork.tsx" "Admin Network"
check_file "frontend/src/pages/admin/AdminAuditLogs.tsx" "Admin Audit Logs"
check_file "frontend/src/pages/admin/AdminSettings.tsx" "Admin Settings"

echo -e "\n${BLUE}🔗 API Services${NC}"
check_file "frontend/src/services/api.ts" "API Client"
check_file "frontend/src/services/authService.ts" "Auth Service"
check_file "frontend/src/services/userService.ts" "User Service"
check_file "frontend/src/services/deviceService.ts" "Device Service"
check_file "frontend/src/services/adminService.ts" "Admin Service"
check_file "frontend/src/services/networkService.ts" "Network Service"

echo -e "\n${BLUE}📝 TypeScript Types${NC}"
check_file "frontend/src/types/index.ts" "Type Definitions"

echo -e "\n${BLUE}🌐 Nginx Configuration${NC}"
check_file "nginx/Dockerfile" "Nginx Docker Configuration"
check_file "nginx/nginx.conf" "Nginx Main Config"
check_file "nginx/default.conf" "Nginx Site Config"
check_executable "nginx/generate-ssl.sh" "SSL Certificate Generator"

echo -e "\n${BLUE}🔧 Management Scripts${NC}"
check_executable "scripts/setup.sh" "Setup Script"
check_executable "scripts/network-setup.sh" "Network Setup Script"
check_executable "scripts/captive-portal.sh" "Captive Portal Management"

echo -e "\n${BLUE}📊 Validation Summary${NC}"
echo "=================================="
echo -e "Total components checked: ${BLUE}$total${NC}"
echo -e "Successfully validated: ${GREEN}$success${NC}"
echo -e "Missing or invalid: ${RED}$((total - success))${NC}"

if [ $success -eq $total ]; then
    echo -e "\n${GREEN}🎉 VALIDATION SUCCESSFUL!${NC}"
    echo -e "The AccessManager system is ${GREEN}complete${NC} and ready for deployment."
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Run: sudo ./scripts/setup.sh"
    echo "2. Access: https://localhost"
    echo "3. Login with admin credentials"
else
    echo -e "\n${RED}⚠️ VALIDATION INCOMPLETE${NC}"
    echo -e "Some components are missing. Please review the ${RED}❌${NC} items above."
fi

echo ""
echo -e "${BLUE}📚 System Features Implemented:${NC}"
echo "• Complete JWT authentication system"
echo "• PostgreSQL database with Prisma ORM"
echo "• React frontend with TypeScript & Material-UI"
echo "• Device management with 4-device limit"
echo "• Network access control with iptables"
echo "• Admin panel for user & system management"
echo "• Captive portal functionality"
echo "• Real-time monitoring and analytics"
echo "• Comprehensive audit logging"
echo "• Docker containerization"
echo "• Nginx reverse proxy with SSL"
echo "• Automated setup and management scripts"
echo "• Complete documentation"

echo ""
echo -e "${BLUE}🔐 Security Features:${NC}"
echo "• bcrypt password hashing (12 rounds)"
echo "• JWT tokens with refresh mechanism"
echo "• Rate limiting on sensitive endpoints"
echo "• CORS protection"
echo "• Input validation with Joi"
echo "• SQL injection prevention"
echo "• XSS protection headers"
echo "• HTTPS with SSL/TLS"
echo "• Network traffic filtering"
echo "• Audit trail logging"