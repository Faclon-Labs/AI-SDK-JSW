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
  }>;
  legendNames?: Record<string, string>; // Add this line
  targetValue?: number; // Add target value prop
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

export default function TrendChart({ deviceId, sensorList, startTime, endTime, title, events, legendNames, targetValue }: TrendChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = ['#3263fc', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];
  const eventColor = '#ED1C24'; // Single color for all events
  const normalColor = '#3263fc'; // Color for normal data (raw mill feed rate)

  // Check if this is the TPH section (contains D49 and D5 sensors)
  const isTPHSection = sensorList.includes('D49') && sensorList.includes('D5');
  
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

  // Debug: Log the parameters
  useEffect(() => {
    console.log('TrendChart Parameters:', {
      deviceId,
      sensorList,
      startTime,
      endTime,
      title,
      isTPHSection,
      isSKSFanSection,
      isSKSFanFromTitle,
      isRawMillFeedRateSection,
      events
    });
  }, [deviceId, sensorList, startTime, endTime, title, isTPHSection, isSKSFanSection, isSKSFanFromTitle, isRawMillFeedRateSection, events]);

  useEffect(() => {
    const fetchTrendData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching trend data with params:', {
          deviceId,
          sensorList,
          startTime,
          endTime,
        });

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
        console.log('Trend API Response:', result);
        
        if (result.success) {
          let processedData = result.data;
          
          // Special processing for TPH section
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
    } else {
      console.log('TrendChart: Missing required parameters', {
        deviceId: !!deviceId,
        sensorListLength: sensorList?.length,
        startTime: !!startTime,
        endTime: !!endTime
      });
    }
  }, [deviceId, sensorList, startTime, endTime, isTPHSection, isSKSFanSection, isSKSFanFromTitle, isRawMillFeedRateSection]);

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
  } else if (isRawMillFeedRateSection) {
    displaySensors = ['Raw mill feed rate'];
  } else {
    displaySensors = sensorList;
  }

  // Assign colors: D209 = blue, Raw mill feed rate = yellow in SKS Fan section, blue in other sections
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
    return colors[index % colors.length];
  };

  // Prepare processedData and lines for ZoomableLineChart
  const lines: Array<{key: string, name: string, color: string}> = displaySensors.map((sensor, index) => ({
    key: sensor,
    name: legendNames?.[sensor] || sensor,
    color: getLineColor(sensor, index),
  }));

  // Function to determine event type based on title
  const getEventType = (): 'RP1' | 'RP2' | 'general' => {
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
        events={events}
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
      events={events}
    />
  );
} 