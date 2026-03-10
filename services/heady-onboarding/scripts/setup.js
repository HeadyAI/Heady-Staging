const logger = require('../../../shared/logger')('setup');
#!/usr/bin/env node

logger.info('🚀 HeadyMe Onboarding Setup');
logger.info('============================\n');

// Check Node version
const nodeVersion = process.versions.node;
if (parseInt(nodeVersion.split('.')[0]) < 18) {
  logger.error('❌ Node.js 18 or higher is required');
  process.exit(1);
}

logger.info('✅ Node.js version:', nodeVersion);

// Check for .env file
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('.env')) {
  logger.info('⚠️  .env file not found. Creating from .env.example...');
  fs.copyFileSync('.env.example', '.env');
  logger.info('✅ Created .env file');
  logger.info('\n⚠️  IMPORTANT: Edit .env and add your credentials before continuing\n');
  process.exit(0);
}

logger.info('✅ .env file found');
logger.info('\n📦 Next steps:');
logger.info('1. Edit .env with your credentials');
logger.info('2. Run: npx prisma generate');
logger.info('3. Run: npx prisma db push');
logger.info('4. Run: npm run dev');
logger.info('\n🎉 Setup complete!');
