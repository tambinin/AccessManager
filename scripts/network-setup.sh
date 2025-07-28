#!/bin/bash

# Network Setup Script for AccessManager
# This script configures iptables for captive portal functionality

set -e

echo "🌐 Setting up network configuration for AccessManager..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root"
    exit 1
fi

# Default network interface (change this to match your setup)
INTERFACE=${1:-eth0}
PORTAL_IP=${2:-192.168.1.1}

echo "📡 Configuring network interface: $INTERFACE"
echo "🏠 Portal IP: $PORTAL_IP"

# Backup current iptables rules
echo "💾 Backing up current iptables rules..."
iptables-save > /tmp/iptables_backup_$(date +%Y%m%d_%H%M%S).rules

# Enable IP forwarding
echo "🔄 Enabling IP forwarding..."
echo 1 > /proc/sys/net/ipv4/ip_forward

# Make IP forwarding persistent
if ! grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf; then
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    echo "✅ IP forwarding made persistent"
fi

# Create custom chains for AccessManager
echo "🔗 Creating custom iptables chains..."
iptables -t nat -N ACCESSMANAGER_PREROUTING 2>/dev/null || true
iptables -t filter -N ACCESSMANAGER_FORWARD 2>/dev/null || true
iptables -t filter -N ACCESSMANAGER_INPUT 2>/dev/null || true

# Clear existing rules in custom chains
iptables -t nat -F ACCESSMANAGER_PREROUTING
iptables -t filter -F ACCESSMANAGER_FORWARD
iptables -t filter -F ACCESSMANAGER_INPUT

# Insert custom chains into main chains
iptables -t nat -I PREROUTING -j ACCESSMANAGER_PREROUTING
iptables -I FORWARD -j ACCESSMANAGER_FORWARD
iptables -I INPUT -j ACCESSMANAGER_INPUT

# Allow established and related connections
iptables -t filter -A ACCESSMANAGER_FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow loopback traffic
iptables -t filter -A ACCESSMANAGER_INPUT -i lo -j ACCEPT
iptables -t filter -A ACCESSMANAGER_FORWARD -i lo -j ACCEPT

# Allow DNS traffic (essential for internet access)
iptables -t filter -A ACCESSMANAGER_FORWARD -p udp --dport 53 -j ACCEPT
iptables -t filter -A ACCESSMANAGER_FORWARD -p tcp --dport 53 -j ACCEPT

# Allow access to AccessManager portal
iptables -t filter -A ACCESSMANAGER_FORWARD -p tcp --dport 80 -j ACCEPT
iptables -t filter -A ACCESSMANAGER_FORWARD -p tcp --dport 443 -j ACCEPT
iptables -t filter -A ACCESSMANAGER_FORWARD -p tcp --dport 5000 -j ACCEPT

# Allow SSH (important for remote management)
iptables -t filter -A ACCESSMANAGER_INPUT -p tcp --dport 22 -j ACCEPT

# NAT configuration for internet access
echo "🌍 Configuring NAT for internet access..."
iptables -t nat -A POSTROUTING -o $INTERFACE -j MASQUERADE

# Redirect HTTP traffic to captive portal (for non-authenticated users)
# This will be managed by the application for specific IPs
echo "🔄 Setting up captive portal redirect..."
# The application will manage specific redirects for non-authenticated devices

# Log all dropped packets for debugging
iptables -A ACCESSMANAGER_FORWARD -j LOG --log-prefix "ACCESSMANAGER_DROP: " --log-level 4

# Drop all other traffic by default
iptables -A ACCESSMANAGER_FORWARD -j DROP

# Save iptables rules
echo "💾 Saving iptables rules..."
if command -v netfilter-persistent &> /dev/null; then
    netfilter-persistent save
elif command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4
elif [ -d /etc/sysconfig ]; then
    service iptables save
fi

echo "✅ Network configuration completed successfully!"
echo ""
echo "📋 Network Configuration Summary:"
echo "   🌐 Interface: $INTERFACE"
echo "   🏠 Portal IP: $PORTAL_IP"
echo "   🔄 IP Forwarding: Enabled"
echo "   🛡️  Captive Portal: Configured"
echo "   🌍 NAT: Enabled for internet access"
echo ""
echo "⚠️  Notes:"
echo "   🔧 Customize INTERFACE variable if your network setup differs"
echo "   📊 Monitor logs: tail -f /var/log/kern.log | grep ACCESSMANAGER"
echo "   🔄 Restore backup if needed: iptables-restore < /tmp/iptables_backup_*.rules"
echo ""
echo "🎯 The AccessManager application will now manage device-specific access rules"