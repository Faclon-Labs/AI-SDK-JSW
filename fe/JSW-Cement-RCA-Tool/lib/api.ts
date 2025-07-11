// API service for connecting with the backend
import { BruceHandler } from '../../../connector-userid-ts/dist/index.js';

// Configuration for the backend connection
const BACKEND_CONFIG = {
  userId: '66792886ef26fb850db806c5', // Hardcoded user ID
  dataUrl: 'datads-ext.iosense.io', // Correct data URL
  onPrem: false,
  tz: 'UTC'
};

// Initialize the BruceHandler
const bruceHandler = new BruceHandler(BACKEND_CONFIG);

// Fetch all insight results (without date filter to get all available data)
export async function fetchAllInsightResults() {
  const insightId = 'INS_015ce0dcf91c';
  try {
    const result = await bruceHandler.fetchInsightResults({
      insightId,
      filter: {}, // No date filter to get all results
      pagination: { page: 1, count: 50 }, // Get more results
    });
    return result.results;
  } catch (error) {
    console.error('Error fetching insight results:', error);
    throw error;
  }
}

// Fetch insight results for a given date range
export async function fetchInsightResults({ startDate, endDate }) {
  const insightId = 'INS_015ce0dcf91c';
  try {
    const result = await bruceHandler.fetchInsightResults({
      insightId,
      filter: { startDate, endDate },
      pagination: { page: 1, count: 10 },
    });
    return result.results;
  } catch (error) {
    console.error('Error fetching insight results:', error);
    throw error;
  }
} 