const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const { adminMiddleware } = require('../middleware/auth');
const { validate, networkRuleSchema } = require('../utils/validation');
const {
  getCurrentRules,
  initializeCaptivePortal,
  setupNATRules,
  getConnectedDevices,
  getDeviceTrafficStats
} = require('../services/networkService');

const router = express.Router();
const prisma = new PrismaClient();

// Get current network status
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const [currentRules, connectedDevices] = await Promise.all([
      getCurrentRules(),
      getConnectedDevices()
    ]);

    // Get active devices from database
    const activeDevices = await prisma.device.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { username: true, email: true }
        }
      }
    });

    res.json({
      iptablesRules: currentRules,
      connectedDevices,
      activeDevices
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get network status',
      message: error.message
    });
  }
}));

// Initialize captive portal
router.post('/initialize', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    await initializeCaptivePortal();
    
    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: 'NETWORK_INITIALIZE',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({ message: 'Captive portal initialized successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to initialize captive portal',
      message: error.message
    });
  }
}));

// Setup NAT rules
router.post('/setup-nat', adminMiddleware, asyncHandler(async (req, res) => {
  const { interface: networkInterface } = req.body;

  try {
    await setupNATRules(networkInterface);
    
    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: 'NETWORK_SETUP_NAT',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { interface: networkInterface }
      }
    });

    res.json({ message: 'NAT rules configured successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to setup NAT rules',
      message: error.message
    });
  }
}));

// Get network rules
router.get('/rules', adminMiddleware, asyncHandler(async (req, res) => {
  const rules = await prisma.networkRule.findMany({
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
  });

  res.json({ rules });
}));

// Create network rule
router.post('/rules', adminMiddleware, validate(networkRuleSchema), asyncHandler(async (req, res) => {
  const { name, description, ruleType, target, priority } = req.body;

  const rule = await prisma.networkRule.create({
    data: {
      name,
      description,
      ruleType,
      target,
      priority
    }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'NETWORK_CREATE_RULE',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { ruleId: rule.id, ruleName: name }
    }
  });

  res.status(201).json({
    message: 'Network rule created successfully',
    rule
  });
}));

// Update network rule
router.put('/rules/:ruleId', adminMiddleware, validate(networkRuleSchema), asyncHandler(async (req, res) => {
  const { ruleId } = req.params;
  const { name, description, ruleType, target, priority, isActive } = req.body;

  const rule = await prisma.networkRule.findUnique({
    where: { id: ruleId }
  });

  if (!rule) {
    return res.status(404).json({ error: 'Network rule not found' });
  }

  const updatedRule = await prisma.networkRule.update({
    where: { id: ruleId },
    data: {
      name,
      description,
      ruleType,
      target,
      priority,
      ...(isActive !== undefined && { isActive })
    }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'NETWORK_UPDATE_RULE',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { ruleId, ruleName: name }
    }
  });

  res.json({
    message: 'Network rule updated successfully',
    rule: updatedRule
  });
}));

// Delete network rule
router.delete('/rules/:ruleId', adminMiddleware, asyncHandler(async (req, res) => {
  const { ruleId } = req.params;

  const rule = await prisma.networkRule.findUnique({
    where: { id: ruleId }
  });

  if (!rule) {
    return res.status(404).json({ error: 'Network rule not found' });
  }

  await prisma.networkRule.delete({
    where: { id: ruleId }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'NETWORK_DELETE_RULE',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { ruleId, ruleName: rule.name }
    }
  });

  res.json({ message: 'Network rule deleted successfully' });
}));

// Get device traffic statistics
router.get('/traffic/:deviceId', asyncHandler(async (req, res) => {
  const { deviceId } = req.params;

  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      user: {
        select: { username: true, email: true }
      }
    }
  });

  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  try {
    const trafficStats = await getDeviceTrafficStats(device.ipAddress);
    
    res.json({
      device: {
        id: device.id,
        name: device.deviceName,
        macAddress: device.macAddress,
        ipAddress: device.ipAddress,
        user: device.user
      },
      traffic: trafficStats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get traffic statistics',
      message: error.message
    });
  }
}));

// Get real-time network monitoring data
router.get('/monitor', asyncHandler(async (req, res) => {
  try {
    const [
      connectedDevices,
      activeConnections,
      recentTraffic
    ] = await Promise.all([
      getConnectedDevices(),
      prisma.connection.findMany({
        where: { isActive: true },
        include: {
          device: true,
          user: {
            select: { username: true, email: true }
          }
        }
      }),
      prisma.connection.findMany({
        where: {
          startTime: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        },
        include: {
          device: true,
          user: {
            select: { username: true }
          }
        },
        orderBy: { startTime: 'desc' }
      })
    ]);

    res.json({
      connectedDevices,
      activeConnections,
      recentTraffic,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get monitoring data',
      message: error.message
    });
  }
}));

// Disconnect all devices (emergency)
router.post('/disconnect-all', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // Get all active devices
    const activeDevices = await prisma.device.findMany({
      where: { isActive: true }
    });

    // Remove all devices from whitelist
    const { removeDeviceFromWhitelist } = require('../services/networkService');
    
    for (const device of activeDevices) {
      try {
        await removeDeviceFromWhitelist(device.macAddress, device.ipAddress);
      } catch (error) {
        console.error(`Failed to remove device ${device.macAddress}:`, error);
      }
    }

    // Mark all devices as inactive
    await prisma.device.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // End all active connections
    await prisma.connection.updateMany({
      where: { isActive: true },
      data: {
        isActive: false,
        endTime: new Date()
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: 'NETWORK_DISCONNECT_ALL',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { disconnectedDevices: activeDevices.length }
      }
    });

    res.json({
      message: 'All devices disconnected successfully',
      disconnectedDevices: activeDevices.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to disconnect all devices',
      message: error.message
    });
  }
}));

module.exports = router;