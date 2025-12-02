const jwt = require('jsonwebtoken');

// License tiers and their limits
const LICENSE_TIERS = {
  FREE: {
    name: 'Free',
    maxProducts: 100,
    maxEmployees: 10,
    features: ['basic_inventory', 'email_notifications']
  },
  PROFESSIONAL: {
    name: 'Professional',
    maxProducts: -1, // unlimited
    maxEmployees: -1, // unlimited
    features: ['basic_inventory', 'email_notifications', 'microsoft_integration', 'advanced_reporting', 'api_access']
  },
  ENTERPRISE: {
    name: 'Enterprise',
    maxProducts: -1,
    maxEmployees: -1,
    features: ['basic_inventory', 'email_notifications', 'microsoft_integration', 'advanced_reporting', 'api_access', 'multi_tenant', 'white_label', 'custom_integrations']
  }
};

// License validation middleware
const validateLicense = (requiredFeature = null) => {
  return (req, res, next) => {
    try {
      // Extract license from header or database (based on user)
      const licenseKey = req.headers['x-license-key'] || req.user?.licenseKey;

      if (!licenseKey) {
        return res.status(402).json({
          message: 'License key required',
          code: 'LICENSE_REQUIRED',
          upgradeUrl: 'https://planningbord.com/pricing'
        });
      }

      // Decode and validate license
      const decoded = jwt.verify(licenseKey, process.env.LICENSE_SECRET || 'default-secret');

      const tier = LICENSE_TIERS[decoded.tier];
      if (!tier) {
        return res.status(402).json({
          message: 'Invalid license tier',
          code: 'INVALID_LICENSE_TIER'
        });
      }

      // Check expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        return res.status(402).json({
          message: 'License expired',
          code: 'LICENSE_EXPIRED',
          renewalUrl: 'https://planningbord.com/billing'
        });
      }

      // Check feature access
      if (requiredFeature && !tier.features.includes(requiredFeature)) {
        return res.status(402).json({
          message: `Feature '${requiredFeature}' not available in ${tier.name} tier`,
          code: 'FEATURE_NOT_AVAILABLE',
          upgradeUrl: 'https://planningbord.com/pricing'
        });
      }

      // Add license info to request
      req.license = {
        tier: decoded.tier,
        limits: tier,
        features: tier.features
      };

      next();
    } catch (error) {
      return res.status(402).json({
        message: 'Invalid license key',
        code: 'INVALID_LICENSE'
      });
    }
  };
};

// Usage limit checker
const checkUsageLimits = (resourceType) => {
  return async (req, res, next) => {
    const { license, user } = req;

    if (license.tier === 'ENTERPRISE') {
      return next(); // No limits for enterprise
    }

    try {
      // Get current usage from database
      const usage = await getCurrentUsage(user.id, resourceType);

      const limit = license.limits[`max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`];

      if (limit !== -1 && usage >= limit) {
        return res.status(402).json({
          message: `${resourceType} limit exceeded for ${license.limits.name} tier`,
          code: 'USAGE_LIMIT_EXCEEDED',
          currentUsage: usage,
          limit: limit,
          upgradeUrl: 'https://planningbord.com/pricing'
        });
      }

      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      next(); // Allow request to proceed on error
    }
  };
};

// Helper function to get current usage
async function getCurrentUsage(userId, resourceType) {
  // This would query your database to get current usage
  // For now, return mock data
  const mockUsage = {
    products: 50,
    employees: 5
  };

  return mockUsage[resourceType] || 0;
}

module.exports = {
  validateLicense,
  checkUsageLimits,
  LICENSE_TIERS
};
