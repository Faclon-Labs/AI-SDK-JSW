"use client"

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';

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
}

interface DataPoint {
  time: string;
  [key: string]: any;
}

export default function TrendChart({ deviceId, sensorList, startTime, endTime, title, events, legendNames }: TrendChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];
  const eventColor = '#ff6b6b'; // Single color for all events
  const normalColor = '#8884d8'; // Color for normal data

  // Check if this is the TPH section (contains D49 and D5 sensors)
  const isTPHSection = sensorList.includes('D49') && sensorList.includes('D5');

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading trend data...</p>
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

  // Format time for display
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Preprocess data to add a 'timestamp' field for each point
  const processedData = data.map(point => ({
    ...point,
    timestamp: new Date(point.time).getTime(),
  }));

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
        return event.color || eventColors[i % eventColors.length];
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

  return (
    <div className="w-full h-80 bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp"
            tickFormatter={formatTime}
            angle={-45}
            textAnchor="end"
            height={60}
            fontSize={12}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <Brush dataKey="timestamp" height={30} stroke="#8884d8" tickFormatter={formatTime} />
          <YAxis fontSize={12} />
          <Tooltip 
            labelFormatter={formatTime}
            formatter={(value: any, name: string) => [value, name]}
          />
          <Legend formatter={(value) => {
            if (legendNames && legendNames[value]) return legendNames[value];
            // Special case for TPH segmented lines
            if (value === 'Raw mill feed rate_event') return legendNames?.['event'] || 'Ramp-up event';
            if (value === 'Raw mill feed rate_normal') return legendNames?.['normal'] || 'Raw mill feed rate';
            return value;
          }} />
          {renderColoredLines()}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 