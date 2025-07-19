import React, { useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

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
  events?: Array<{
    startTime: string;
    endTime: string;
    color?: string;
  }>; // Add individual events with colors
}

export default function HighchartsLineChart({ 
  data, 
  lines, 
  title, 
  eventRanges = [], 
  targetValue, 
  isHighPowerSection = false,
  eventType = 'general',
  events = []
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
          visible: !hidden.normal,
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
        series = lines.map(line => ({
          type: 'line',
          name: line.name,
          color: line.color,
          data: data.map(point => [point.timestamp, parseFloat(point[line.key] || '0')]),
          visible: !hidden[line.key],
          lineWidth: 2,
          marker: {
            enabled: false
          },
          states: {
            hover: {
              lineWidth: 3
            }
          }
        }));
      }

      // Add event highlighting series
      const eventsToProcess = events.length > 0 ? events : eventRanges.map(range => ({
        startTime: range.start,
        endTime: range.end,
        color: range.color
      }));

      if (eventsToProcess && eventsToProcess.length > 0) {
        // Check if this is for Reduced Feed Operations, Both RP Down, or One RP Down
        const isReducedFeedOperations = title.toLowerCase().includes('reduced feed operations');
        const isBothRPDown = title.toLowerCase().includes('both rp down');
        
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
              const pointValue = parseFloat(point[lines[0]?.key || 'D49'] || '0');
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
              const pointValue = parseFloat(point[lines[0]?.key || 'D49'] || '0');
              return [pointTime, pointValue];
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
                name: 'RP1 Ramp Events', // Same name for legend grouping
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
          
          // Add RP2 Ramp Events series (each group as separate series with same name for legend)
          rp2EventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: 'RP2 Ramp Events', // Same name for legend grouping
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
                connectNulls: false
              });
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
        const timestamp = point.timestamp;
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
        const timestamp = point.timestamp;
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

      const series: any[] = [
        {
          type: 'line',
          name: lines[0]?.name || "Raw mill feed rate",
          color: lines[0]?.color || '#3263fc',
          data: normalData,
          visible: !hidden.normal,
          lineWidth: 2,
          marker: {
            enabled: false
          },
          states: {
            hover: {
              lineWidth: 3
            }
          }
        }
      ];

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
              const pointValue = parseFloat(point[lines[0]?.key || 'D49'] || '0');
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
              const pointValue = parseFloat(point[lines[0]?.key || 'D49'] || '0');
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
              const pointValue = parseFloat(point[lines[0]?.key || 'D49'] || '0');
              return [pointTime, pointValue];
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
                name: 'RP1 Ramp Events', // Same name for legend grouping
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
          
          // Add RP2 Ramp Events series (each group as separate series with same name for legend)
          rp2EventGroups.forEach((eventGroup, groupIndex) => {
            if (eventGroup.length > 0) {
              series.push({
                type: 'line',
                name: 'RP2 Ramp Events', // Same name for legend grouping
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
                connectNulls: false
              });
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
      zoomType: 'xy',
      panning: {
        enabled: true,
        type: 'xy'
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
      gridLineColor: '#e5e7eb'
    },
    yAxis: {
      title: {
        text: ''
      },
      labels: {
        style: {
          fontSize: '12px'
        }
      },
      gridLineColor: '#e5e7eb',
      gridLineDashStyle: 'Dash'
    },
    tooltip: {
      formatter: function(this: any) {
        const timestamp = formatTimestamp(this.x);
        let tooltip = `<b>${timestamp}</b><br/>`;
        
        this.points?.forEach((point: any) => {
          if (point.series.visible) {
            tooltip += `<span style="color: ${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
          }
        });
        
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
        animation: false,
        enableMouseTracking: true,
        connectNulls: false
      },
      series: {
        events: {
          legendItemClick: function(this: any, e: any) {
            e.preventDefault();
            setHidden(prev => ({ ...prev, [this.name]: !prev[this.name] }));
            this.setVisible(!this.visible);
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
      enabled: false
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </div>
  );
} 