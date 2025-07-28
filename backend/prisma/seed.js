const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@accessmanager.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      username: 'admin',
      password: hashedAdminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isAdmin: true,
      isActive: true
    }
  });

  console.log(`Admin user created/updated: ${admin.email}`);

  // Create sample regular user
  const sampleUserPassword = await bcrypt.hash('User@123456', 12);
  
  const sampleUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'testuser',
      password: sampleUserPassword,
      firstName: 'Test',
      lastName: 'User',
      isAdmin: false,
      isActive: true
    }
  });

  console.log(`Sample user created/updated: ${sampleUser.email}`);

  // Create default system configuration
  const defaultConfigs = [
    {
      key: 'MAX_DEVICES_PER_USER',
      value: '4',
      description: 'Maximum number of devices allowed per user',
      isEditable: true
    },
    {
      key: 'SESSION_TIMEOUT_MINUTES',
      value: '15',
      description: 'Session timeout in minutes',
      isEditable: true
    },
    {
      key: 'CAPTIVE_PORTAL_ENABLED',
      value: 'true',
      description: 'Enable captive portal functionality',
      isEditable: true
    },
    {
      key: 'AUTO_DISCONNECT_INACTIVE_DEVICES',
      value: 'true',
      description: 'Automatically disconnect inactive devices',
      isEditable: true
    },
    {
      key: 'INACTIVE_DEVICE_TIMEOUT_HOURS',
      value: '24',
      description: 'Hours after which inactive devices are disconnected',
      isEditable: true
    },
    {
      key: 'ALLOW_DEVICE_REGISTRATION',
      value: 'true',
      description: 'Allow new device registration',
      isEditable: true
    },
    {
      key: 'REQUIRE_ADMIN_APPROVAL',
      value: 'false',
      description: 'Require admin approval for new users',
      isEditable: true
    }
  ];

  for (const config of defaultConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config
    });
  }

  console.log('Default system configuration created');

  // Create default network rules
  const defaultNetworkRules = [
    {
      name: 'Allow DNS',
      description: 'Allow DNS traffic for all devices',
      ruleType: 'ALLOW',
      target: 'udp:53',
      priority: 10,
      isActive: true
    },
    {
      name: 'Allow HTTPS',
      description: 'Allow HTTPS traffic for whitelisted devices',
      ruleType: 'ALLOW',
      target: 'tcp:443',
      priority: 20,
      isActive: true
    },
    {
      name: 'Allow HTTP',
      description: 'Allow HTTP traffic for whitelisted devices',
      ruleType: 'ALLOW',
      target: 'tcp:80',
      priority: 30,
      isActive: true
    },
    {
      name: 'Block Social Media',
      description: 'Block access to social media sites',
      ruleType: 'BLOCK',
      target: 'facebook.com,twitter.com,instagram.com',
      priority: 50,
      isActive: false
    }
  ];

  for (const rule of defaultNetworkRules) {
    await prisma.networkRule.upsert({
      where: { name: rule.name },
      update: {},
      create: rule
    });
  }

  console.log('Default network rules created');

  // Create audit log for seeding
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SEED',
      userId: admin.id,
      details: {
        message: 'Database seeded with initial data',
        timestamp: new Date().toISOString()
      }
    }
  });

  console.log('Database seeding completed successfully!');
  console.log('\nDefault credentials:');
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`Test User: user@example.com / User@123456`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });