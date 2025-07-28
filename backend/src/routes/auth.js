const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, loginSchema, refreshTokenSchema } = require('../utils/validation');
const { generateTokens, verifyRefreshToken, comparePassword } = require('../utils/auth');
const { getDeviceInfo, addDeviceToWhitelist } = require('../services/networkService');

const router = express.Router();
const prisma = new PrismaClient();

// Login endpoint
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { login, password } = req.body;
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent');

  // Find user by email or username
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: login },
        { username: login }
      ],
      isActive: true
    }
  });

  if (!user) {
    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }

  // Check password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }

  // Get device information
  const deviceInfo = await getDeviceInfo(req);
  
  // Check if user has reached device limit
  const activeDevicesCount = await prisma.device.count({
    where: {
      userId: user.id,
      isActive: true
    }
  });

  const maxDevices = parseInt(process.env.MAX_DEVICES_PER_USER) || 4;
  
  // Check if this device is already registered
  let device = await prisma.device.findUnique({
    where: { macAddress: deviceInfo.macAddress }
  });

  if (!device && activeDevicesCount >= maxDevices) {
    return res.status(403).json({
      error: `Device limit reached. Maximum ${maxDevices} devices allowed per user.`,
      activeDevices: activeDevicesCount,
      maxDevices
    });
  }

  // Create or update device
  if (!device) {
    device = await prisma.device.create({
      data: {
        macAddress: deviceInfo.macAddress,
        ipAddress: clientIP,
        deviceName: deviceInfo.deviceName,
        userAgent,
        userId: user.id,
        lastSeen: new Date()
      }
    });
  } else {
    // Update existing device
    device = await prisma.device.update({
      where: { id: device.id },
      data: {
        ipAddress: clientIP,
        userAgent,
        lastSeen: new Date(),
        isActive: true
      }
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.session.create({
    data: {
      refreshToken,
      userId: user.id,
      expiresAt
    }
  });

  // Add device to network whitelist
  try {
    await addDeviceToWhitelist(deviceInfo.macAddress, clientIP);
  } catch (error) {
    console.error('Failed to add device to whitelist:', error);
  }

  // Create connection record
  await prisma.connection.create({
    data: {
      userId: user.id,
      deviceId: device.id,
      ipAddress: clientIP
    }
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'LOGIN',
      userId: user.id,
      ipAddress: clientIP,
      userAgent,
      details: {
        deviceId: device.id,
        macAddress: deviceInfo.macAddress
      }
    }
  });

  res.json({
    message: 'Login successful',
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin
    },
    device: {
      id: device.id,
      name: device.deviceName,
      macAddress: device.macAddress
    }
  });
}));

// Refresh token endpoint
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  // Find and validate refresh token in database
  const session = await prisma.session.findUnique({
    where: { 
      refreshToken,
      isActive: true,
      expiresAt: {
        gt: new Date()
      }
    },
    include: { user: true }
  });

  if (!session) {
    return res.status(401).json({
      error: 'Invalid or expired refresh token'
    });
  }

  // Verify JWT refresh token
  try {
    verifyRefreshToken(refreshToken);
  } catch (error) {
    // Deactivate the session
    await prisma.session.update({
      where: { id: session.id },
      data: { isActive: false }
    });

    return res.status(401).json({
      error: 'Invalid refresh token'
    });
  }

  // Check if user is still active
  if (!session.user.isActive) {
    return res.status(401).json({
      error: 'User account is inactive'
    });
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(session.user.id);

  // Update session with new refresh token
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt
    }
  });

  res.json({
    accessToken,
    refreshToken: newRefreshToken
  });
}));

// Logout endpoint
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.header('Authorization');
  const refreshToken = req.body.refreshToken;

  // Deactivate refresh token session if provided
  if (refreshToken) {
    await prisma.session.updateMany({
      where: { refreshToken },
      data: { isActive: false }
    });
  }

  // If we have an access token, log the logout
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (user) {
        // Log audit event
        await prisma.auditLog.create({
          data: {
            action: 'LOGOUT',
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        });
      }
    } catch (error) {
      // Ignore token verification errors during logout
    }
  }

  res.json({ message: 'Logout successful' });
}));

// Check authentication status
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user
    });
  } catch (error) {
    res.status(401).json({ authenticated: false });
  }
}));

module.exports = router;