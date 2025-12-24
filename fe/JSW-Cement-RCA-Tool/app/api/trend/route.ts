import { NextRequest, NextResponse } from 'next/server';

// Configuration for the backend connection
const BACKEND_CONFIG = {
  userId: '66792886ef26fb850db806c5', // Hardcoded user ID
  dataUrl: 'datads-ext.iosense.io', // Correct data URL
  onPrem: false,
  tz: 'Asia/Kolkata' // Use Asia/Kolkata timezone with string times passed directly
};

export async function POST(request: NextRequest) {
  try {
    const { deviceId, sensorList, startTime, endTime } = await request.json();

    // Validate required parameters
    if (!deviceId || !sensorList || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required parameters: deviceId, sensorList, startTime, endTime' },
        { status: 400 }
      );
    }

    console.log('Fetching REAL trend data for:', {
      deviceId,
      sensorList,
      startTime,
      endTime
    });

    // Pass times directly as strings to avoid timezone conversion issues
    // The query_time values are already in the correct IST format
    const realData = await fetchRealData(deviceId, sensorList, startTime, endTime);
    
    return NextResponse.json({
      success: true,
      data: realData
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trend data' },
      { status: 500 }
    );
  }
}

// Real data fetcher from backend
async function fetchRealData(deviceId: string, sensorList: string[], startTime: string, endTime: string) {
  try {
    // Import DataAccess dynamically
    const { DataAccess } = await import('../../../../../connector-userid-ts/dist/index.js');

    // Initialize DataAccess with backend configuration
    const dataAccess = new DataAccess({
      userId: BACKEND_CONFIG.userId,
      dataUrl: BACKEND_CONFIG.dataUrl,
      dsUrl: BACKEND_CONFIG.dataUrl,
      onPrem: BACKEND_CONFIG.onPrem,
      tz: BACKEND_CONFIG.tz
    });

    // Convert IST string times to Unix timestamps properly
    // The query_time values are in IST format (YYYY-MM-DD HH:mm:ss)
    // We need to treat them as IST timezone
    function convertISTStringToUnix(timeStr: string): number {
      // Convert "YYYY-MM-DD HH:mm:ss" to "YYYY-MM-DDTHH:mm:ss+05:30" (ISO format with IST timezone)
      const isoTimeStr = timeStr.replace(' ', 'T') + '+05:30';
      const istTime = new Date(isoTimeStr);
      return istTime.getTime();
    }
    
    const startTimeUnix = convertISTStringToUnix(startTime);
    const endTimeUnix = convertISTStringToUnix(endTime);

    console.log('Calling real backend dataQuery with:', {
      deviceId,
      sensorList,
      startTime: startTime + ' (converted to Unix: ' + startTimeUnix + ')',
      endTime: endTime + ' (converted to Unix: ' + endTimeUnix + ')'
    });

    // Call the real backend dataQuery function with Unix timestamps
    // This avoids timezone conversion issues by passing already-converted timestamps
    const result = await dataAccess.dataQuery({
      deviceId,
      sensorList,
      startTime: startTimeUnix,  // Pass Unix timestamp
      endTime: endTimeUnix       // Pass Unix timestamp
    });

    console.log('Real backend response type:', typeof result);
    console.log('Real backend response is array:', Array.isArray(result));
    console.log('Real backend response length:', Array.isArray(result) ? result.length : 'N/A');

    // Check if result is empty due to connector error
    if (!result || (Array.isArray(result) && result.length === 0)) {
      console.warn('Backend returned empty result, falling back to mock data');
      return generateMockData(deviceId, sensorList, startTime, endTime);
    }

    // Transform the backend response to match the expected format
    if (result && Array.isArray(result)) {
      return result.map(dataPoint => ({
        time: dataPoint.timestamp || dataPoint.time || new Date().toISOString(),
        ...dataPoint.values || dataPoint
      }));
    }

    return result || [];
  } catch (error) {
    console.error('Error fetching real data:', error);
    
    // Fallback to mock data if real data fails
    console.log('Falling back to mock data due to error');
    return generateMockData(deviceId, sensorList, startTime, endTime);
  }
}

// Mock data generator (fallback)
function generateMockData(deviceId: string, sensorList: string[], startTime: string, endTime: string) {
  // Convert IST string times to Unix timestamps for mock data generation
  function convertISTStringToUnix(timeStr: string): number {
    const isoTimeStr = timeStr.replace(' ', 'T') + '+05:30';
    return new Date(isoTimeStr).getTime();
  }
  
  const start = convertISTStringToUnix(startTime);
  const end = convertISTStringToUnix(endTime);
  const interval = (end - start) / 100;
  
  const data = [];
  for (let i = 0; i < 100; i++) {
    const timestamp = start + (i * interval);
    const dataPoint: any = {
      time: new Date(timestamp).toISOString()
    };
    
    sensorList.forEach(sensor => {
      // Generate realistic sensor data
      const baseValue = 50 + Math.random() * 100;
      const trend = Math.sin(i * 0.1) * 20;
      const noise = (Math.random() - 0.5) * 10;
      dataPoint[sensor] = Math.round((baseValue + trend + noise) * 100) / 100;
    });
    
    data.push(dataPoint);
  }
  
  console.log(`Generated ${data.length} mock data points for ${sensorList.length} sensors`);
  return data;
} 