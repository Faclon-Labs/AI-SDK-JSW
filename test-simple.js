import { BruceHandler } from './connector-userid-ts/dist/index.js';

const BACKEND_CONFIG = {
  userId: '66792886ef26fb850db806c5',
  dataUrl: 'datads-ext.iosense.io',
  onPrem: false,
  tz: 'UTC'
};

const bruceHandler = new BruceHandler(BACKEND_CONFIG);

async function testConnection() {
  try {
    console.log('Testing connection with parameters:');
    console.log('- userId:', BACKEND_CONFIG.userId);
    console.log('- dataUrl:', BACKEND_CONFIG.dataUrl);
    console.log('- insightId: INS_a7bca70a5160');
    console.log('- date range: 2025-06-22 to 2025-06-23');
    
    const result = await bruceHandler.fetchInsightResults({
      insightId: 'IINS_a7bca70a5160',
      filter: { 
        startDate: '2025-06-22T00:00:00Z',
        endDate: '2025-06-23T23:59:59Z'
      },
      pagination: { page: 1, count: 10 },
    });
    
    console.log('Success! Results:', result.results.length);
    if (result.results.length > 0) {
      console.log('First result:', result.results[0]);
    } else {
      console.log('No results found for this date range. Trying without date filter...');
      
      // Try without date filter
      const resultNoFilter = await bruceHandler.fetchInsightResults({
        insightId: 'INS_a7bca70a5160',
        filter: {},
        pagination: { page: 1, count: 10 },
      });
      
      console.log('Results without date filter:', resultNoFilter.results.length);
      if (resultNoFilter.results.length > 0) {
        console.log('First result:', resultNoFilter.results[0]);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConnection(); 