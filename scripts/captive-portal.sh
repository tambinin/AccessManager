#!/bin/bash

# Captive Portal Management Script
# This script provides utilities for managing the captive portal

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to show help
show_help() {
    echo "AccessManager Captive Portal Management Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start                Start the captive portal"
    echo "  stop                 Stop the captive portal"
    echo "  restart              Restart the captive portal"
    echo "  status               Show captive portal status"
    echo "  whitelist [MAC]      Add MAC address to whitelist"
    echo "  blacklist [MAC]      Remove MAC address from whitelist"
    echo "  list-devices         Show connected devices"
    echo "  flush                Clear all iptables rules"
    echo "  logs                 Show AccessManager logs"
    echo "  help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 whitelist aa:bb:cc:dd:ee:ff"
    echo "  $0 list-devices"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo "❌ This command must be run as root"
        exit 1
    fi
}

# Function to start captive portal
start_portal() {
    echo "🚀 Starting AccessManager captive portal..."
    cd "$PROJECT_DIR"
    docker-compose up -d
    echo "✅ Captive portal started"
}

# Function to stop captive portal
stop_portal() {
    echo "🛑 Stopping AccessManager captive portal..."
    cd "$PROJECT_DIR"
    docker-compose down
    echo "✅ Captive portal stopped"
}

# Function to restart captive portal
restart_portal() {
    echo "🔄 Restarting AccessManager captive portal..."
    stop_portal
    sleep 2
    start_portal
}

# Function to show status
show_status() {
    echo "📊 AccessManager Captive Portal Status"
    echo "======================================"
    
    cd "$PROJECT_DIR"
    if docker-compose ps | grep -q "Up"; then
        echo "🟢 Status: Running"
        echo ""
        echo "Services:"
        docker-compose ps
    else
        echo "🔴 Status: Stopped"
    fi
    
    echo ""
    echo "Network Status:"
    if iptables -L ACCESSMANAGER_FORWARD &>/dev/null; then
        echo "🟢 iptables rules: Active"
        ACTIVE_RULES=$(iptables -L ACCESSMANAGER_FORWARD | grep -c "ACCEPT" || echo "0")
        echo "📊 Active whitelist rules: $ACTIVE_RULES"
    else
        echo "🔴 iptables rules: Not configured"
    fi
}

# Function to add MAC to whitelist
whitelist_mac() {
    check_root
    MAC=$1
    if [ -z "$MAC" ]; then
        echo "❌ MAC address required"
        echo "Usage: $0 whitelist [MAC_ADDRESS]"
        exit 1
    fi
    
    echo "🔓 Adding MAC address to whitelist: $MAC"
    iptables -I ACCESSMANAGER_FORWARD -m mac --mac-source "$MAC" -j ACCEPT
    echo "✅ MAC address whitelisted"
}

# Function to remove MAC from whitelist
blacklist_mac() {
    check_root
    MAC=$1
    if [ -z "$MAC" ]; then
        echo "❌ MAC address required"
        echo "Usage: $0 blacklist [MAC_ADDRESS]"
        exit 1
    fi
    
    echo "🔒 Removing MAC address from whitelist: $MAC"
    iptables -D ACCESSMANAGER_FORWARD -m mac --mac-source "$MAC" -j ACCEPT 2>/dev/null || echo "⚠️  MAC address not found in whitelist"
    echo "✅ MAC address removed from whitelist"
}

# Function to list connected devices
list_devices() {
    echo "📱 Connected Devices"
    echo "==================="
    
    echo "ARP Table:"
    arp -a | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}" || echo "No devices found in ARP table"
    
    echo ""
    echo "Whitelisted MACs:"
    if iptables -L ACCESSMANAGER_FORWARD -n | grep -q "mac"; then
        iptables -L ACCESSMANAGER_FORWARD -n | grep "mac" | awk '{print $7}' | sed 's/MAC//' || echo "No whitelisted devices"
    else
        echo "No whitelisted devices"
    fi
}

# Function to flush iptables rules
flush_rules() {
    check_root
    echo "🔥 Flushing AccessManager iptables rules..."
    
    # Remove custom chains from main chains
    iptables -t nat -D PREROUTING -j ACCESSMANAGER_PREROUTING 2>/dev/null || true
    iptables -D FORWARD -j ACCESSMANAGER_FORWARD 2>/dev/null || true
    iptables -D INPUT -j ACCESSMANAGER_INPUT 2>/dev/null || true
    
    # Flush and delete custom chains
    iptables -t nat -F ACCESSMANAGER_PREROUTING 2>/dev/null || true
    iptables -F ACCESSMANAGER_FORWARD 2>/dev/null || true
    iptables -F ACCESSMANAGER_INPUT 2>/dev/null || true
    
    iptables -t nat -X ACCESSMANAGER_PREROUTING 2>/dev/null || true
    iptables -X ACCESSMANAGER_FORWARD 2>/dev/null || true
    iptables -X ACCESSMANAGER_INPUT 2>/dev/null || true
    
    echo "✅ iptables rules flushed"
}

# Function to show logs
show_logs() {
    echo "📋 AccessManager Logs"
    echo "===================="
    cd "$PROJECT_DIR"
    docker-compose logs -f --tail=50
}

# Main script logic
case "${1:-help}" in
    start)
        start_portal
        ;;
    stop)
        stop_portal
        ;;
    restart)
        restart_portal
        ;;
    status)
        show_status
        ;;
    whitelist)
        whitelist_mac "$2"
        ;;
    blacklist)
        blacklist_mac "$2"
        ;;
    list-devices)
        list_devices
        ;;
    flush)
        flush_rules
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac