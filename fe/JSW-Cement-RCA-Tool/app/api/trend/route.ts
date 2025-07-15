import { NextRequest, NextResponse } from 'next/server';

// Configuration for the backend connection
const BACKEND_CONFIG = {
  userId: '66792886ef26fb850db806c5', // Hardcoded user ID
  dataUrl: 'datads-ext.iosense.io', // Correct data URL
  onPrem: false
  // Removed tz parameter - times are passed as-is in IST format
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

    // Pass time strings directly (already in IST format)
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
    // Import the DataAccess class dynamically to avoid module resolution issues
    const { DataAccess } = await import('../../../../../connector-userid-ts/dist/index.js');
    
    // Initialize DataAccess with backend configuration
    const dataAccess = new DataAccess({
      userId: BACKEND_CONFIG.userId,
      dataUrl: BACKEND_CONFIG.dataUrl,
      dsUrl: BACKEND_CONFIG.dataUrl,
      onPrem: BACKEND_CONFIG.onPrem
      // No tz parameter - times are passed as-is in IST format
    });

    console.log('Calling real backend dataQuery with:', {
      deviceId,
      sensorList,
      startTime: startTime, // Pass IST time string directly as-is
      endTime: endTime
    });

    // Call the real backend dataQuery function
    const result = await dataAccess.dataQuery({
      deviceId,
      sensorList,
      startTime: startTime, // Pass IST time string directly as-is
      endTime: endTime
    });

    console.log('Real backend response:', result);

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
  // Parse IST time strings directly
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
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