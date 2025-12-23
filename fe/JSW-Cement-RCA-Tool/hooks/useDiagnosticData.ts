import { useState, useEffect } from 'react';
import { fetchAllInsightResults, fetchInsightResultsByTimeRange, TimeRange } from '../lib/api';

// Process parameter interface
export interface ProcessParam {
  Parameter: string;
  '<Low%': number;
  'Target%': number;
  '>High%': number;
}

// Custom interface to match the actual payload structure
interface CustomInsightResult {
  _id: string;
  tags: string[];
  insightID: string;
  applicationID: any;
  applicationType: string;
  process_params?: ProcessParam[];
  result: {
    [section: string]: {
      process_params?: ProcessParam[];
      TPH?: {
        RP1_maintance?: any[];
        RP2_maintance?: any[];
        cause?: string;
        one_rp_down?: any;
        both_rp_down?: any;
        "Reduced Feed Operations"?: any;
        rampup?: any[];
        lowfeed?: any[];
        Device?: string;
        target?: number;
        sensor?: any;
        [key: string]: any;
      };
      High_Power?: {
        rp1?: any;
        "580SR1 VFD (580FN1+580SR1)_SPC"?: any;
        "Product Transportation_SPC"?: any;
        [key: string]: any;
      };
      SPC?: {
        target?: number;
        today?: number;
        deviation?: number;
        Impact?: string;
      };
      detected_issue?: string;
      query_time?: string[];
      idle_running?: {
        cause?: string;
      };
      Qulity?: {
        table?: any[];
        "45_"?: {
          [key: string]: any;
        };
        "90_"?: {
          [key: string]: any;
        };
        "Blaine_"?: {
          [key: string]: any;
        };
      };
      klin?: {
        cause?: string;
        target?: number;
        sensor?: {
          [key: string]: any;
        };
        table?: any[];
        TPH?: {
          sudden_drop?: {
            [key: string]: string;
          };
          events?: Array<{
            start: string;
            end: string;
            duration_min: number;
            min_value: number;
            day_mean: number;
            drop_percent: number;
          }>;
          sensor?: {
            [key: string]: string;
          };
          Device?: string;
          target?: number;
        };
        High_Power?: {
          [key: string]: {
            cause?: string;
          };
        };
        SPC?: {
          target?: number;
          today?: number;
          deviation?: number;
          Impact?: string;
        };
        detected_issue?: string;
        query_time?: string[];
        [key: string]: any;
      };
      Kiln?: {
        cause?: string;
        target?: number;
        sensor?: {
          [key: string]: any;
        };
        table?: any[];
        TPH?: {
          sudden_drop?: {
            [key: string]: string;
          };
          events?: Array<{
            start: string;
            end: string;
            duration_min: number;
            min_value: number;
            day_mean: number;
            drop_percent: number;
          }>;
          sensor?: {
            [key: string]: string;
          };
          Device?: string;
          target?: number;
        };
        High_Power?: {
          [key: string]: {
            cause?: string;
          };
        };
        SPC?: {
          target?: number;
          today?: number;
          deviation?: number;
          Impact?: string;
        };
        detected_issue?: string;
        query_time?: string[];
        [key: string]: any;
      };
      [key: string]: any;
    };
  };
  resultName: string;
  insightProperty: any[];
  metadata: any;
  invocationTime: string;
  applicationAliasID: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface DiagnosticData {
  millName: string;
  sectionName: string; // Add section name (e.g., "Cement Mill 1")
  issue: string;
  status: string; // Changed from strict union to string to handle any status value
  lastUpdated: string;
  timestamp: string; // Raw timestamp
  resultName: string; // Result name from backend
  processParams?: ProcessParam[]; // Process parameters data
  details?: {
    targetSPC?: string;
    daySPC?: string;
    deviation?: string;
    impact?: string;
  };
  // Add detailed backend data - now matches the sectioned structure
  backendData?: {
    TPH?: {
      cause?: string;
      one_rp_down?: any;
      both_rp_down?: any;
      "Reduced Feed Operations"?: any;
      rampup?: any[];
      lowfeed?: any[];
      Device?: string;
      target?: number;
      sensor?: any;
      RP1_maintance?: any[];
      RP2_maintance?: any[];
      [key: string]: any;
    };
    High_Power?: {
      rp1?: any;
      "580SR1 VFD (580FN1+580SR1)_SPC"?: any;
      "Product Transportation_SPC"?: any;
      [key: string]: any;
    };
    idle_running?: {
      cause?: string;
    };
    SPC?: {
      target?: number;
      today?: number;
      deviation?: number;
      Impact?: string;
    };
    detected_issue?: string;
    query_time?: string[];
    Qulity?: {
      table?: any[];
      "45_"?: {
        [key: string]: any;
      };
      "90_"?: {
        [key: string]: any;
      };
      "Blaine_"?: {
        [key: string]: any;
      };
    };
    klin?: {
      cause?: string;
      target?: number;
      sensor?: {
        [key: string]: any;
      };
      table?: any[];
      TPH?: {
        sudden_drop?: {
          [key: string]: string;
        };
        events?: Array<{
          start: string;
          end: string;
          duration_min: number;
          min_value: number;
          day_mean: number;
          drop_percent: number;
        }>;
        sensor?: {
          [key: string]: string;
        };
        Device?: string;
        target?: number;
      };
      High_Power?: {
        [key: string]: {
          cause?: string;
        };
      };
      SPC?: {
        target?: number;
        today?: number;
        deviation?: number;
        Impact?: string;
      };
      detected_issue?: string;
      query_time?: string[];
      [key: string]: any;
    };
    Kiln?: {
      cause?: string;
      target?: number;
      sensor?: {
        [key: string]: any;
      };
      table?: any[];
      TPH?: {
        sudden_drop?: {
          [key: string]: string;
        };
        events?: Array<{
          start: string;
          end: string;
          duration_min: number;
          min_value: number;
          day_mean: number;
          drop_percent: number;
        }>;
        sensor?: {
          [key: string]: string;
        };
        Device?: string;
        target?: number;
      };
      High_Power?: {
        [key: string]: {
          cause?: string;
        };
      };
      SPC?: {
        target?: number;
        today?: number;
        deviation?: number;
        Impact?: string;
      };
      detected_issue?: string;
      query_time?: string[];
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// Helper function to classify status based on SPC deviation percentage
// Ranges: Normal: 0-2%, Low: 2-5%, Medium: 5-10%, High: 10-100%
function classifyStatusByDeviation(deviationPercent: number | undefined): string {
  if (deviationPercent === undefined || deviationPercent === null || isNaN(deviationPercent)) {
    return 'N/A';
  }
  
  // Use absolute value for classification
  const absDeviation = Math.abs(deviationPercent);
  
  if (absDeviation >= 0 && absDeviation < 2) {
    return 'Normal';
  } else if (absDeviation >= 2 && absDeviation < 5) {
    return 'Low';
  } else if (absDeviation >= 5 && absDeviation < 10) {
    return 'Medium';
  } else if (absDeviation >= 10 && absDeviation <= 100) {
    return 'High';
  } else {
    // For values > 100%, classify as High
    return 'High';
  }
}

// Helper function to process section data
function processSectionDataDirectly(sectionData: any, originalResult: any, transformedData: DiagnosticData[], index: number) {
  const sectionKeys = Object.keys(sectionData);
  console.log(`Processing section data directly for result ${index}:`, sectionKeys);
  
  sectionKeys.forEach(sectionName => {
    const resultData = sectionData[sectionName];
    
    // Extract the main issue
    const detectedIssue = typeof resultData.detected_issue === 'string' ? resultData.detected_issue : 'Issue detected';
    
    // Format date
    const date = new Date(originalResult.invocationTime);
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Extract details
    let deviationStr = undefined;
    if (typeof resultData.SPC?.today === 'number' && typeof resultData.SPC?.target === 'number' && typeof resultData.SPC?.deviation === 'number') {
      const diff = resultData.SPC.today - resultData.SPC.target;
      const diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(2);
      const percentStr = resultData.SPC.deviation.toFixed(2) + '%';
      deviationStr = `${diffStr} (${percentStr})`;
    }
    const details = {
      targetSPC: resultData.SPC?.target ? `${resultData.SPC.target.toFixed(2)} kWh/t` : undefined,
      daySPC: resultData.SPC?.today ? `${resultData.SPC.today.toFixed(2)} kWh/t` : undefined,
      deviation: deviationStr,
      impact: resultData.SPC?.Impact || 'N/A'
    };

    // Classify status based on SPC deviation percentage
    const deviationPercent = resultData.SPC?.deviation;
    const status = classifyStatusByDeviation(deviationPercent);
    const impactValue = resultData.SPC?.Impact || 'N/A';
    
    const transformedItem = {
      millName: originalResult.resultName || "Raw Mill",
      sectionName: sectionName,
      issue: detectedIssue,
      status: status,
      lastUpdated: formattedDate,
      timestamp: originalResult.invocationTime,
      resultName: originalResult.resultName || "Raw Mill",
      processParams: resultData.process_params || (originalResult as CustomInsightResult).process_params,
      details: {
        ...details,
        impact: impactValue
      },
      backendData: resultData
    };

    console.log('Adding transformed item from direct processing:', transformedItem);
    transformedData.push(transformedItem);
  });
}

export function useDiagnosticData(timeRange?: TimeRange) {
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAndTransformData() {
      setLoading(true);
      setError(null);
      
      try {
        let results;
        
        if (timeRange) {
          // Use time range if provided
          results = await fetchInsightResultsByTimeRange(timeRange);
        } else {
          // Fallback to fetching all results
          results = await fetchAllInsightResults();
        }
        
        // Transform backend data into frontend format - create separate entries for each section
        const transformedData: DiagnosticData[] = [];
        
        // Check if results might be nested
        if (results && typeof results === 'object' && !Array.isArray(results)) {
          if ('data' in (results as any)) {
            if (Array.isArray((results as any).data)) {
              results = (results as any).data; // Use the nested data
            }
          }
        }
        
        results.forEach((result: any, index: number) => {
          // Cast to custom interface to access the result property
          const customResult = result as CustomInsightResult;

          // Check if result has the expected structure
          if (!customResult.result) {
            console.warn(`Result ${index} has no result property:`, customResult);
            // Try to access the data directly
            console.log('Trying to access data directly from result object...');
            console.log('Available properties:', Object.keys(customResult));
            
            // Check if data might be in a different property
            if ('data' in customResult) {
              console.log('Found data property:', customResult.data);
            }
            if ('payload' in customResult) {
              console.log('Found payload property:', customResult.payload);
            }
            
            // Try to find the actual data structure
            for (const key of Object.keys(customResult)) {
              const value = (customResult as any)[key];
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                console.log(`Checking property ${key}:`, value);
                // Look for section-like data
                const sectionKeys = Object.keys(value);
                if (sectionKeys.length > 0 && sectionKeys.some((k: string) => typeof value[k] === 'object')) {
                  console.log(`Found potential section data in ${key}:`, sectionKeys);
                  // Process this data directly
                  processSectionDataDirectly(value, customResult, transformedData, index);
                  return;
                }
              }
            }
            
            return; // Skip this result
          }
          
          // Handle new payload structure: result.result[section] instead of result.result
          if (customResult.result && typeof customResult.result === 'object') {
            // Get all section keys (e.g., "Cement Mill 1", "Raw Mill", etc.)
            const sectionKeys = Object.keys(customResult.result);
            console.log('Section keys found:', sectionKeys);
            
            if (sectionKeys.length === 0) {
              console.warn(`No section keys found for result ${index}`);
              return;
            }
            
            // Create separate entries for each section
            sectionKeys.forEach(sectionName => {
              const resultData = customResult.result[sectionName];
              
              // Extract the main issue
              const detectedIssue = typeof resultData.detected_issue === 'string' ? resultData.detected_issue : 'Issue detected';
              
              // Format date
              const date = new Date(result.invocationTime);
              const formattedDate = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              
              // Extract details
              let deviationStr = undefined;
              if (typeof resultData.SPC?.today === 'number' && typeof resultData.SPC?.target === 'number' && typeof resultData.SPC?.deviation === 'number') {
                const diff = resultData.SPC.today - resultData.SPC.target;
                const diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(2);
                const percentStr = resultData.SPC.deviation.toFixed(2) + '%';
                deviationStr = `${diffStr} (${percentStr})`;
              }
              const details = {
                targetSPC: resultData.SPC?.target ? `${resultData.SPC.target.toFixed(2)} kWh/t` : undefined,
                daySPC: resultData.SPC?.today ? `${resultData.SPC.today.toFixed(2)} kWh/t` : undefined,
                deviation: deviationStr,
                impact: resultData.SPC?.Impact || 'N/A'
              };

              // Classify status based on SPC deviation percentage
              const deviationPercent = resultData.SPC?.deviation;
              const status = classifyStatusByDeviation(deviationPercent);
              const impactValue = resultData.SPC?.Impact || 'N/A';
              
              const transformedItem = {
                millName: result.resultName || "Raw Mill",
                sectionName: sectionName, // Include the actual section name
                issue: detectedIssue,
                status: status,
                lastUpdated: formattedDate,
                timestamp: result.invocationTime, // Raw timestamp
                resultName: result.resultName || "Raw Mill", // Result name
                processParams: resultData.process_params || customResult.process_params, // Include process parameters from section or top level
                details: {
                  ...details,
                  impact: impactValue
                },
                backendData: resultData // Include all the detailed backend data
              };

              console.log('Adding transformed item:', transformedItem);
              transformedData.push(transformedItem);
            });
          } else {
            // Fallback for old structure or unexpected structure
            console.log(`Result ${index} using fallback structure`);
            const resultData = customResult.result as any; // Cast to any for fallback
            
            // Extract the main issue
            const detectedIssue = typeof resultData?.detected_issue === 'string' ? resultData.detected_issue : 'Issue detected';
            
            // Format date
            const date = new Date(result.invocationTime);
            const formattedDate = date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            
            // Extract details
            let deviationStr = undefined;
            if (typeof resultData?.SPC?.today === 'number' && typeof resultData?.SPC?.target === 'number' && typeof resultData?.SPC?.deviation === 'number') {
              const diff = resultData.SPC.today - resultData.SPC.target;
              const diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(2);
              const percentStr = resultData.SPC.deviation.toFixed(2) + '%';
              deviationStr = `${diffStr} (${percentStr})`;
            }
            const details = {
              targetSPC: resultData?.SPC?.target ? `${resultData.SPC.target.toFixed(2)} kWh/t` : undefined,
              daySPC: resultData?.SPC?.today ? `${resultData.SPC.today.toFixed(2)} kWh/t` : undefined,
              deviation: deviationStr,
              impact: resultData?.SPC?.Impact || 'N/A'
            };

            // Classify status based on SPC deviation percentage
            const deviationPercent = resultData?.SPC?.deviation;
            const status = classifyStatusByDeviation(deviationPercent);
            const impactValue = resultData?.SPC?.Impact || 'N/A';
            
            transformedData.push({
              millName: result.resultName || "Raw Mill",
              sectionName: "Default", // Default section name for old structure
              issue: detectedIssue,
              status: status,
              lastUpdated: formattedDate,
              timestamp: result.invocationTime, // Raw timestamp
              resultName: result.resultName || "Raw Mill", // Result name
              details: {
                ...details,
                impact: impactValue
              },
              backendData: resultData // Include all the detailed backend data
            });
          }
        });
        
        console.log('Final transformed data:', transformedData);
        console.log('Number of transformed items:', transformedData.length);
        
        if (transformedData.length === 0) {
          console.warn('No data was transformed. This might indicate a data structure issue.');
          // Create a fallback entry to show something in the UI
          const fallbackData: DiagnosticData[] = [{
            millName: "No Data",
            sectionName: "No Data",
            issue: "No data available for the selected insight",
            status: "N/A",
            lastUpdated: new Date().toLocaleDateString('en-GB'),
            timestamp: new Date().toISOString(),
            resultName: "No Data",
            details: {
              targetSPC: "N/A",
              daySPC: "N/A",
              deviation: "N/A",
              impact: "N/A"
            },
            backendData: {}
          }];
          setDiagnosticData(fallbackData);
        } else {
          setDiagnosticData(transformedData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAndTransformData();
  }, [timeRange]); // Add timeRange as dependency

  return { diagnosticData, loading, error };
} 