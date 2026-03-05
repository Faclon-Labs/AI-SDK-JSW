import React, { useState, useEffect, useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

// Import Highcharts modules for better zoom/scroll functionality (client-side only)
if (typeof window !== 'undefined' && typeof Highcharts === 'object') {
  try {
    const boost = require('highcharts/modules/boost');
    boost(Highcharts);
  } catch (e) {
    console.log('Highcharts boost module not available');
  }
}

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

interface HighchartsLineChartProps {
  data: any[];
  lines: LineDef[];
  title: string;
  eventRanges?: EventRange[];
  targetValue?: number;
  isHighPowerSection?: boolean;
  eventType?: 'RP1' | 'RP2' | 'general'; // Add event type for color differentiation
  isCementMillTPH?: boolean; // Add prop to identify cement mill TPH sections
  events?: Array<{
    startTime: string;
    endTime: string;
    color?: string;
  }>; // Add individual events with colors
  isDualAxis?: boolean; // Add prop for dual-axis plotting
  usl?: number; // Upper Specification Limit (max)
  lsl?: number; // Lower Specification Limit (min)
}

export default function HighchartsLineChart({
  data,
  lines,
  title,
  eventRanges = [],
  targetValue,
  isHighPowerSection = false,
  eventType = 'general',
  isCementMillTPH = false,
  events = [],
  isDualAxis = false,
  usl,
  lsl
}: HighchartsLineChartProps) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

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

  // Function to get event color based on event type
  const getEventColor = () => {
    switch (eventType) {
      case 'RP1':
        return '#FFD700'; // Yellow for RP1
      case 'RP2':
        return '#ED1C24'; // Red for RP2
      default:
        return '#ED1C24'; // Default red for general events
    }
  };

  // Process data for Highcharts format
  const processDataForHighcharts = () => {
    if (isHighPowerSection) {
      // For High Power sections, create series for each sensor line
      const isReducedFeedOperations = title.toLowerCase().includes('reduced feed operations');
      
      let series: any[];
      
      if (isReducedFeedOperations) {
        // For Reduced Feed Operations, create only the calculated raw mill feed rate series
        const mainData = data.map(point => {
          const timestamp = point.timestamp;
          const d49Value = parseFloat(point.D49 || '0');
          const d5Value = parseFloat(point.D5 || '0');
          const calculatedValue = Math.max(0, d49Value - d5Value);
          return [timestamp, calculatedValue];
        });

        series = [{
          type: 'line',
          name: lines[0]?.name || "Raw mill feed rate",
          color: lines[0]?.color || '#3263fc',
          data: mainData,
          visible: !hidden[lines[0]?.name || "Raw mill feed rate"], // Use consistent naming
          lineWidth: 2,
          marker: {
            enabled: false
          },
          states: {
            hover: {
              lineWidth: 3
            }
          }
        }];
      } else {
        // For other High Power sections, create series for each sensor line
        series = lines.map((line, index) => {
          const seriesConfig: any = {
            type: 'line',
            name: line.name,
            color: line.color,
            data: data.map(point => {
              const value = point[line.key];
              // Return null for missing values instead of 0 to avoid incorrect data points
              if (value === undefined || value === null || value === '') {
                return [point.timestamp, null];
              }
              return [point.timestamp, parseFloat(value)];
            }),
            visible: !hidden[line.name], // Use line.name instead of line.key for consistency
            lineWidth: 2,
            fillOpacity: 0, // Ensure no area fill
            fillColor: 'transparent', // Force transparent fill
            threshold: null, // Prevent area fill below threshold
            connectNulls: true, // Connect across null values to avoid gaps in dual-device data
            marker: {
              enabled: false
            },
            states: {
              hover: {
                lineWidth: 3
              }
            }
          };
          
          // For dual-axis plotting (PHF, Kiln Main Drive, and Cooler Fan sections), assign yAxis based on sensor type
          if (isDualAxis) {
            // Kiln Feed (D63) goes on left axis (yAxis: 0)
            // PH Fan sensors (D18, D19), Kiln RPM (D16), and Secondary Air Temperature (D106) go on right axis (yAxis: 1)
            if (line.name.includes('Kiln Feed') || line.key.includes('D63')) {
              seriesConfig.yAxis = 0;
            } else if (line.name.includes('PH Fan') || line.key.includes('D18') || line.key.includes('D19') ||
                       line.name.includes('Kiln RPM') || line.key.includes('D16') ||
                       line.name.includes('Secondary Air') || line.key.includes('D106')) {
              seriesConfig.yAxis = 1;
            }
          }
          
          return seriesConfig;
        });
      }

      // Add event highlighting series
      const eventsToProcess = events.length > 0 ? events : eventRanges.map(range => ({
        startTime: range.start,
        endTime: range.end,
        color: range.color
      }));
      
      // Debug logging for events
      console.log('HighchartsLineChart - Events received:', events);
      console.log('HighchartsLineChart - EventRanges received:', eventRanges);
      console.log('HighchartsLineChart - Events to process:', eventsToProcess);

      if (eventsToProcess && eventsToProcess.length > 0) {
        // Check if this is for Reduced Feed Operations, Both RP Down, or One RP Down
        const isReducedFeedOperations = title.toLowerCase().includes('reduced feed operations');
        const isBothRPDown = title.toLowerCase().includes('both rp down');
        const isSingleRPDown = title.toLowerCase().includes('single rp down') || title.toLowerCase().includes('one rp down');
        
        console.log('Event processing - isReducedFeedOperations:', isReducedFeedOperations);
        console.log('Event processing - isBothRPDown:', isBothRPDown);
        console.log('Event processing - isSingleRPDown:', isSingleRPDown);
        
        if (isReducedFeedOperations) {
          // For Reduced Feed Operations, just highlight the existing line during events
          // The main data series is already created above, so we only need to add event highlights

          // Add event highlighting series (separate series for each individual event)
          const bothRPsEventGroups: any[][] = [];
          const singleRPEventGroups: any[][] = [];
          
          // Group events by their individual boundaries
          eventsToProcess.forEach((event, eventIndex) => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();
            
            // Get all points for this specific event
            const eventPoints = data.filter(point => {
              const pointTime = point.timestamp;
              return pointTime >= eventStart && pointTime <= eventEnd;
            }).map(point => {
              const pointTime = point.timestamp;
              const d49Value = parseFloat(point.D49 || '0');
              const d5Value = parseFloat(point.D5 || '0');
              const calculatedValue = Math.max(0, d49Value - d5Value);
              return [pointTime, calculatedValue];
            });
            
            if (eventPoints.length > 0) {
              if (event.color === '#FFD700') {
                // Both RPs events (yellow)
                bothRPsEventGroups.push(eventPoints);
              } else if (event.color === '#ED1C24') {
                // Single RP events (red)
                singleRPEventGroups.push(eventPoints);
              }
            }
          });

          // Add Both RPs Running series (each group as separate series with same name for legend)
          bothRPsEventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: 'Both RPs Running', // Same name for legend grouping
                color: '#FFD700',
                data: eventGroup,
                visible: !hidden.both_rps_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: false
              });
            }
          });
          
          // Add Single RP Running series (each group as separate series with same name for legend)
          singleRPEventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: 'Single RP Running', // Same name for legend grouping
                color: '#ED1C24',
                data: eventGroup,
                visible: !hidden.single_rp_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: false
              });
            }
          });
        } else if (isBothRPDown) {
          // Both RP Down - Create separate series for each individual event with red color
          const bothRPEventGroups: any[][] = [];
          
          // Group events by their individual boundaries
          eventsToProcess.forEach((event, eventIndex) => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();
            
            // Get all points for this specific event
            const eventPoints = data.filter(point => {
              const pointTime = point.timestamp;
              return pointTime >= eventStart && pointTime <= eventEnd;
            }).map(point => {
              const pointTime = point.timestamp;
              // Use the correct sensor key for the data point
              const sensorKey = lines[0]?.key || 'D49';
              const pointValue = parseFloat(point[sensorKey] || '0');
              console.log(`Event point - sensorKey: ${sensorKey}, pointValue: ${pointValue}, point:`, point);
              return [pointTime, pointValue];
            });
            
            if (eventPoints.length > 0) {
              // All events in Both RP Down are red
              bothRPEventGroups.push(eventPoints);
            }
          });
          
          // Add Both RP Down Events series (each group as separate series with same name for legend)
          bothRPEventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: 'Both RP Down Events', // Same name for legend grouping
                color: '#ED1C24', // Red color for Both RP Down events
                data: eventGroup,
                visible: !hidden.both_rp_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: false
              });
            }
          });
        } else {
          // One RP Down - Create separate series for each individual event
          const rp1EventGroups: any[][] = [];
          const rp2EventGroups: any[][] = [];

          // For Cooler Fan, use Secondary Air Temperature (D106) for drop events
          const isCoolerFan = title.toLowerCase().includes('cooler fan');

          // Group events by their individual boundaries
          eventsToProcess.forEach((event, eventIndex) => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();

            // Get all points for this specific event
            const eventPoints = data.filter(point => {
              const pointTime = point.timestamp;
              return pointTime >= eventStart && pointTime <= eventEnd;
            }).map(point => {
              const pointTime = point.timestamp;
              // For Cooler Fan, use D106 (Secondary Air Temperature) for drop events
              // For other sections, use the first line's sensor key
              const sensorKey = isCoolerFan ? 'D106' : (lines[0]?.key || 'D49');
              const pointValue = parseFloat(point[sensorKey] || '0');
              return [pointTime, pointValue];
            }).filter(point => {
              // For Cooler Fan, filter out low/missing values (< 100) to avoid vertical drops
              // This ensures the red line follows the actual SAT values, not missing data
              if (isCoolerFan) {
                return point[1] > 100; // Filter out values below 100°C (likely missing data)
              }
              return true;
            });
            
            if (eventPoints.length > 0) {
              if (event.color === '#FFD700' || event.color === '#FF6B6B') {
                // RP1 events (yellow)
                rp1EventGroups.push(eventPoints);
              } else if (event.color === '#ED1C24' || event.color === '#4ECDC4') {
                // RP2 events (red)
                rp2EventGroups.push(eventPoints);
              }
            }
          });
          
          // Add RP1 Ramp Events series (each group as separate series with same name for legend)
          rp1EventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: isCementMillTPH ? 'RP1 Stoppages' : 'RP1 Ramp Events', // Same name for legend grouping
                color: '#FFD700',
                data: eventGroup,
                visible: !hidden.rp1_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: false
              });
            }
          });
          
          // Add RP2 Ramp Events / Drop Events series (each group as separate series with same name for legend)
          // Cooler Fan section now shows drop events as red line segments on top of SAT line
          rp2EventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              const seriesConfig: any = {
                type: 'line',
                name: isCementMillTPH ? 'RP2 Stoppages' :
                      (isCoolerFan ? 'Drop Events' :
                       (title.toLowerCase().includes('klin feed') || title.toLowerCase().includes('tph events') ? 'Drop Events' : 'RP2 Ramp Events')),
                color: '#ED1C24',
                data: eventGroup,
                visible: !hidden.rp2_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: isCoolerFan ? true : false // Connect nulls for Cooler Fan to avoid gaps
              };
              // For Cooler Fan, plot drop events on right y-axis (same as Secondary Air Temperature)
              if (isCoolerFan && isDualAxis) {
                seriesConfig.yAxis = 1;
              }
              series.push(seriesConfig);
            }
          });
        }
      }

      // Add target line if provided
      if (targetValue) {
        series.push({
          type: 'line',
          name: 'Target',
          color: '#2eab00',
          data: data.map(point => [point.timestamp, targetValue]),
          visible: !hidden.target,
          lineWidth: 2,
          dashStyle: 'Dash',
          marker: {
            enabled: false
          },
          states: {
            hover: {
              lineWidth: 3
            }
          }
        });
      }

      return series;
    } else {
      // For single line charts (TPH, etc.)
      const mainSensorKey = lines[0]?.key;
      const normalData = data.map(point => {
        // Handle both 'timestamp' and 'time' fields
        const timestamp = point.timestamp || (point.time ? new Date(point.time).getTime() : 0);
        const mainValue = parseFloat(point[mainSensorKey] || '0');
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

        return inEvent ? null : [timestamp, mainValue];
      }).filter(point => point !== null);

      const eventsToProcess = events.length > 0 ? events : eventRanges.map(range => ({
        startTime: range.start,
        endTime: range.end,
        color: range.color
      }));

      const eventData = data.map(point => {
        // Handle both 'timestamp' and 'time' fields
        const timestamp = point.timestamp || (point.time ? new Date(point.time).getTime() : 0);
        const mainValue = parseFloat(point[mainSensorKey] || '0');
        let inEvent = false;

        // Check if point is in any event
        for (const event of eventsToProcess) {
          const start = new Date(event.startTime).getTime();
          const end = new Date(event.endTime).getTime();
          if (timestamp >= start && timestamp <= end) {
            inEvent = true;
            break;
          }
        }

        return inEvent ? [timestamp, mainValue] : null;
      }).filter(point => point !== null);

      // Define colors explicitly
      const blueColor = '#2563eb';  // Bright blue for within bounds
      const redColor = '#ef4444';   // Bright red for outside bounds

      // Debug log
      console.log('Chart zones - LSL:', lsl, 'USL:', usl);

      // Build zones for coloring: Blue within LSL-USL, Red+Bold outside
      // Zones are applied in order - each zone applies UP TO the 'value'
      const getZones = () => {
        if (lsl !== undefined && usl !== undefined) {
          // Zone 1: from -Infinity to LSL = RED (below LSL)
          // Zone 2: from LSL to USL = BLUE (within bounds)
          // Zone 3: from USL to +Infinity = RED (above USL)
          return [
            { value: lsl, color: redColor, lineWidth: 3 },      // All values < LSL: Red, Bold
            { value: usl, color: blueColor, lineWidth: 2 },     // LSL <= values < USL: Blue, Normal
            { color: redColor, lineWidth: 3 }                    // All values >= USL: Red, Bold
          ];
        } else if (lsl !== undefined) {
          return [
            { value: lsl, color: redColor, lineWidth: 3 },      // All values < LSL: Red, Bold
            { color: blueColor, lineWidth: 2 }                   // All values >= LSL: Blue, Normal
          ];
        } else if (usl !== undefined) {
          return [
            { value: usl, color: blueColor, lineWidth: 2 },     // All values < USL: Blue, Normal
            { color: redColor, lineWidth: 3 }                    // All values >= USL: Red, Bold
          ];
        }
        return null;
      };

      const zones = getZones();
      console.log('Chart zones created:', zones);

      // Line with color zones based on LSL/USL bounds
      const seriesConfig: any = {
        type: 'line',
        name: lines[0]?.name || "Raw mill feed rate",
        color: blueColor,
        data: normalData,
        visible: !hidden[lines[0]?.name || "Raw mill feed rate"],
        lineWidth: 2,
        marker: {
          enabled: false
        },
        states: {
          hover: {
            lineWidth: 3
          }
        },
        zoneAxis: 'y',
        zones: zones || [{ color: blueColor }]
      };

      const series: any[] = [seriesConfig];

      // Add event series if there are events
      if (eventData.length > 0) {
        // Check if this is for Reduced Feed Operations, Both RP Down, or One RP Down
        const isReducedFeedOperations = title.toLowerCase().includes('reduced feed operations');
        const isBothRPDown = title.toLowerCase().includes('both rp down');
        
        if (isReducedFeedOperations) {
          // Reduced Feed Operations - Create separate series for each individual event
          const bothRPsEventGroups: any[][] = [];
          const singleRPEventGroups: any[][] = [];
          
          // Group events by their individual boundaries
          eventsToProcess.forEach((event, eventIndex) => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();
            
            // Get all points for this specific event
            const eventPoints = data.filter(point => {
              const pointTime = point.timestamp;
              return pointTime >= eventStart && pointTime <= eventEnd;
            }).map(point => {
              const pointTime = point.timestamp;
              // Use the correct sensor key for the data point
              const sensorKey = lines[0]?.key || 'D49';
              const pointValue = parseFloat(point[sensorKey] || '0');
              console.log(`Event point - sensorKey: ${sensorKey}, pointValue: ${pointValue}, point:`, point);
              return [pointTime, pointValue];
            });
            
            if (eventPoints.length > 0) {
              if (event.color === '#FFD700') {
                // Both RPs events (yellow)
                bothRPsEventGroups.push(eventPoints);
              } else if (event.color === '#ED1C24') {
                // Single RP events (red)
                singleRPEventGroups.push(eventPoints);
              }
            }
          });
          
          // Add Both RPs Running series (each group as separate series with same name for legend)
          bothRPsEventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: 'Both RPs Running', // Same name for legend grouping
                color: '#FFD700',
                data: eventGroup,
                visible: !hidden.both_rps_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: false
              });
            }
          });
          
          // Add Single RP Running series (each group as separate series with same name for legend)
          singleRPEventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: 'Single RP Running', // Same name for legend grouping
                color: '#ED1C24',
                data: eventGroup,
                visible: !hidden.single_rp_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: false
              });
            }
          });
        } else if (isBothRPDown) {
          // Both RP Down - Create separate series for each individual event with red color
          const bothRPEventGroups: any[][] = [];
          
          // Group events by their individual boundaries
          eventsToProcess.forEach((event, eventIndex) => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();
            
            // Get all points for this specific event
            const eventPoints = data.filter(point => {
              const pointTime = point.timestamp;
              return pointTime >= eventStart && pointTime <= eventEnd;
            }).map(point => {
              const pointTime = point.timestamp;
              // Use the correct sensor key for the data point
              const sensorKey = lines[0]?.key || 'D49';
              const pointValue = parseFloat(point[sensorKey] || '0');
              console.log(`Event point - sensorKey: ${sensorKey}, pointValue: ${pointValue}, point:`, point);
              return [pointTime, pointValue];
            });
            
            if (eventPoints.length > 0) {
              // All events in Both RP Down are red
              bothRPEventGroups.push(eventPoints);
            }
          });
          
          // Add Both RP Down Events series (each group as separate series with same name for legend)
          bothRPEventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: 'Both RP Down Events', // Same name for legend grouping
                color: '#ED1C24', // Red color for Both RP Down events
                data: eventGroup,
                visible: !hidden.both_rp_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: false
              });
            }
          });
        } else {
          // One RP Down - Create separate series for each individual event
          const rp1EventGroups: any[][] = [];
          const rp2EventGroups: any[][] = [];

          // For Cooler Fan, use Secondary Air Temperature (D106) for drop events
          const isCoolerFan = title.toLowerCase().includes('cooler fan');

          // Group events by their individual boundaries
          eventsToProcess.forEach((event, eventIndex) => {
            const eventStart = new Date(event.startTime).getTime();
            const eventEnd = new Date(event.endTime).getTime();

            // Get all points for this specific event
            const eventPoints = data.filter(point => {
              const pointTime = point.timestamp;
              return pointTime >= eventStart && pointTime <= eventEnd;
            }).map(point => {
              const pointTime = point.timestamp;
              // For Cooler Fan, use D106 (Secondary Air Temperature) for drop events
              // For other sections, use the first line's sensor key
              const sensorKey = isCoolerFan ? 'D106' : (lines[0]?.key || 'D49');
              const pointValue = parseFloat(point[sensorKey] || '0');
              return [pointTime, pointValue];
            }).filter(point => {
              // For Cooler Fan, filter out low/missing values (< 100) to avoid vertical drops
              // This ensures the red line follows the actual SAT values, not missing data
              if (isCoolerFan) {
                return point[1] > 100; // Filter out values below 100°C (likely missing data)
              }
              return true;
            });
            
            if (eventPoints.length > 0) {
              if (event.color === '#FFD700' || event.color === '#FF6B6B') {
                // RP1 events (yellow)
                rp1EventGroups.push(eventPoints);
              } else if (event.color === '#ED1C24' || event.color === '#4ECDC4') {
                // RP2 events (red)
                rp2EventGroups.push(eventPoints);
              }
            }
          });
          
          // Add RP1 Ramp Events series (each group as separate series with same name for legend)
          rp1EventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: isCementMillTPH ? 'RP1 Stoppages' : 'RP1 Ramp Events', // Same name for legend grouping
                color: '#FFD700',
                data: eventGroup,
                visible: !hidden.rp1_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: false
              });
            }
          });
          
          // Add RP2 Ramp Events / Drop Events series (each group as separate series with same name for legend)
          // Cooler Fan section now shows drop events as red line segments on top of SAT line
          rp2EventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              const seriesConfig: any = {
                type: 'line',
                name: isCementMillTPH ? 'RP2 Stoppages' :
                      (isCoolerFan ? 'Drop Events' :
                       (title.toLowerCase().includes('klin feed') || title.toLowerCase().includes('tph events') ? 'Drop Events' : 'RP2 Ramp Events')),
                color: '#ED1C24',
                data: eventGroup,
                visible: !hidden.rp2_events,
                showInLegend: groupIndex === 0, // Only first series shows in legend
                lineWidth: 3,
                marker: {
                  enabled: false
                },
                states: {
                  hover: {
                    lineWidth: 4
                  }
                },
                connectNulls: isCoolerFan ? true : false // Connect nulls for Cooler Fan to avoid gaps
              };
              // For Cooler Fan, plot drop events on right y-axis (same as Secondary Air Temperature)
              if (isCoolerFan && isDualAxis) {
                seriesConfig.yAxis = 1;
              }
              series.push(seriesConfig);
            }
          });
        }
      }

      // Add target line if provided
      if (targetValue) {
        series.push({
          type: 'line',
          name: 'Target',
          color: '#2eab00',
          data: data.map(point => [point.timestamp, targetValue]),
          visible: !hidden.target,
          lineWidth: 2,
          dashStyle: 'Dash',
          marker: {
            enabled: false
          },
          states: {
            hover: {
              lineWidth: 3
            }
          }
        });
      }

      return series;
    }
  };

  const chartOptions: any = {
    chart: {
      type: 'line',
      height: 400,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zoomType: 'x',
      panning: {
        enabled: true,
        type: 'x'
      },
      panKey: 'shift',
      resetZoomButton: {
        position: {
          align: 'right',
          verticalAlign: 'top',
          x: -10,
          y: 10
        },
        theme: {
          fill: 'white',
          stroke: '#3263fc',
          r: 4,
          states: {
            hover: {
              fill: '#3263fc',
              style: {
                color: 'white'
              }
            }
          }
        }
      },
      events: {
        load: function(this: any) {
          const chart = this;
          // Add mouse wheel zoom support
          const container = chart.container;
          if (container) {
            container.addEventListener('wheel', function(e: WheelEvent) {
              e.preventDefault();
              const xAxis = chart.xAxis[0];
              const extremes = xAxis.getExtremes();
              const range = extremes.max - extremes.min;
              const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9; // Zoom out/in
              const newRange = range * zoomFactor;

              // Get mouse position relative to chart
              const chartX = e.offsetX - chart.plotLeft;
              const chartWidth = chart.plotWidth;
              const mouseRatio = chartX / chartWidth;

              // Calculate new min/max centered on mouse position
              const newMin = extremes.min + (range - newRange) * mouseRatio;
              const newMax = newMin + newRange;

              // Clamp to data range
              const dataMin = extremes.dataMin;
              const dataMax = extremes.dataMax;

              if (newMin >= dataMin && newMax <= dataMax) {
                xAxis.setExtremes(newMin, newMax, true, false);
              } else if (newRange >= (dataMax - dataMin)) {
                // Reset to full view if zoomed out too much
                xAxis.setExtremes(dataMin, dataMax, true, false);
              }
            }, { passive: false });
          }
        }
      }
    },
    title: {
      text: title,
      style: {
        fontSize: '16px',
        fontWeight: 'bold'
      }
    },
    xAxis: {
      type: 'datetime',
      labels: {
        formatter: function(this: any) {
          return formatTimestamp(this.value);
        },
        style: {
          fontSize: '12px'
        }
      },
      gridLineWidth: 1,
      gridLineColor: '#e5e7eb',
      // No plotBands - drop events are shown as red line segments instead
      plotBands: []
    },
    yAxis: isDualAxis ? [
      {
        // Left axis - Kiln Feed (TPH)
        title: {
          text: 'Kiln Feed (TPH)',
          style: {
            color: '#3263fc'
          }
        },
        labels: {
          style: {
            fontSize: '12px',
            color: '#3263fc'
          }
        },
        gridLineColor: '#e5e7eb',
        gridLineDashStyle: 'Dash',
        startOnTick: false,
        endOnTick: false,
        softMin: undefined,
        softMax: undefined
      },
      {
        // Right axis - PH Fan Power, Kiln RPM, or Secondary Air Temperature
        title: {
          text: title.toLowerCase().includes('kiln main drive') ? 'Kiln RPM' :
                title.toLowerCase().includes('cooler fan') ? 'Secondary Air Temp (°C)' : 'PH Fan Power (kW)',
          style: {
            color: '#ff8d13'
          }
        },
        labels: {
          style: {
            fontSize: '12px',
            color: '#ff8d13'
          }
        },
        opposite: true,
        gridLineColor: '#e5e7eb',
        gridLineDashStyle: 'Dash',
        startOnTick: false,
        endOnTick: false
      }
    ] : {
      title: {
        text: ''
      },
      labels: {
        style: {
          fontSize: '12px'
        }
      },
      gridLineColor: '#e5e7eb',
      gridLineDashStyle: 'Dash',
      startOnTick: false,
      endOnTick: false,
      // Let Highcharts auto-scale to fit both data and USL/LSL lines
      // softMin/softMax ensure USL/LSL are visible but won't crop data
      softMin: lsl !== undefined ? lsl - (Math.abs(lsl) * 0.05) : undefined,
      softMax: usl !== undefined ? usl + (Math.abs(usl) * 0.05) : undefined,
      // Add USL (Upper Specification Limit) and LSL (Lower Specification Limit) lines
      plotLines: [
        ...(usl !== undefined ? [{
          value: usl,
          color: '#65ae00', // Dark green color for USL
          dashStyle: 'Dash' as const,
          width: 2,
          label: {
            text: `USL: ${usl.toFixed(2)}`,
            align: 'right' as const,
            style: {
              color: '#65ae00',
              fontWeight: 'bold',
              fontSize: '11px'
            }
          },
          zIndex: 5
        }] : []),
        ...(lsl !== undefined ? [{
          value: lsl,
          color: '#65ae00', // Dark green color for LSL (same as USL)
          dashStyle: 'Dash' as const,
          width: 2,
          label: {
            text: `LSL: ${lsl.toFixed(2)}`,
            align: 'right' as const,
            style: {
              color: '#65ae00',
              fontWeight: 'bold',
              fontSize: '11px'
            }
          },
          zIndex: 5
        }] : [])
      ]
    },
    tooltip: {
      shared: true,
      formatter: function(this: any) {
        const timestamp = formatTimestamp(this.x);
        let tooltip = `<b>${timestamp}</b><br/>`;
        if (this.points) {
          this.points.forEach((point: any) => {
            if (point.series.visible && point.y !== null && point.y !== undefined) {
              // Replace the dot with a small square styled inline
              const roundedY = Number(point.y).toFixed(2);
              let unit = '';
              
              // Add appropriate units for dual-axis charts
              if (isDualAxis) {
                if (point.series.name.includes('Kiln Feed') || point.series.name.includes('D63')) {
                  unit = ' TPH';
                } else if (point.series.name.includes('PH Fan') || point.series.name.includes('D18') || point.series.name.includes('D19')) {
                  unit = ' kW';
                } else if (point.series.name.includes('Kiln RPM') || point.series.name.includes('D16')) {
                  unit = ' RPM';
                } else if (point.series.name.includes('Secondary Air') || point.series.name.includes('D106')) {
                  unit = ' °C';
                }
              } else {
                unit = ' Feed Rate';
              }
              
              tooltip += `<span style="display:inline-block;width:8px;height:8px;background:${point.color};margin-right:4px;border-radius:2px;vertical-align:middle;"></span> ${point.series.name}: <b>${roundedY}${unit}</b><br/>`;
            }
          });
        } else if (this.y !== undefined) {
          // Single point hover fallback
          const roundedY = Number(this.y).toFixed(2);
          tooltip += `<b>Feed Rate: ${roundedY}</b>`;
        }
        return tooltip;
      },
      backgroundColor: 'white',
      borderColor: '#ccc',
      borderRadius: 4,
      shadow: true,
      style: {
        fontSize: '12px'
      }
    },
    legend: {
      enabled: true,
      align: 'center',
      verticalAlign: 'bottom',
      layout: 'horizontal',
      itemStyle: {
        fontSize: '12px'
      }
    },
    plotOptions: {
      line: {
        animation: true,
        enableMouseTracking: true,
        connectNulls: false,
        lineWidth: 2,
        turboThreshold: 0, // Disable turbo mode to allow zones to work properly
        fillOpacity: 0, // Ensure no area fill for line charts
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true,
              radius: 4
            }
          }
        }
      },
      area: {
        fillOpacity: 0, // Disable area fill if any series accidentally uses area type
        lineWidth: 2,
        fillColor: 'transparent'
      },
      spline: {
        fillOpacity: 0,
        fillColor: 'transparent'
      },
      areaspline: {
        fillOpacity: 0,
        fillColor: 'transparent'
      },
      series: {
        fillOpacity: 0,
        fillColor: 'transparent',
        threshold: null,
        states: {
          inactive: {
            opacity: 1 // Prevent dimming of non-active series
          },
          hover: {
            lineWidth: 3
          }
        },
        events: {
          legendItemClick: function(this: any, e: any) {
            e.preventDefault();
            const seriesName = this.name;
            setHidden(prev => ({ ...prev, [seriesName]: !prev[seriesName] }));
            return false; // Prevent default legend behavior
          }
        }
      }
    },
    series: processDataForHighcharts(),
    credits: {
      enabled: false
    },
    exporting: {
      enabled: false
    },
    rangeSelector: {
      enabled: false
    },
    navigator: {
      enabled: false
    },
    scrollbar: {
      enabled: true,
      barBackgroundColor: '#e5e7eb',
      barBorderRadius: 4,
      barBorderWidth: 0,
      buttonBackgroundColor: '#f3f4f6',
      buttonBorderWidth: 0,
      buttonBorderRadius: 4,
      buttonArrowColor: '#6b7280',
      rifleColor: '#9ca3af',
      trackBackgroundColor: '#f9fafb',
      trackBorderWidth: 1,
      trackBorderColor: '#e5e7eb',
      trackBorderRadius: 4,
      height: 14,
      liveRedraw: true
    },
    boost: {
      useGPUTranslations: true,
      seriesThreshold: 5000,  // Disable boost for small datasets to allow zones to work
      enabled: false  // Disable boost module entirely to support zones
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <HighchartsReact 
        highcharts={Highcharts} 
        options={chartOptions}
        key={JSON.stringify(hidden)} // Force re-render when hidden state changes
      />
    </div>
  );
} 