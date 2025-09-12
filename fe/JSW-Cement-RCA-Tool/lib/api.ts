// API service for connecting with the backend
import { BruceHandler } from '../../../connector-userid-ts/dist/index.js';

// Configuration for the backend connection
const BACKEND_CONFIG = {
  userId: '66792886ef26fb850db806c5', // Hardcoded user ID
  dataUrl: 'datads-ext.iosense.io', // Correct data URL
  onPrem: false,
  tz: 'Asia/Kolkata' // Use Asia/Kolkata timezone
};

// Initialize the BruceHandler
let bruceHandler: BruceHandler | null = null;

try {
  console.log('Initializing BruceHandler with config:', BACKEND_CONFIG);
  bruceHandler = new BruceHandler(BACKEND_CONFIG);
  console.log('BruceHandler initialized successfully');
} catch (error) {
  console.error('Failed to initialize BruceHandler:', error);
}

// TimeRange interface to match the TimeRangePicker
export interface TimeRange {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

// Fetch all insight results (without date filter to get all available data)
export async function fetchAllInsightResults() {
  if (!bruceHandler) {
    throw new Error('BruceHandler not initialized');
  }

  const insightId = 'INS_a7bca70a5160';
  console.log('Fetching all insight results for insight ID:', insightId);
  
  try {
    const result = await bruceHandler.fetchInsightResults({
      insightId,
      filter: {}, // No date filter to get all results
      pagination: { page: 1, count: 50 }, // Get more results
    });
    console.log('API response:', result);
    console.log('Number of results returned:', result.results?.length || 0);
    return result.results;
  } catch (error) {
    console.error('Error fetching insight results:', error);
    // Add more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

// Fetch insight results for a given time range
export async function fetchInsightResultsByTimeRange(timeRange: TimeRange) {
  if (!bruceHandler) {
    throw new Error('BruceHandler not initialized');
  }

  const insightId = 'INS_a7bca70a5160';
  console.log('Fetching insight results for time range:', timeRange);
  
  // Pass IST times as-is (query_time values are already in correct format)
  const startDateTime = `${timeRange.startDate}T${timeRange.startTime}:00.000`;
  const endDateTime = `${timeRange.endDate}T${timeRange.endTime}:59.999`;
  
  try {
    const result = await bruceHandler.fetchInsightResults({
      insightId,
      filter: { 
        startDate: startDateTime,
        endDate: endDateTime
      },
      pagination: { page: 1, count: 50 },
    });
    console.log('Time range API response:', result);
    console.log('Number of results returned:', result.results?.length || 0);
    return result.results;
  } catch (error) {
    console.error('Error fetching insight results with time range:', error);
    // Add more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

// Fetch insight results for a given date range (legacy function)
export async function fetchInsightResults({ startDate, endDate }: { startDate: string; endDate: string }) {
  if (!bruceHandler) {
    throw new Error('BruceHandler not initialized');
  }

  const insightId = 'INS_a7bca70a5160';
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