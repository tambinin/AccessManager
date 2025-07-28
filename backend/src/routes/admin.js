const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const { adminMiddleware } = require('../middleware/auth');
const { validate, adminCreateUserSchema, adminUpdateUserSchema } = require('../utils/validation');
const { hashPassword, generateRandomPassword } = require('../utils/auth');
const { removeDeviceFromWhitelist } = require('../services/networkService');

const router = express.Router();
const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// Get dashboard statistics
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalDevices,
    activeDevices,
    totalConnections,
    activeConnections,
    recentLogins
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.device.count(),
    prisma.device.count({ where: { isActive: true } }),
    prisma.connection.count(),
    prisma.connection.count({ where: { isActive: true } }),
    prisma.auditLog.findMany({
      where: { action: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { username: true, email: true } } }
    })
  ]);

  // Get user registrations over time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const userRegistrations = await prisma.user.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: { gte: thirtyDaysAgo }
    },
    _count: true
  });

  // Get connection statistics over time
  const connectionStats = await prisma.connection.groupBy({
    by: ['startTime'],
    where: {
      startTime: { gte: thirtyDaysAgo }
    },
    _count: true,
    _sum: {
      bytesDownload: true,
      bytesUpload: true
    }
  });

  res.json({
    overview: {
      totalUsers,
      activeUsers,
      totalDevices,
      activeDevices,
      totalConnections,
      activeConnections
    },
    recentLogins,
    userRegistrations,
    connectionStats
  });
}));

// Get all users with pagination
router.get('/users', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const status = req.query.status; // 'active', 'inactive', or undefined for all
  const skip = (page - 1) * limit;

  const whereClause = {
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    }),
    ...(status && { isActive: status === 'active' })
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            devices: true,
            sessions: { where: { isActive: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.user.count({ where: whereClause })
  ]);

  res.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get specific user details
router.get('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      devices: {
        orderBy: { lastSeen: 'desc' }
      },
      sessions: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      },
      connections: {
        orderBy: { startTime: 'desc' },
        take: 10,
        include: {
          device: { select: { deviceName: true, macAddress: true } }
        }
      }
    }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
}));

// Create new user
router.post('/users', validate(adminCreateUserSchema), asyncHandler(async (req, res) => {
  const { email, username, password, firstName, lastName, isAdmin } = req.body;

  // Check if email or username already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }]
    }
  });

  if (existingUser) {
    return res.status(409).json({
      error: existingUser.email === email ? 'Email already exists' : 'Username already exists'
    });
  }

  // Generate password if not provided
  const userPassword = password || generateRandomPassword();
  const hashedPassword = await hashPassword(userPassword);

  const newUser = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
      isAdmin: isAdmin || false
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      isActive: true,
      isAdmin: true,
      createdAt: true
    }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_CREATE_USER',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        createdUserId: newUser.id,
        createdUserEmail: newUser.email
      }
    }
  });

  res.status(201).json({
    message: 'User created successfully',
    user: newUser,
    ...(password ? {} : { generatedPassword: userPassword })
  });
}));

// Update user
router.put('/users/:userId', validate(adminUpdateUserSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { email, username, firstName, lastName, isActive, isAdmin } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!existingUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if email or username conflicts with other users
  if (email || username) {
    const conflictUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(username ? [{ username }] : [])
        ],
        id: { not: userId }
      }
    });

    if (conflictUser) {
      return res.status(409).json({
        error: conflictUser.email === email ? 'Email already exists' : 'Username already exists'
      });
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(email && { email }),
      ...(username && { username }),
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(isActive !== undefined && { isActive }),
      ...(isAdmin !== undefined && { isAdmin })
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      isActive: true,
      isAdmin: true,
      updatedAt: true
    }
  });

  // If user is deactivated, invalidate all sessions and disconnect devices
  if (isActive === false) {
    await prisma.session.updateMany({
      where: { userId },
      data: { isActive: false }
    });

    // Get user devices and remove from whitelist
    const devices = await prisma.device.findMany({
      where: { userId, isActive: true }
    });

    for (const device of devices) {
      try {
        await removeDeviceFromWhitelist(device.macAddress, device.ipAddress);
      } catch (error) {
        console.error('Failed to remove device from whitelist:', error);
      }
    }

    await prisma.device.updateMany({
      where: { userId },
      data: { isActive: false }
    });

    await prisma.connection.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endTime: new Date() }
    });
  }

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_UPDATE_USER',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        updatedUserId: userId,
        changes: req.body
      }
    }
  });

  res.json({
    message: 'User updated successfully',
    user: updatedUser
  });
}));

// Delete user
router.delete('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Prevent admin from deleting themselves
  if (userId === req.user.id) {
    return res.status(400).json({
      error: 'Cannot delete your own account'
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { devices: true }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Remove devices from whitelist
  for (const device of user.devices) {
    try {
      await removeDeviceFromWhitelist(device.macAddress, device.ipAddress);
    } catch (error) {
      console.error('Failed to remove device from whitelist:', error);
    }
  }

  // Delete user and all related data
  await prisma.user.delete({
    where: { id: userId }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_DELETE_USER',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        deletedUserId: userId,
        deletedUserEmail: user.email
      }
    }
  });

  res.json({ message: 'User deleted successfully' });
}));

// Reset user password
router.post('/users/:userId/reset-password', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const newPassword = generateRandomPassword();
  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  // Invalidate all user sessions
  await prisma.session.updateMany({
    where: { userId },
    data: { isActive: false }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_RESET_PASSWORD',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        targetUserId: userId,
        targetUserEmail: user.email
      }
    }
  });

  res.json({
    message: 'Password reset successfully',
    newPassword
  });
}));

// Get audit logs
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const action = req.query.action;
  const userId = req.query.userId;
  const skip = (page - 1) * limit;

  const whereClause = {
    ...(action && { action }),
    ...(userId && { userId })
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: { username: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.auditLog.count({ where: whereClause })
  ]);

  res.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get system configuration
router.get('/config', asyncHandler(async (req, res) => {
  const config = await prisma.systemConfig.findMany({
    orderBy: { key: 'asc' }
  });

  res.json({ config });
}));

// Update system configuration
router.put('/config/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!value) {
    return res.status(400).json({ error: 'Value is required' });
  }

  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: {
      key,
      value,
      description: `Configuration for ${key}`
    }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_UPDATE_CONFIG',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        configKey: key,
        newValue: value
      }
    }
  });

  res.json({
    message: 'Configuration updated successfully',
    config
  });
}));

module.exports = router;