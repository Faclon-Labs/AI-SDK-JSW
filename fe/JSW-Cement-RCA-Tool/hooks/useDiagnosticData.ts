import { useState, useEffect } from 'react';
import { fetchAllInsightResults, fetchInsightResultsByTimeRange, TimeRange } from '../lib/api';

// TimeRange interface is now imported from api.ts

interface DiagnosticData {
  millName: string;
  issue: string;
  status: "High" | "Medium" | "Low";
  lastUpdated: string;
  timestamp: string; // Raw timestamp
  resultName: string; // Result name from backend
  details?: {
    targetSPC?: string;
    daySPC?: string;
    deviation?: string;
    impact?: string;
  };
  // Add detailed backend data - now represents section data (e.g., Raw Mill section)
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
      mill_auxiliaries?: any;
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
    [key: string]: any;
  };
  // Add the original result structure for access to all sections
  originalResult?: {
    [sectionName: string]: any;
  };
  // Add the new result structure for direct access to section data
  result?: {
    [sectionName: string]: any;
  };
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
        let results: any[] = [];
        
        // Use real API calls
        console.log('Fetching real data from backend with timeRange:', timeRange);
        try {
          if (timeRange) {
            // Use time range if provided
            console.log('Calling fetchInsightResultsByTimeRange...');
            results = await fetchInsightResultsByTimeRange(timeRange);
          } else {
            // Fallback to fetching all results
            console.log('Calling fetchAllInsightResults...');
            results = await fetchAllInsightResults();
          }
          console.log('API call successful, results length:', results?.length);
        } catch (apiError) {
          console.error('API call failed:', apiError);
          throw apiError;
        }
        
        console.log('Raw API Results:', results);
        console.log('Results type:', typeof results);
        console.log('Results length:', results?.length);
        
        // If no results from API, log the issue
        if (!results || results.length === 0) {
          console.log('No API results received from backend');
        }
        
        // Transform backend data into frontend format
        const transformedData: DiagnosticData[] = [];
        
        results.forEach((result, index) => {
          // Handle new structure where data is organized by sections
          const resultData = result.result;
          
          // Get all section names from the result
          const sectionNames = Object.keys(resultData || {});
          
          console.log(`Processing result ${index}:`, {
            sectionNames,
            resultName: result.resultName
          });
          
          // Create a separate record for each section
          sectionNames.forEach(sectionName => {
            const sectionData = resultData[sectionName] || {};
            
            console.log(`Processing section "${sectionName}":`, {
              sectionDataKeys: Object.keys(sectionData)
            });
            
            // Extract the main issue from the section data
            const detectedIssue = sectionData.detected_issue || 'Issue detected';
            
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
            
            // Extract details from the section data
            let deviationStr = undefined;
            if (typeof sectionData.SPC?.today === 'number' && typeof sectionData.SPC?.target === 'number' && typeof sectionData.SPC?.deviation === 'number') {
              const diff = sectionData.SPC.today - sectionData.SPC.target;
              const diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(2);
              const percentStr = sectionData.SPC.deviation.toFixed(2) + '%';
              deviationStr = `${diffStr} (${percentStr})`;
            }
            const details = {
              targetSPC: sectionData.SPC?.target ? `${sectionData.SPC.target} kWh/t` : undefined,
              daySPC: sectionData.SPC?.today ? `${sectionData.SPC.today.toFixed(2)} kWh/t` : undefined,
              deviation: deviationStr,
              impact: sectionData.SPC?.Impact || 'N/A'
            };

            // Get status and impact from the same source - SPC.Impact
            const impactValue = sectionData.SPC?.Impact || 'N/A';
            
            transformedData.push({
              millName: sectionName, // Use the actual section name
              issue: detectedIssue,
              status: impactValue,
              lastUpdated: formattedDate,
              timestamp: result.invocationTime, // Raw timestamp
              resultName: sectionName, // Use the actual section name
              details: {
                ...details,
                impact: impactValue
              },
              backendData: sectionData, // Include the section data
              originalResult: resultData, // Include the original result for access to all sections
              result: { [sectionName]: sectionData } // Include only this section's data
            });
          });
        });
        
        setDiagnosticData(transformedData);
      } catch (err) {
        console.error('Error in useDiagnosticData:', err);
        setError(err instanceof Error ? err.message : 'Error fetching data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAndTransformData();
  }, [timeRange]); // Add timeRange as dependency

  return { diagnosticData, loading, error };
} 