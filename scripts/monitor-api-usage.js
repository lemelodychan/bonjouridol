#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const REPOSITORY_NAME = process.env.REPO_NAME || 'bonjouridol';
const ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN;
const LOG_FILE = path.join(__dirname, '..', 'api-usage.log');

// API usage tracking
let apiCallCount = 0;
let startTime = Date.now();

// Helper function to log API usage
function logApiUsage(endpoint, method = 'GET') {
  apiCallCount++;
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | ${method} | ${endpoint} | Call #${apiCallCount}\n`;
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logEntry);
  
  // Console output for monitoring
  console.log(`📊 API Call #${apiCallCount}: ${method} ${endpoint}`);
  
  // Warning if approaching limits
  if (apiCallCount >= 900) {
    console.warn(`⚠️  WARNING: Approaching API call limit (${apiCallCount}/1000)`);
  }
  
  if (apiCallCount >= 1000) {
    console.error(`❌ ERROR: API call limit exceeded (${apiCallCount})`);
    throw new Error('API call limit exceeded');
  }
}

// Helper function to get usage summary
function getUsageSummary() {
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000; // seconds
  const callsPerSecond = apiCallCount / duration;
  
  return {
    totalCalls: apiCallCount,
    duration: duration,
    callsPerSecond: callsPerSecond,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString()
  };
}

// Helper function to create a monitored Prismic client
function createMonitoredClient() {
  const { createClient } = require('@prismicio/client');
  
  const client = createClient(REPOSITORY_NAME, {
    accessToken: ACCESS_TOKEN,
  });
  
  // Wrap the client methods to track API calls
  const originalGetByType = client.getByType.bind(client);
  const originalGetByUID = client.getByUID.bind(client);
  const originalGetAllByType = client.getAllByType.bind(client);
  const originalGetSingle = client.getSingle.bind(client);
  
  client.getByType = async function(...args) {
    logApiUsage('/api/v2/documents/search', 'GET');
    return originalGetByType(...args);
  };
  
  client.getByUID = async function(...args) {
    logApiUsage('/api/v2/documents/search', 'GET');
    return originalGetByUID(...args);
  };
  
  client.getAllByType = async function(...args) {
    logApiUsage('/api/v2/documents/search', 'GET');
    return originalGetAllByType(...args);
  };
  
  client.getSingle = async function(...args) {
    logApiUsage('/api/v2/documents/search', 'GET');
    return originalGetSingle(...args);
  };
  
  return client;
}

// Helper function to analyze log file
function analyzeLogFile() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('📝 No API usage log found');
    return;
  }
  
  const logContent = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = logContent.trim().split('\n');
  
  console.log('\n📊 API Usage Analysis');
  console.log('====================');
  console.log(`Total API calls logged: ${lines.length}`);
  
  if (lines.length > 0) {
    const firstCall = lines[0].split(' | ')[0];
    const lastCall = lines[lines.length - 1].split(' | ')[0];
    console.log(`First call: ${firstCall}`);
    console.log(`Last call: ${lastCall}`);
    
    // Count calls by endpoint
    const endpointCounts = {};
    lines.forEach(line => {
      const parts = line.split(' | ');
      if (parts.length >= 3) {
        const endpoint = parts[2];
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
      }
    });
    
    console.log('\n📈 Calls by endpoint:');
    Object.entries(endpointCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([endpoint, count]) => {
        console.log(`  ${endpoint}: ${count} calls`);
      });
  }
}

// Main monitoring function
async function monitorApiUsage() {
  try {
    if (!ACCESS_TOKEN) {
      console.error('❌ PRISMIC_ACCESS_TOKEN environment variable is required');
      process.exit(1);
    }
    
    console.log('🔍 Prismic API Usage Monitor');
    console.log('============================');
    console.log(`Repository: ${REPOSITORY_NAME}`);
    console.log(`Log file: ${LOG_FILE}`);
    console.log(`Start time: ${new Date(startTime).toISOString()}`);
    console.log('');
    
    // Create monitored client
    const client = createMonitoredClient();
    
    // Test connection
    console.log('🔗 Testing API connection...');
    await client.getByType('*', { pageSize: 1 });
    
    console.log('✅ API monitoring initialized successfully');
    console.log('📝 API calls will be logged to:', LOG_FILE);
    console.log('⚠️  Monitoring will stop at 1000 API calls');
    console.log('');
    
    // Return the monitored client for use in other scripts
    return client;
    
  } catch (error) {
    console.error('❌ Failed to initialize API monitoring:', error.message);
    process.exit(1);
  }
}

// Export functions for use in other scripts
module.exports = {
  monitorApiUsage,
  createMonitoredClient,
  logApiUsage,
  getUsageSummary,
  analyzeLogFile
};

// Run analysis if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'analyze') {
    analyzeLogFile();
  } else if (command === 'monitor') {
    monitorApiUsage();
  } else {
    console.log('Usage:');
    console.log('  node monitor-api-usage.js monitor  - Start monitoring API calls');
    console.log('  node monitor-api-usage.js analyze  - Analyze existing log file');
  }
}
