const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, updateUserSchema, changePasswordSchema } = require('../utils/validation');
const { hashPassword, comparePassword } = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.json({ user });
}));

// Update user profile
router.put('/profile', validate(updateUserSchema), asyncHandler(async (req, res) => {
  const { email, firstName, lastName } = req.body;

  // Check if email is already taken by another user
  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: req.user.id }
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email is already taken'
      });
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(email && { email }),
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName })
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      updatedAt: true
    }
  });

  res.json({
    message: 'Profile updated successfully',
    user: updatedUser
  });
}));

// Change password
router.put('/change-password', validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get current user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  // Verify current password
  const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      error: 'Current password is incorrect'
    });
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedNewPassword }
  });

  // Invalidate all user sessions
  await prisma.session.updateMany({
    where: { userId: req.user.id },
    data: { isActive: false }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'PASSWORD_CHANGE',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  res.json({
    message: 'Password changed successfully. Please log in again.'
  });
}));

// Get user devices
router.get('/devices', asyncHandler(async (req, res) => {
  const devices = await prisma.device.findMany({
    where: { userId: req.user.id },
    orderBy: { lastSeen: 'desc' },
    select: {
      id: true,
      macAddress: true,
      ipAddress: true,
      deviceName: true,
      isActive: true,
      lastSeen: true,
      createdAt: true
    }
  });

  res.json({ devices });
}));

// Get user connections/sessions
router.get('/connections', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [connections, total] = await Promise.all([
    prisma.connection.findMany({
      where: { userId: req.user.id },
      include: {
        device: {
          select: {
            deviceName: true,
            macAddress: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      skip,
      take: limit
    }),
    prisma.connection.count({
      where: { userId: req.user.id }
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

// Get user statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [
    totalDevices,
    activeDevices,
    totalConnections,
    activeConnections,
    totalDataUsage
  ] = await Promise.all([
    prisma.device.count({
      where: { userId }
    }),
    prisma.device.count({
      where: { userId, isActive: true }
    }),
    prisma.connection.count({
      where: { userId }
    }),
    prisma.connection.count({
      where: { userId, isActive: true }
    }),
    prisma.connection.aggregate({
      where: { userId },
      _sum: {
        bytesDownload: true,
        bytesUpload: true
      }
    })
  ]);

  // Get recent connections for activity chart
  const recentConnections = await prisma.connection.groupBy({
    by: ['startTime'],
    where: {
      userId,
      startTime: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    _count: true
  });

  res.json({
    totalDevices,
    activeDevices,
    totalConnections,
    activeConnections,
    totalDataUsage: {
      download: totalDataUsage._sum.bytesDownload || 0,
      upload: totalDataUsage._sum.bytesUpload || 0
    },
    recentActivity: recentConnections
  });
}));

module.exports = router;