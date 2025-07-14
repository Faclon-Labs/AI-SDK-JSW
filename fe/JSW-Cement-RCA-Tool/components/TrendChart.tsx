"use client"

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import ZoomableLineChart from './ZoomableLineChart';
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
  const isHighPowerSection = legendNames && Object.keys(legendNames).length > 0;

  // Debug: Log the parameters
  useEffect(() => {
    console.log('TrendChart Parameters:', {
      deviceId,
      sensorList,
      startTime,
      endTime,
      title,
      isTPHSection,
      events
    });
  }, [deviceId, sensorList, startTime, endTime, title, isTPHSection, events]);

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
              
              return {
                ...point,
                'Raw mill feed rate': calculatedValue
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
  }, [deviceId, sensorList, startTime, endTime, isTPHSection]);

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

  // Calculate dynamic Y-axis domain for High Power sections
  const calculateYAxisDomain = () => {
    if (!isHighPowerSection || processedData.length === 0) return undefined;
    
    let maxValue = 0;
    
    // Find the maximum value across all sensors
    processedData.forEach(point => {
      displaySensors.forEach(sensor => {
        const value = parseFloat((point as any)[sensor] || '0');
        if (!isNaN(value) && value > maxValue) {
          maxValue = value;
        }
      });
    });
    
    // Add 20% padding to the maximum value
    const paddedMax = Math.ceil(maxValue * 1.2);
    
    return [0, paddedMax];
  };

  // Formatter for IST date+time from timestamp
  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });
  };

  // Determine which sensors to display
  const displaySensors = isTPHSection ? ['Raw mill feed rate'] : sensorList;

  // Function to determine if a data point falls within any event period
  const getEventColor = (timeStr: string) => {
    if (!events || events.length === 0) return null;
    
    const pointTime = new Date(timeStr).getTime();
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();
      
      if (pointTime >= eventStart && pointTime <= eventEnd) {
        return event.color || colors[i % colors.length]; // Changed from eventColors to colors
      }
    }
    
    return null;
  };

  // Helper to split data into colored segments with full data alignment
  function getSegmentedDataArrays(data: DataPoint[], events: Array<{
    startTime: string;
    endTime: string;
    color?: string;
  }>, sensor: string) {
    if (!events || events.length === 0) {
      return [{ color: normalColor, dataKey: `${sensor}_normal`, data: data.map(d => ({ ...d, [`${sensor}_normal`]: d[sensor] })) }];
    }
    // Build an array of segment objects: { color, dataKey, data }
    let segments = [];
    let segIdx = 0;
    // Build a mask for each data point: is it in an event?
    const mask = data.map(point => {
      const pointTime = new Date(point.time).getTime();
      for (const event of events) {
        const eventStart = new Date(event.startTime).getTime();
        const eventEnd = new Date(event.endTime).getTime();
        if (pointTime >= eventStart && pointTime <= eventEnd) {
          return true;
        }
      }
      return false;
    });
    // Build event segment
    const eventData = data.map((d, i) => ({ ...d, [`${sensor}_event`]: mask[i] ? d[sensor] : null }));
    segments.push({ color: eventColor, dataKey: `${sensor}_event`, data: eventData });
    // Build normal segment
    const normalData = data.map((d, i) => ({ ...d, [`${sensor}_normal`]: !mask[i] ? d[sensor] : null }));
    segments.push({ color: normalColor, dataKey: `${sensor}_normal`, data: normalData });
    return segments;
  }

  // Create colored line segments for TPH sections with events
  const renderColoredLines = () => {
    if (!isTPHSection || !events || events.length === 0) {
      // Return regular lines for non-TPH sections or when no events
      return displaySensors.map((sensor, index) => (
        <Line
          key={sensor}
          type="monotone"
          dataKey={sensor}
          stroke={colors[index % colors.length]}
          strokeWidth={2}
          dot={false}
          activeDot={false}
          data={processedData}
        />
      ));
    }
    // For TPH sections with events, create two segments per sensor, both using the full data array
    const lines = [];
    displaySensors.forEach((sensor, sensorIndex) => {
      const segments = getSegmentedDataArrays(processedData, events, sensor);
      segments.forEach((seg, segIdx) => {
        lines.push(
          <Line
            key={`${sensor}-seg-${segIdx}`}
            type="monotone"
            dataKey={seg.dataKey}
            stroke={seg.color}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            data={seg.data}
            isAnimationActive={false}
            connectNulls={false}
          />
        );
      });
    });
    return lines;
  };

  // Prepare processedData and lines for ZoomableLineChart
  const lines: Array<{key: string, name: string, color: string}> = displaySensors.map((sensor, index) => ({
    key: sensor,
    name: legendNames?.[sensor] || sensor,
    color: colors[index % colors.length],
  }));

  // Transform events to eventRanges format for ZoomableLineChart
  const eventRanges: EventRange[] = events?.map((event, index) => ({
    start: event.startTime,
    end: event.endTime,
    color: '#ED1C24', // Event color
    label: `Event ${index + 1}`
  })) || [];

  // For High Power sections, use ZoomableLineChart with proper configuration
  if (isHighPowerSection) {
    return (
      <ZoomableLineChart
        data={processedData}
        lines={lines}
        title={title}
        eventRanges={eventRanges}
        targetValue={targetValue}
        isHighPowerSection={true}
      />
    );
  }

  return (
    <ZoomableLineChart
      data={processedData}
      lines={lines}
      title={title}
      eventRanges={eventRanges}
      targetValue={targetValue}
    />
  );
} 