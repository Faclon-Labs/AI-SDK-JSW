// Test script for BruceHandler connection
const { BruceHandler } = require('../../connector-userid-ts/dist/index.js');

// Configuration for the backend connection
const BACKEND_CONFIG = {
  userId: '66792886ef26fb850db806c5',
  dataUrl: 'datads-ext.iosense.io',
  onPrem: false,
  tz: 'Asia/Kolkata'
};

async function testBruceHandler() {
  try {
    console.log('Testing BruceHandler connection...');
    console.log('Config:', BACKEND_CONFIG);
    
    // Initialize the BruceHandler
    const bruceHandler = new BruceHandler(BACKEND_CONFIG);
    console.log('BruceHandler initialized successfully');
    console.log('Version:', bruceHandler.version);
    
    // Test fetching user insights first
    console.log('\nTesting fetchUserInsights...');
    const userInsights = await bruceHandler.fetchUserInsights();
    console.log('User insights fetched successfully');
    console.log('Number of insights:', userInsights.length);
    
    // Test fetching insight results
    console.log('\nTesting fetchInsightResults...');
    const insightId = 'INS_a7bca70a5160';
    const result = await bruceHandler.fetchInsightResults({
      insightId,
      filter: {},
      pagination: { page: 1, count: 10 }
    });
    
    console.log('Insight results fetched successfully');
    console.log('Result structure:', Object.keys(result));
    console.log('Number of results:', result.results?.length || 0);
    console.log('Total count:', result.totalCount);
    
    if (result.results && result.results.length > 0) {
      console.log('\nFirst result sample:');
      console.log(JSON.stringify(result.results[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error testing BruceHandler:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testBruceHandler();
