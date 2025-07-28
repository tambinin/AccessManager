const Joi = require('joi');

// User validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': 'Username can only contain letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username cannot exceed 30 characters',
    'any.required': 'Username is required'
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    'any.required': 'Password is required'
  }),
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional()
});

const loginSchema = Joi.object({
  login: Joi.string().required().messages({
    'any.required': 'Email or username is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
});

// Device validation schemas
const deviceSchema = Joi.object({
  macAddress: Joi.string().pattern(new RegExp('^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')).required().messages({
    'string.pattern.base': 'Invalid MAC address format',
    'any.required': 'MAC address is required'
  }),
  deviceName: Joi.string().max(100).optional(),
  ipAddress: Joi.string().ip().optional()
});

// User update validation schemas
const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'New password must be at least 8 characters long',
    'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    'any.required': 'New password is required'
  })
});

// Admin validation schemas
const adminCreateUserSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).optional(),
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional(),
  isAdmin: Joi.boolean().default(false)
});

const adminUpdateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional(),
  isActive: Joi.boolean().optional(),
  isAdmin: Joi.boolean().optional()
});

// Network rule validation schemas
const networkRuleSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).optional(),
  ruleType: Joi.string().valid('ALLOW', 'BLOCK', 'REDIRECT').required(),
  target: Joi.string().required(), // IP, MAC, or subnet
  priority: Joi.number().integer().min(1).max(1000).default(100)
});

// System config validation schemas
const systemConfigSchema = Joi.object({
  key: Joi.string().max(100).required(),
  value: Joi.string().required(),
  description: Joi.string().max(500).optional()
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  deviceSchema,
  updateUserSchema,
  changePasswordSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  networkRuleSchema,
  systemConfigSchema
};