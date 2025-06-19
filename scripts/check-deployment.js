#!/usr/bin/env node

/**
 * Deployment Check Script
 * Verifies that the application is ready for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking deployment readiness...\n');

// Check required files
const requiredFiles = [
  'vercel.json',
  '.vercelignore',
  'package.json',
  'server/index.js',
  'server/config/config.js',
  '.env.example'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

// Check package.json scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['start', 'build'];

console.log('\n📦 Checking package.json scripts:');
requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`✅ ${script} script exists`);
  } else {
    console.log(`❌ ${script} script missing`);
    allFilesExist = false;
  }
});

// Check vercel.json configuration
console.log('\n⚙️ Checking vercel.json configuration:');
try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.builds && vercelConfig.builds.length > 0) {
    console.log('✅ Build configuration exists');
  } else {
    console.log('❌ Build configuration missing');
    allFilesExist = false;
  }
  
  if (vercelConfig.routes && vercelConfig.routes.length > 0) {
    console.log('✅ Route configuration exists');
  } else {
    console.log('❌ Route configuration missing');
    allFilesExist = false;
  }
} catch (error) {
  console.log('❌ Invalid vercel.json format');
  allFilesExist = false;
}

// Check environment variables
console.log('\n🔐 Environment variables to set in Vercel:');
const envVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'GOOGLE_REFRESH_TOKEN',
  'SESSION_SECRET',
  'NODE_ENV'
];

envVars.forEach(envVar => {
  console.log(`📝 ${envVar}`);
});

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('🎉 Deployment check passed! Ready for Vercel deployment.');
  console.log('\nNext steps:');
  console.log('1. Push code to GitHub');
  console.log('2. Connect repository to Vercel');
  console.log('3. Set environment variables in Vercel dashboard');
  console.log('4. Deploy!');
} else {
  console.log('❌ Deployment check failed. Please fix the issues above.');
  process.exit(1);
}
