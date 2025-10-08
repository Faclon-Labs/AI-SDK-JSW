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
  bruceHandler = new BruceHandler(BACKEND_CONFIG);
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

// Retry mechanism with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retry attempts failed');
}

// Fetch all insight results (without date filter to get all available data)
export async function fetchAllInsightResults() {
  if (!bruceHandler) {
    throw new Error('BruceHandler not initialized');
  }

  const insightId = 'INS_a7bca70a5160';
  
  return retryWithBackoff(async () => {
    try {
      const result = await bruceHandler.fetchInsightResults({
        insightId,
        filter: {}, // No date filter to get all results
        pagination: { page: 1, count: 1000 }, // Get more results
      });
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
  });
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
  
  return retryWithBackoff(async () => {
    try {
      const result = await bruceHandler.fetchInsightResults({
        insightId,
        filter: { 
          startDate: startDateTime,
          endDate: endDateTime
        },
        pagination: { page: 1, count: 1000 },
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
  });
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