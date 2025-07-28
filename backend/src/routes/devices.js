const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const { removeDeviceFromWhitelist } = require('../services/networkService');

const router = express.Router();
const prisma = new PrismaClient();

// Get user's devices
router.get('/', asyncHandler(async (req, res) => {
  const devices = await prisma.device.findMany({
    where: { userId: req.user.id },
    orderBy: { lastSeen: 'desc' }
  });

  res.json({ devices });
}));

// Get specific device details
router.get('/:deviceId', asyncHandler(async (req, res) => {
  const { deviceId } = req.params;

  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      userId: req.user.id
    },
    include: {
      connections: {
        orderBy: { startTime: 'desc' },
        take: 10
      }
    }
  });

  if (!device) {
    return res.status(404).json({
      error: 'Device not found'
    });
  }

  res.json({ device });
}));

// Update device name
router.put('/:deviceId', asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const { deviceName } = req.body;

  if (!deviceName || deviceName.trim().length === 0) {
    return res.status(400).json({
      error: 'Device name is required'
    });
  }

  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      userId: req.user.id
    }
  });

  if (!device) {
    return res.status(404).json({
      error: 'Device not found'
    });
  }

  const updatedDevice = await prisma.device.update({
    where: { id: deviceId },
    data: { deviceName: deviceName.trim() }
  });

  res.json({
    message: 'Device updated successfully',
    device: updatedDevice
  });
}));

// Disconnect device (remove from whitelist)
router.post('/:deviceId/disconnect', asyncHandler(async (req, res) => {
  const { deviceId } = req.params;

  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      userId: req.user.id
    }
  });

  if (!device) {
    return res.status(404).json({
      error: 'Device not found'
    });
  }

  // Remove from network whitelist
  try {
    await removeDeviceFromWhitelist(device.macAddress, device.ipAddress);
  } catch (error) {
    console.error('Failed to remove device from whitelist:', error);
  }

  // Mark device as inactive
  await prisma.device.update({
    where: { id: deviceId },
    data: { isActive: false }
  });

  // End active connections for this device
  await prisma.connection.updateMany({
    where: {
      deviceId,
      isActive: true
    },
    data: {
      isActive: false,
      endTime: new Date()
    }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'DEVICE_DISCONNECT',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        deviceId,
        macAddress: device.macAddress
      }
    }
  });

  res.json({
    message: 'Device disconnected successfully'
  });
}));

// Delete device permanently
router.delete('/:deviceId', asyncHandler(async (req, res) => {
  const { deviceId } = req.params;

  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      userId: req.user.id
    }
  });

  if (!device) {
    return res.status(404).json({
      error: 'Device not found'
    });
  }

  // Remove from network whitelist
  try {
    await removeDeviceFromWhitelist(device.macAddress, device.ipAddress);
  } catch (error) {
    console.error('Failed to remove device from whitelist:', error);
  }

  // Delete device and related connections
  await prisma.device.delete({
    where: { id: deviceId }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'DEVICE_DELETE',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        deviceId,
        macAddress: device.macAddress
      }
    }
  });

  res.json({
    message: 'Device deleted successfully'
  });
}));

// Get device connection history
router.get('/:deviceId/connections', asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Verify device belongs to user
  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      userId: req.user.id
    }
  });

  if (!device) {
    return res.status(404).json({
      error: 'Device not found'
    });
  }

  const [connections, total] = await Promise.all([
    prisma.connection.findMany({
      where: { deviceId },
      orderBy: { startTime: 'desc' },
      skip,
      take: limit
    }),
    prisma.connection.count({
      where: { deviceId }
    })
  ]);

  res.json({
    connections,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get device traffic statistics
router.get('/:deviceId/stats', asyncHandler(async (req, res) => {
  const { deviceId } = req.params;

  // Verify device belongs to user
  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      userId: req.user.id
    }
  });

  if (!device) {
    return res.status(404).json({
      error: 'Device not found'
    });
  }

  const stats = await prisma.connection.aggregate({
    where: { deviceId },
    _sum: {
      bytesDownload: true,
      bytesUpload: true
    },
    _count: true,
    _avg: {
      bytesDownload: true,
      bytesUpload: true
    }
  });

  // Get daily usage for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyUsage = await prisma.connection.groupBy({
    by: ['startTime'],
    where: {
      deviceId,
      startTime: {
        gte: thirtyDaysAgo
      }
    },
    _sum: {
      bytesDownload: true,
      bytesUpload: true
    }
  });

  res.json({
    totalUsage: {
      download: stats._sum.bytesDownload || 0,
      upload: stats._sum.bytesUpload || 0
    },
    averageUsage: {
      download: stats._avg.bytesDownload || 0,
      upload: stats._avg.bytesUpload || 0
    },
    totalConnections: stats._count,
    dailyUsage
  });
}));

module.exports = router;