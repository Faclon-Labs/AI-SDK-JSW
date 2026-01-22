import { NextRequest, NextResponse } from 'next/server';

// Force this module to be server-side only
export const runtime = 'nodejs';

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
    // Import the server-only wrapper module
    const { queryData } = await import('../../../lib/dataAccess.server');

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

    // Call the real backend dataQuery function with Unix timestamps via the server wrapper
    // This avoids timezone conversion issues by passing already-converted timestamps
    const result = await queryData(
      {
        userId: BACKEND_CONFIG.userId,
        dataUrl: BACKEND_CONFIG.dataUrl,
        dsUrl: BACKEND_CONFIG.dataUrl,
        onPrem: BACKEND_CONFIG.onPrem,
        tz: BACKEND_CONFIG.tz
      },
      {
        deviceId,
        sensorList,
        startTime: startTimeUnix,  // Pass Unix timestamp
        endTime: endTimeUnix       // Pass Unix timestamp
      }
    );

    console.log('Real backend response type:', typeof result);
    console.log('Real backend response is array:', Array.isArray(result));
    console.log('Real backend response keys:', result && typeof result === 'object' ? Object.keys(result) : 'N/A');
    console.log('Real backend result stringified (first 500 chars):', JSON.stringify(result)?.substring(0, 500));

    // Handle wrapped response format { allData: [...] }
    let dataArray: any = result;

    // Check if result is an object with allData or data property
    if (result && typeof result === 'object') {
      // Check for allData property first (most common format from connector)
      if (result.allData && Array.isArray(result.allData)) {
        console.log('Detected wrapped response format: { allData: [...] }');
        console.log('allData length:', result.allData.length);
        dataArray = result.allData;
      }
      // Check for data property
      else if (result.data && Array.isArray(result.data)) {
        console.log('Detected wrapped response format: { data: [...] }');
        console.log('data length:', result.data.length);
        dataArray = result.data;
      }
      // If result is already an array
      else if (Array.isArray(result)) {
        console.log('Result is already an array');
        dataArray = result;
      }
      // Check if result has numeric keys (array-like object)
      else if (result[0] !== undefined) {
        console.log('Result is array-like object, converting to array');
        dataArray = Array.from(result);
      }
    }

    console.log('Data array length:', Array.isArray(dataArray) ? dataArray.length : 'N/A');
    console.log('Data array type:', typeof dataArray, Array.isArray(dataArray));

    // Log sample data point for debugging
    if (Array.isArray(dataArray) && dataArray.length > 0) {
      console.log('Sample data point from backend:', JSON.stringify(dataArray[0], null, 2));
    }

    // Check if result is empty due to connector error
    if (!dataArray || (Array.isArray(dataArray) && dataArray.length === 0)) {
      console.warn('Backend returned empty result - no data available for the specified time range');
      return [];
    }

    console.log('SUCCESS: Using REAL backend data (not mock)');

    // Use the extracted data array
    const result_data = dataArray;

    // Transform the backend response to match the expected format
    if (result_data && Array.isArray(result_data)) {
      // Check the format of the data
      const firstItem = result_data[0];

      // Format 1: Each item has { time, value, sensor } - needs pivoting
      if (firstItem && 'sensor' in firstItem && 'value' in firstItem) {
        console.log('Detected format: { time, value, sensor } - pivoting data');

        // Group by timestamp and pivot sensors to columns
        const groupedByTime: Record<string, any> = {};

        result_data.forEach((dataPoint: any) => {
          const time = dataPoint.time || dataPoint.timestamp;
          if (!time) return;

          if (!groupedByTime[time]) {
            groupedByTime[time] = { time };
          }

          const sensorId = dataPoint.sensor;
          const value = parseFloat(dataPoint.value);
          if (sensorId && !isNaN(value)) {
            groupedByTime[time][sensorId] = value;
          }
        });

        const transformedData = Object.values(groupedByTime).sort((a: any, b: any) =>
          new Date(a.time).getTime() - new Date(b.time).getTime()
        );

        console.log(`Transformed ${result_data.length} raw data points into ${transformedData.length} time-series points`);
        if (transformedData.length > 0) {
          console.log('Sample transformed data point:', JSON.stringify(transformedData[0], null, 2));
        }

        return transformedData;
      }

      // Format 2: Each item has { timestamp, values: { sensorId: value } }
      if (firstItem && 'values' in firstItem) {
        console.log('Detected format: { timestamp, values } - standard format');
        return result_data.map((dataPoint: any) => ({
          time: dataPoint.timestamp || dataPoint.time || new Date().toISOString(),
          ...dataPoint.values
        }));
      }

      // Format 3: Each item already has { time, sensorId: value } format
      console.log('Detected format: direct sensor values - using as-is');
      return result_data.map((dataPoint: any) => ({
        time: dataPoint.timestamp || dataPoint.time || new Date().toISOString(),
        ...dataPoint
      }));
    }

    return result_data || [];
  } catch (error) {
    console.error('Error fetching real data:', error);
    // Do not fall back to mock data - throw error so UI knows data is not available
    throw error;
  }
}