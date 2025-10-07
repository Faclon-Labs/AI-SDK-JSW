"use client"

import React, { useState, useEffect } from 'react';
import HighchartsLineChart from './HighchartsLineChart';
import { Component as LumaSpin } from './ui/luma-spin';

interface TrendChartProps {
  deviceId: string;
  sensorList: string[];
  startTime: string;
  endTime: string;
  title: string;
  events?: Array<{
    startTime: string;
    endTime: string;
    color?: string;
    type?: string;
  }>;
  legendNames?: Record<string, string>; // Add this line
  targetValue?: number; // Add target value prop
  isCementMillTPH?: boolean; // Add prop to identify cement mill TPH sections
  isDualAxis?: boolean; // Add prop for dual-axis plotting
}

interface DataPoint {
  time: string;
  [key: string]: any;
}

// Define the type for eventRanges
interface EventRange {
  start: string;
  end: string;
  color: string;
  label: string;
}

export default function TrendChart({ deviceId, sensorList, startTime, endTime, title, events, legendNames, targetValue, isCementMillTPH = false, isDualAxis = false }: TrendChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = ['#3263fc', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];
  const eventColor = '#ED1C24'; // Single color for all events
  const normalColor = '#3263fc'; // Color for normal data (raw mill feed rate)

  // Check if this is the TPH section (contains D49 and D5 sensors for Raw Mill)
  const isTPHSection = sensorList.includes('D49') && sensorList.includes('D5');
  
  // Check if this is Klin section (has legendNames with "Klin feed rate")
  const isKlinSection = legendNames && legendNames.normal === "Klin feed rate";
  
  // Check if this is Cement Mill TPH section (contains D26 sensor or is a TPH section with legendNames, but not Klin)
  const isCementMillTPHSection = (sensorList.includes('D26') || (title.toLowerCase().includes('tph') && legendNames && Object.keys(legendNames).length > 0)) && !isKlinSection;
  
  // Check if this is Quality section (contains quality-related sensors)
  const isQualitySection = title.toLowerCase().includes('quality');
  
  // Check if this is a High Power section (has multiple sensors with names)
  // Also include Reduced Feed Operations sections to avoid duplicate legend entries
  const isReducedFeedOperations = title.toLowerCase().includes('reduced feed operations');
  const isHighPowerSection = (legendNames && Object.keys(legendNames).length > 0) || isReducedFeedOperations;
  
  // Check if this is the SKS Fan section (contains D49, D5, and SKS Fan sensors)
  const isSKSFanSection = sensorList.includes('D49') && sensorList.includes('D5') && 
    (sensorList.includes('D209') || sensorList.some(s => s.includes('D104')));
  
  // Check if this is specifically the SKS Fan section from the title
  const isSKSFanFromTitle = title.toLowerCase().includes('sks fan');
  
  // Check if this is the Raw Mill Feed Rate section (only D49 and D5)
  const isRawMillFeedRateSection = sensorList.length === 2 && sensorList.includes('D49') && sensorList.includes('D5');
  
  // Check if this is PHF1 or PHF2 section (Preheater Fan sections with dual-axis plotting)
  const isPHF1Section = title.toLowerCase().includes('preheater fan 1') || title.toLowerCase().includes('phf1');
  const isPHF2Section = title.toLowerCase().includes('preheater fan 2') || title.toLowerCase().includes('phf2');
  const isPHFSection = isPHF1Section || isPHF2Section;
  
  // Check if this is Klin Main Drive section (Klin Main Drive sections with dual-axis plotting)
  const isKlinMainDrive1Section = title.toLowerCase().includes('klin main drive 1') || title.toLowerCase().includes('klin_main_drive_1');
  const isKlinMainDrive2Section = title.toLowerCase().includes('klin main drive 2') || title.toLowerCase().includes('klin_main_drive_2');
  const isKlinMainDriveSection = isKlinMainDrive1Section || isKlinMainDrive2Section;


  useEffect(() => {
    const fetchTrendData = async () => {
      setLoading(true);
      setError(null);

      try {

        const response = await fetch('/jsw-rca-new/api/trend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceId,
            sensorList,
            startTime,
            endTime,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch trend data');
        }

        const result = await response.json();
        
        if (result.success) {
          let processedData = result.data;
          
          // Special processing for Raw Mill TPH section (D49 - D5 calculation)
          if (isTPHSection) {
            processedData = result.data.map((point: DataPoint) => {
              const d49Value = parseFloat(point.D49 || '0');
              const d5Value = parseFloat(point.D5 || '0');
              const calculatedValue = d49Value - d5Value;
              // Cap negative values at 0
              const finalValue = Math.max(0, calculatedValue);
              
              return {
                ...point,
                'Raw mill feed rate': finalValue
              };
            });
          }
          
          // Special processing for Klin section
          if (isKlinSection) {
            processedData = result.data.map((point: DataPoint) => {
              // For Klin, use the first sensor value as the main feed rate
              const firstSensorId = sensorList[0];
              const sensorValue = parseFloat(point[firstSensorId] || '0');
              
              return {
                ...point,
                'Klin feed rate': sensorValue
              };
            });
          }
          
          // Special processing for Cement Mill TPH section (same format as raw mill)
          if (isCementMillTPH || isCementMillTPHSection) {
            processedData = result.data.map((point: DataPoint) => {
              // For cement mill TPH, use the first sensor value as the main feed rate
              // This matches the raw mill approach where we calculate D49 - D5
              const firstSensorId = sensorList[0];
              const sensorValue = parseFloat(point[firstSensorId] || '0');
              
              return {
                ...point,
                'Cement mill feed rate': sensorValue
              };
            });
          }
          
          // Special processing for Quality section (multiple quality sensors)
          if (isQualitySection) {
            processedData = result.data.map((point: DataPoint) => {
              const processedPoint: any = { ...point };
              
              // Process each sensor in the sensor list
              sensorList.forEach((sensorId, index) => {
                const sensorValue = parseFloat(point[sensorId] || '0');
                const legendName = legendNames?.[sensorId] || `Quality Area ${index + 1}`;
                processedPoint[legendName] = sensorValue;
              });
              
              return processedPoint;
            });
          }
          
          // Special processing for SKS Fan section (dual-line plot)
          if (isSKSFanSection || isSKSFanFromTitle) {
            processedData = result.data.map((point: DataPoint) => {
              const d49Value = parseFloat(point.D49 || '0');
              const d5Value = parseFloat(point.D5 || '0');
              const calculatedValue = d49Value - d5Value;
              // Cap negative values at 0
              const finalValue = Math.max(0, calculatedValue);
              
              return {
                ...point,
                'Raw mill feed rate': finalValue
              };
            });
          }
          
          // Special processing for Raw Mill Feed Rate section (calculated value)
          if (isRawMillFeedRateSection) {
            processedData = result.data.map((point: DataPoint) => {
              const d49Value = parseFloat(point.D49 || '0');
              const d5Value = parseFloat(point.D5 || '0');
              const calculatedValue = d49Value - d5Value;
              // Cap negative values at 0
              const finalValue = Math.max(0, calculatedValue);
              
              return {
                ...point,
                'Raw mill feed rate': finalValue
              };
            });
          }
          
          // Special processing for PHF sections (dual-axis plotting)
          if (isPHFSection) {
            processedData = result.data.map((point: DataPoint) => {
              const processedPoint: any = { ...point };
              
              // Process each sensor in the sensor list
              sensorList.forEach((sensorId) => {
                const sensorValue = parseFloat(point[sensorId] || '0');
                const legendName = legendNames?.[sensorId] || sensorId;
                processedPoint[legendName] = sensorValue;
              });
              
              return processedPoint;
            });
          }
          
          // Special processing for Klin Main Drive sections (dual-axis plotting)
          if (isKlinMainDriveSection) {
            processedData = result.data.map((point: DataPoint) => {
              const processedPoint: any = { ...point };
              
              // Process each sensor in the sensor list
              sensorList.forEach((sensorId) => {
                const sensorValue = parseFloat(point[sensorId] || '0');
                const legendName = legendNames?.[sensorId] || sensorId;
                processedPoint[legendName] = sensorValue;
              });
              
              return processedPoint;
            });
          }
          
          setData(processedData);
        } else {
          throw new Error(result.error || 'Failed to fetch trend data');
        }
      } catch (err) {
        console.error('TrendChart Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (deviceId && sensorList.length > 0 && startTime && endTime) {
      fetchTrendData();
    }
  }, [deviceId, sensorList, startTime, endTime, isTPHSection, isCementMillTPH, isCementMillTPHSection, isQualitySection, isSKSFanSection, isSKSFanFromTitle, isRawMillFeedRateSection, isPHFSection, isKlinMainDriveSection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center flex flex-col items-center">
          <LumaSpin />
          <p className="text-sm text-gray-600 mt-4">Loading trend data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">No trend data available</p>
        </div>
      </div>
    );
  }

  // Process data to add a 'timestamp' field (milliseconds since epoch)
  const processedData = data.map(point => ({
    ...point,
    timestamp: new Date(point.time).getTime(),
    target: targetValue, // Add target value to each data point
  }));



  // Determine which sensors to display
  let displaySensors: string[];
  if (isSKSFanSection || isSKSFanFromTitle) {
    // Only show D209 and Raw mill feed rate if both are present
    const hasD209 = sensorList.includes('D209');
    // Always calculate 'Raw mill feed rate' if D49 and D5 are present
    if (hasD209) {
      displaySensors = ['D209', 'Raw mill feed rate'];
    } else {
      displaySensors = sensorList;
    }
  } else if (isTPHSection) {
    displaySensors = ['Raw mill feed rate'];
  } else if (isKlinSection) {
    // For Klin section, use Klin feed rate
    displaySensors = ['Klin feed rate'];
  } else if (isCementMillTPH || isCementMillTPHSection) {
    // For cement mill TPH, use the same naming convention as raw mill
    displaySensors = ['Cement mill feed rate'];
  } else if (isQualitySection) {
    // For Quality section, use the legend names or default sensor names
    displaySensors = legendNames ? Object.keys(legendNames) : sensorList;
  } else if (isRawMillFeedRateSection) {
    displaySensors = ['Raw mill feed rate'];
  } else if (isPHFSection) {
    // For PHF sections, use the legend names or default sensor names
    displaySensors = legendNames ? Object.keys(legendNames) : sensorList;
  } else if (isKlinMainDriveSection) {
    // For Klin Main Drive sections, use the legend names or default sensor names
    displaySensors = legendNames ? Object.keys(legendNames) : sensorList;
  } else {
    displaySensors = sensorList;
  }

  // Assign colors: D209 = blue, Raw mill feed rate = yellow in SKS Fan section, blue in other sections, Cement mill feed rate = blue
  const getLineColor = (sensor: string, index: number) => {
    if (sensor === 'D209') return '#3263fc'; // blue for SKS Fan Speed
    if (sensor === 'Raw mill feed rate') {
      // In SKS Fan section: yellow, in other sections: blue
      if (isSKSFanSection || isSKSFanFromTitle) {
        return '#ff8d13  '; // green for SKS Fan section
      } else {
        return '#3263fc'; // blue for other sections
      }
    }
    if (sensor === 'Klin feed rate') return '#3263fc'; // blue for Klin (same as raw mill)
    if (sensor === 'Cement mill feed rate') return '#3263fc'; // blue for Cement Mill (same as raw mill)
    if (sensor.startsWith('Quality Area')) return colors[index % colors.length]; // different colors for each quality area
    if (isPHFSection) {
      // For PHF sections, assign specific colors for different sensors
      if (sensor.includes('Klin Feed') || sensor.includes('D63')) return '#3263fc'; // blue for Klin Feed
      if (sensor.includes('PH Fan 1') || sensor.includes('D18')) return '#ff8d13'; // orange for PH Fan 1
      if (sensor.includes('PH Fan 2') || sensor.includes('D19')) return '#ff6b6b'; // red for PH Fan 2
    }
    if (isKlinMainDriveSection) {
      // For Klin Main Drive sections, assign specific colors for different sensors
      if (sensor.includes('Klin Feed') || sensor.includes('D63')) return '#3263fc'; // blue for Klin Feed
      if (sensor.includes('Klin RPM') || sensor.includes('D16')) return '#ff8d13'; // orange for Klin RPM
    }
    return colors[index % colors.length];
  };

  // Prepare processedData and lines for ZoomableLineChart
  const lines: Array<{key: string, name: string, color: string}> = displaySensors.map((sensor, index) => ({
    key: sensor,
    name: legendNames?.[sensor] || sensor,
    color: getLineColor(sensor, index),
  }));

  // Function to determine event type based on title and events data
  const getEventType = (): 'RP1' | 'RP2' | 'general' => {
    // For Klin sections, use the actual event type from events data
    if (isKlinSection && events && events.length > 0) {
      const eventType = events[0].type;
      if (eventType === 'Drop Events') {
        return 'general'; // Use general for Drop Events
      }
    }
    
    const titleLower = title.toLowerCase();
    if (titleLower.includes('rp1') || titleLower.includes('one rp down') || titleLower.includes('single rp down')) {
      return 'RP1';
    } else if (titleLower.includes('rp2') || titleLower.includes('both rp down')) {
      return 'RP2';
    }
    return 'general';
  };

  // Transform events to eventRanges format for ZoomableLineChart
  const eventRanges: EventRange[] = events?.map((event, index) => ({
    start: event.startTime,
    end: event.endTime,
    color: '#ED1C24', // Event color
    label: `Event ${index + 1}`
  })) || [];

  const eventType = getEventType();

  // For High Power sections, use HighchartsLineChart with proper configuration
  if (isHighPowerSection) {
    return (
      <HighchartsLineChart
        data={processedData}
        lines={lines}
        title={title}
        eventRanges={eventRanges}
        targetValue={targetValue}
        isHighPowerSection={true}
        eventType={eventType}
        isCementMillTPH={isCementMillTPH}
        events={events}
        isDualAxis={isPHFSection || isKlinMainDriveSection}
      />
    );
  }

  return (
    <HighchartsLineChart
      data={processedData}
      lines={lines}
      title={title}
      eventRanges={eventRanges}
      targetValue={targetValue}
      eventType={eventType}
      isCementMillTPH={isCementMillTPH}
      events={events}
    />
  );
} 