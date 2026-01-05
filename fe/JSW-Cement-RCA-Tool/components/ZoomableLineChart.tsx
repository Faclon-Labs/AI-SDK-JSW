import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush
} from 'recharts';

// Add prop types
interface EventRange {
  start: string;
  end: string;
  color: string;
  label: string;
}
interface LineDef {
  key: string;
  name: string;
  color: string;
}
interface ZoomableLineChartProps {
  data: any[];
  lines: LineDef[];
  title: string;
  eventRanges?: EventRange[];
  targetValue?: number;
  isHighPowerSection?: boolean;
}

export default function ZoomableLineChart({ data, lines, title, eventRanges = [], targetValue, isHighPowerSection = false }: ZoomableLineChartProps) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const handleLegendClick = (o) => {
    setHidden(prev => ({ ...prev, [o.dataKey]: !prev[o.dataKey] }));
  };

  const formatTimestamp = (ts) => {
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
            {formatTimestamp(label)}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ 
              margin: '2px 0', 
              color: entry.color,
              display: hidden[entry.dataKey] ? 'none' : 'block'
            }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // For each data point, determine if it falls in any event
  // Use simple processing like the "no events" case for better zoom functionality
  const processDataWithEvents = () => {
    const mainSensorKey = lines[0]?.key;
    
    // Simple processing for all cases - no boundary point insertion
    return data.map(point => {
      const timestamp = point.timestamp;
      const processedPoint = { ...point };
      const mainValue = point[mainSensorKey];
      let inEvent = false;
      
      // Check if point is in any event
      for (const event of eventRanges) {
        const start = new Date(event.start).getTime();
        const end = new Date(event.end).getTime();
        if (timestamp >= start && timestamp <= end) {
          inEvent = true;
          break;
        }
      }
      
      // set normal and event data
      processedPoint.normal = inEvent ? null : mainValue;
      processedPoint.event = inEvent ? mainValue : null;
      
      return processedPoint;
    });
  };

  const processedData = processDataWithEvents().map(point => ({
    ...point,
    target: targetValue
  }));

  // Only two lines: normal and event
  const normalColor = lines[0]?.color || '#8884d8';
  const eventColor = eventRanges[0]?.color || '#ff6b6b';

  // For High Power sections, render multiple sensor lines
  if (isHighPowerSection) {
    // Calculate dynamic Y-axis domain for High Power sections
    const calculateHighPowerYAxisDomain = () => {
      if (data.length === 0) return undefined;
      
      let maxValue = 0;
      
      // Find the maximum value across all sensor lines
      data.forEach(point => {
        lines.forEach(line => {
          const value = parseFloat((point as any)[line.key] || '0');
          if (!isNaN(value) && value > maxValue) {
            maxValue = value;
          }
        });
      });
      
      // Add 20% padding to the maximum value
      const paddedMax = Math.ceil(maxValue * 1.2);
      
      return [0, paddedMax];
    };

    // Process data for event highlighting - add event data to each point
    const finalData = data.map(point => {
      const processedPoint = { ...point };
      
      if (eventRanges && eventRanges.length > 0) {
        const pointTime = point.timestamp;
        const inEvent = eventRanges.some(event => {
          const eventStart = new Date(event.start).getTime();
          const eventEnd = new Date(event.end).getTime();
          return pointTime >= eventStart && pointTime <= eventEnd;
        });
        
        // Add event data for each sensor line
        lines.forEach(line => {
          processedPoint[`${line.key}_event`] = inEvent ? point[line.key] : null;
        });
      }
      
      return processedPoint;
    });

    return (
      <div style={{ width: '100%', height: '400px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>{title}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={finalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTimestamp}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} domain={calculateHighPowerYAxisDomain()} />
            <Tooltip content={<CustomTooltip />} />
            <Legend onClick={handleLegendClick} />
            <Brush dataKey="timestamp" height={30} stroke="#3263fc" tickFormatter={formatTimestamp} />
            {lines.map((line, index) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                hide={hidden[line.key]}
                connectNulls={false}
                name={line.name}
              />
            ))}
            {targetValue && (
              <Line
                key="target"
                type="monotone"
                dataKey="target"
                stroke="#2eab00"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                hide={hidden.target}
                connectNulls={false}
                name="Target"
              />
            )}
            {/* Event highlighting lines - now using the same data source */}
            {eventRanges && eventRanges.length > 0 && lines.map((line, lineIndex) => (
              <Line
                key={`${line.key}-event`}
                type="monotone"
                dataKey={`${line.key}_event`}
                stroke="#ED1C24"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
                hide={hidden[`${line.key}_event`]}
                name={`${line.name} (Event)`}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTimestamp}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend onClick={handleLegendClick} />
          <Brush dataKey="timestamp" height={30} stroke="#3263fc" tickFormatter={formatTimestamp} />
          <Line
            key="normal"
            type="monotone"
            dataKey="normal"
            stroke={normalColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            hide={hidden.normal}
            connectNulls={false}
            name={lines[0]?.name || "Raw mill feed rate"}
          />
          <Line
            key="event"
            type="monotone"
            dataKey="event"
            stroke={eventColor}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
            hide={hidden.event}
            connectNulls={false}
            name="Event Period"
          />
          {targetValue && (
            <Line
              key="target"
              type="monotone"
              dataKey="target"
              stroke="#2eab00"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              hide={hidden.target}
              connectNulls={false}
              name="Target"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 