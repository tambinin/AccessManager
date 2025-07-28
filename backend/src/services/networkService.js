const { exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');

const execAsync = promisify(exec);

// Get device information from request
const getDeviceInfo = async (req) => {
  const userAgent = req.get('User-Agent') || '';
  const forwarded = req.get('X-Forwarded-For');
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  
  // Generate a pseudo MAC address based on IP and User-Agent for testing
  // In production, this would be obtained from ARP tables or network monitoring
  const hash = crypto.createHash('md5').update(ip + userAgent).digest('hex');
  const macAddress = hash.match(/.{1,2}/g).slice(0, 6).join(':').toLowerCase();
  
  // Extract device name from User-Agent
  let deviceName = 'Unknown Device';
  if (userAgent.includes('Windows')) deviceName = 'Windows PC';
  else if (userAgent.includes('Mac')) deviceName = 'Mac';
  else if (userAgent.includes('iPhone')) deviceName = 'iPhone';
  else if (userAgent.includes('iPad')) deviceName = 'iPad';
  else if (userAgent.includes('Android')) deviceName = 'Android Device';
  else if (userAgent.includes('Linux')) deviceName = 'Linux Device';

  return {
    macAddress,
    ipAddress: ip,
    deviceName,
    userAgent
  };
};

// Add device to iptables whitelist
const addDeviceToWhitelist = async (macAddress, ipAddress) => {
  try {
    // Check if rule already exists
    const checkCommand = `iptables -C FORWARD -m mac --mac-source ${macAddress} -j ACCEPT 2>/dev/null`;
    
    try {
      await execAsync(checkCommand);
      console.log(`Device ${macAddress} already whitelisted`);
      return;
    } catch (error) {
      // Rule doesn't exist, add it
    }

    // Add MAC address rule
    const macCommand = `iptables -I FORWARD -m mac --mac-source ${macAddress} -j ACCEPT`;
    await execAsync(macCommand);
    
    // Add IP address rule as backup
    const ipCommand = `iptables -I FORWARD -s ${ipAddress} -j ACCEPT`;
    await execAsync(ipCommand);
    
    console.log(`Device ${macAddress} (${ipAddress}) added to whitelist`);
  } catch (error) {
    console.error(`Failed to add device to whitelist: ${error.message}`);
    throw error;
  }
};

// Remove device from iptables whitelist
const removeDeviceFromWhitelist = async (macAddress, ipAddress) => {
  try {
    // Remove MAC address rule
    const macCommand = `iptables -D FORWARD -m mac --mac-source ${macAddress} -j ACCEPT 2>/dev/null || true`;
    await execAsync(macCommand);
    
    // Remove IP address rule
    const ipCommand = `iptables -D FORWARD -s ${ipAddress} -j ACCEPT 2>/dev/null || true`;
    await execAsync(ipCommand);
    
    console.log(`Device ${macAddress} (${ipAddress}) removed from whitelist`);
  } catch (error) {
    console.error(`Failed to remove device from whitelist: ${error.message}`);
    throw error;
  }
};

// Get current iptables rules
const getCurrentRules = async () => {
  try {
    const { stdout } = await execAsync('iptables -L FORWARD -n -v');
    return stdout;
  } catch (error) {
    console.error(`Failed to get current rules: ${error.message}`);
    throw error;
  }
};

// Initialize captive portal iptables rules
const initializeCaptivePortal = async () => {
  try {
    // Flush existing rules in FORWARD chain
    await execAsync('iptables -F FORWARD');
    
    // Allow loopback traffic
    await execAsync('iptables -I FORWARD -i lo -j ACCEPT');
    await execAsync('iptables -I FORWARD -o lo -j ACCEPT');
    
    // Allow established and related connections
    await execAsync('iptables -I FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT');
    
    // Allow DNS traffic (port 53)
    await execAsync('iptables -I FORWARD -p udp --dport 53 -j ACCEPT');
    await execAsync('iptables -I FORWARD -p tcp --dport 53 -j ACCEPT');
    
    // Allow HTTP/HTTPS to captive portal
    await execAsync('iptables -I FORWARD -p tcp --dport 80 -j ACCEPT');
    await execAsync('iptables -I FORWARD -p tcp --dport 443 -j ACCEPT');
    
    // Allow traffic to portal server (backend)
    await execAsync('iptables -I FORWARD -p tcp --dport 5000 -j ACCEPT');
    
    // Default deny rule (should be last)
    await execAsync('iptables -A FORWARD -j DROP');
    
    console.log('Captive portal iptables rules initialized');
  } catch (error) {
    console.error(`Failed to initialize captive portal: ${error.message}`);
    throw error;
  }
};

// Setup NAT rules for internet access
const setupNATRules = async (interface = 'eth0') => {
  try {
    // Enable IP forwarding
    await execAsync('echo 1 > /proc/sys/net/ipv4/ip_forward');
    
    // Setup NAT rules
    await execAsync(`iptables -t nat -A POSTROUTING -o ${interface} -j MASQUERADE`);
    await execAsync(`iptables -A FORWARD -i ${interface} -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT`);
    await execAsync(`iptables -A FORWARD -i wlan0 -o ${interface} -j ACCEPT`);
    
    console.log('NAT rules configured');
  } catch (error) {
    console.error(`Failed to setup NAT rules: ${error.message}`);
    throw error;
  }
};

// Redirect HTTP traffic to captive portal
const setupCaptivePortalRedirect = async (portalIP = '192.168.1.1', portalPort = '80') => {
  try {
    // Redirect HTTP traffic to captive portal
    const redirectCommand = `iptables -t nat -I PREROUTING -p tcp --dport 80 -j DNAT --to-destination ${portalIP}:${portalPort}`;
    await execAsync(redirectCommand);
    
    console.log(`HTTP traffic redirected to captive portal at ${portalIP}:${portalPort}`);
  } catch (error) {
    console.error(`Failed to setup captive portal redirect: ${error.message}`);
    throw error;
  }
};

// Get connected devices information
const getConnectedDevices = async () => {
  try {
    // Get ARP table entries
    const { stdout: arpOutput } = await execAsync('arp -a');
    
    // Get DHCP leases if available
    let dhcpLeases = '';
    try {
      const { stdout } = await execAsync('cat /var/lib/dhcp/dhcpd.leases');
      dhcpLeases = stdout;
    } catch (error) {
      // DHCP leases file might not exist or be accessible
    }
    
    // Parse connected devices from ARP table
    const devices = [];
    const arpLines = arpOutput.split('\n').filter(line => line.trim());
    
    for (const line of arpLines) {
      const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\) at ([a-fA-F0-9:]{17})/);
      if (match) {
        devices.push({
          ipAddress: match[1],
          macAddress: match[2].toLowerCase(),
          lastSeen: new Date()
        });
      }
    }
    
    return devices;
  } catch (error) {
    console.error(`Failed to get connected devices: ${error.message}`);
    return [];
  }
};

// Monitor network traffic for a device
const getDeviceTrafficStats = async (ipAddress) => {
  try {
    // Get traffic statistics from iptables
    const { stdout } = await execAsync(`iptables -L FORWARD -n -v | grep ${ipAddress}`);
    
    // Parse bytes and packets from iptables output
    const lines = stdout.split('\n').filter(line => line.includes(ipAddress));
    let totalBytes = 0;
    let totalPackets = 0;
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        totalPackets += parseInt(parts[0]) || 0;
        totalBytes += parseInt(parts[1]) || 0;
      }
    }
    
    return {
      totalBytes,
      totalPackets,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`Failed to get traffic stats for ${ipAddress}: ${error.message}`);
    return {
      totalBytes: 0,
      totalPackets: 0,
      timestamp: new Date()
    };
  }
};

module.exports = {
  getDeviceInfo,
  addDeviceToWhitelist,
  removeDeviceFromWhitelist,
  getCurrentRules,
  initializeCaptivePortal,
  setupNATRules,
  setupCaptivePortalRedirect,
  getConnectedDevices,
  getDeviceTrafficStats
};