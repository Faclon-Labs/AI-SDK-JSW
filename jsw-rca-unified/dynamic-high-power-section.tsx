import React from 'react';
import { Plus, X, Pencil } from 'lucide-react';

interface DynamicHighPowerSectionProps {
  item: any; // The actual data item (instead of filteredData + index)
  selectedMillType: string;
  openPopup: (data: any, section: string, backendData: any) => void;
  openPlusPopup: (section: string, sectionName?: string, targetPath?: string, _id?: string, insightID?: string, applicationType?: string, existingBackendData?: any) => void;
  shouldShowTrend: (data: any, section: string) => boolean;
  highlightNumbers: (text: any) => React.ReactNode;
  extractDeviceId: (data: any) => string | null;
  extractSensorIds: (data: any, section: string) => string[] | null;
  extractSensorNames: (data: any, section: string) => Record<string, string> | undefined;
  pendingUserInputs?: Record<string, Record<string, Array<{ text: string; id: string }>>>;
  onDeletePendingInput?: (itemId: string, targetPath: string, inputId: string, inputText: string) => void;
  onEditPendingInput?: (itemId: string, targetPath: string, inputId: string, inputText: string) => void;
}

export const DynamicHighPowerSection: React.FC<DynamicHighPowerSectionProps> = ({
  item,
  selectedMillType,
  openPopup,
  openPlusPopup,
  shouldShowTrend,
  highlightNumbers,
  extractDeviceId,
  extractSensorIds,
  extractSensorNames,
  pendingUserInputs = {},
  onDeletePendingInput,
  onEditPendingInput
}) => {
  // Debug logging to verify correct data is being passed
  console.log('=== DynamicHighPowerSection Debug ===');
  console.log('Timestamp:', item?.timestamp);
  console.log('SectionName:', item?.sectionName);
  console.log('Impact:', item?.details?.impact);
  console.log('Date:', item?.lastUpdated);
  console.log('High_Power (direct):', JSON.stringify(item?.backendData?.High_Power, null, 2));
  console.log('klin.High_Power:', JSON.stringify(item?.backendData?.klin?.High_Power, null, 2));
  console.log('Kiln.High_Power:', JSON.stringify(item?.backendData?.Kiln?.High_Power, null, 2));
  console.log('=== End Debug ===');

  // Get High_Power data - check multiple locations for Kiln section
  // Priority: direct High_Power, then klin.High_Power, then Kiln.High_Power
  const getHighPowerData = () => {
    if (item?.backendData?.High_Power) {
      return item.backendData.High_Power;
    }
    // For Kiln section, check nested structures
    if (item?.sectionName === "Kiln") {
      if (item?.backendData?.klin?.High_Power) {
        return item.backendData.klin.High_Power;
      }
      if (item?.backendData?.Kiln?.High_Power) {
        return item.backendData.Kiln.High_Power;
      }
    }
    return null;
  };

  const highPowerData = getHighPowerData();

  // Check if data exists
  if (!highPowerData) {
    return (
      <div className="space-y-4">
        <p className="text-gray-700">No high power data available.</p>
      </div>
    );
  }
  

  // Helper function to check if data is valid
  const isValidSectionData = (data: any): boolean => {
    return data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
  };

  // Helper function to extract numbered points
  const extractNumberedPoints = (data: any): Array<{key: string, value: string}> => {
    if (!data || typeof data !== 'object') return [];
    
    return Object.entries(data)
      .filter(([key, value]) => {
        return !isNaN(Number(key)) && typeof value === 'string' && value.trim().length > 0;
      })
      .map(([key, value]) => ({ key, value: String(value) }))
      .sort((a, b) => Number(a.key) - Number(b.key));
  };

  // Helper function to get cause
  const getCause = (data: any): string | null => {
    return data?.cause || data?.Cause || data?.CAUSE || null;
  };

  // Helper function to get display name for section
  const getDisplayName = (key: string): string => {
    switch (key) {
      case 'rp1': return 'RP1';
      case 'rp2': return 'RP2';
      case 'SKS_FAN': return 'SKS Fan';
      case 'mill_auxiliaries': return 'Mill Auxiliaries';
      case 'Product Transportation MCC15_SPC': return 'Product Transportation MCC15';
      case 'Product Transportation_SPC': return 'Product Transportation';
      case 'product_transportation': return 'Product Transportation';
      case 'pre_process': return 'Pre Process';
      case 'OPC Mill Feeding_SPC': return 'OPC Mill Feeding';
      case 'bag_house_fan': return 'Bag House Fan';
      case 'cooler_fan': return 'Cooler Fan';
      case 'phf1': return 'Preheater Fan 1';
      case 'phf2': return 'Preheater Fan 2';
      case 'Klin_main_drive_1': return 'Kiln Main Drive 1';
      case 'Klin_main_drive_2': return 'Kiln Main Drive 2';
      default: return key;
    }
  };

  // Render section component with exact same UI structure
  const renderSection = (key: string, data: any, theme: any) => {
    if (!isValidSectionData(data) || key === 'Device') return null;

    const cause = getCause(data);
    const numberedPoints = extractNumberedPoints(data);
    
    // For RP1 and RP2, only show cause, skip numbered points
    const isRP1OrRP2 = key === 'rp1' || key === 'rp2';

    return (
      <div key={key} className={`${theme.bg} rounded-lg p-4 border ${theme.border}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`font-semibold ${theme.text} text-base`}>
            {getDisplayName(key)}
          </h4>
          <div className="flex items-center gap-2">
            {/* Plus Icon Button */}
            <button
              onClick={() => openPlusPopup(
                getDisplayName(key),
                item?.sectionName || "Kiln",
                `High_Power.${key}`,
                item?._id || "",
                item?.insightID || "",
                item?.applicationType || "Workbench",
                item?.backendData || {}
              )}
              className="relative overflow-hidden transition-all duration-300 ease-in-out hover:bg-blue-100 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 shadow-md hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 group"
              title="Add user note"
            >
              <Plus
                className="w-3 h-3 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-90 relative z-10 text-blue-700 group-hover:text-blue-800"
              />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </button>

            {/* Chart Icon Button */}
            <button
              onClick={() => openPopup(data, getDisplayName(key), item?.backendData)}
              className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
                shouldShowTrend(item.backendData, getDisplayName(key))
                  ? "hover:bg-blue-100 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 shadow-md hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 group"
                  : "text-gray-400 cursor-not-allowed opacity-50 bg-gray-100 rounded-xl p-2"
              }`}
              title={shouldShowTrend(item.backendData, getDisplayName(key)) ? "View trend chart" : "No trend data available"}
              disabled={!shouldShowTrend(item.backendData, getDisplayName(key))}
            >
              <svg
                className={`w-3 h-3 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-3 relative z-10 ${
                  shouldShowTrend(item.backendData, getDisplayName(key)) ? 'text-blue-700 group-hover:text-blue-800' : 'text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              {shouldShowTrend(item.backendData, getDisplayName(key)) && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </button>
          </div>
        </div>
        
        {cause && (
          <p className={`text-base ${theme.text} mb-3 opacity-90`}>
            {highlightNumbers(cause)}
          </p>
        )}
        
        {/* Only show numbered points for non-RP1/RP2 sections */}
        {!isRP1OrRP2 && numberedPoints.length > 0 && (
          <div className="space-y-2">
            {numberedPoints.map((point, i) => (
              <div key={`${key}-${item.timestamp}-${i}`} className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 ${theme.dot} rounded-full mt-2 flex-shrink-0`}></div>
                <span className={`text-base ${theme.text} opacity-80`}>
                  {highlightNumbers(point.value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Show pending user inputs with sky blue highlight */}
        {pendingUserInputs[item?._id]?.[`High_Power.${key}`]?.map((pendingInput) => (
          <div key={pendingInput.id} className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-md px-2 py-1 mt-2 animate-pulse">
            <div className="w-1.5 h-1.5 bg-sky-400 rounded-full flex-shrink-0"></div>
            <span className="text-base text-sky-700 font-medium flex-1">
              {pendingInput.text}
            </span>
            <span className="text-[10px] text-sky-500 animate-pulse">(pending save)</span>
            {onEditPendingInput && (
              <button
                onClick={() => onEditPendingInput(item?._id, `High_Power.${key}`, pendingInput.id, pendingInput.text)}
                className="p-0.5 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0"
                title="Edit pending input"
              >
                <Pencil className="w-3 h-3 text-blue-500 hover:text-blue-700" />
              </button>
            )}
            {onDeletePendingInput && (
              <button
                onClick={() => onDeletePendingInput(item?._id, `High_Power.${key}`, pendingInput.id, pendingInput.text)}
                className="p-0.5 hover:bg-red-100 rounded-full transition-colors flex-shrink-0"
                title="Delete pending input"
              >
                <X className="w-3 h-3 text-red-500 hover:text-red-700" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Define themes for different sections - matching the exact UI structure
  const themes = {
    // Raw Mill sections
    SKS_FAN: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-900",
      hover: "hover:bg-gray-100 text-gray-600",
      hoverBg: "bg-gradient-to-r from-gray-50 to-gray-100",
      dot: "bg-gray-400"
    },
    mill_auxiliaries: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-900",
      hover: "hover:bg-gray-100 text-gray-600",
      hoverBg: "bg-gradient-to-r from-gray-50 to-gray-100",
      dot: "bg-gray-400"
    },
    product_transportation: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-900",
      hover: "hover:bg-gray-100 text-gray-600",
      hoverBg: "bg-gradient-to-r from-gray-50 to-gray-100",
      dot: "bg-gray-400"
    },
    
    // Cement Mill sections
    rp1: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-900",
      hover: "hover:bg-gray-100 text-gray-600",
      hoverBg: "bg-gradient-to-r from-gray-50 to-gray-100",
      dot: "bg-gray-400"
    },
    rp2: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-900",
      hover: "hover:bg-gray-100 text-gray-600",
      hoverBg: "bg-gradient-to-r from-gray-50 to-gray-100",
      dot: "bg-gray-400"
    },
    "Product Transportation MCC15_SPC": {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-900",
      hover: "hover:bg-gray-100 text-gray-600",
      hoverBg: "bg-gradient-to-r from-gray-50 to-gray-100",
      dot: "bg-gray-400"
    },
    "Product Transportation_SPC": {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-900",
      hover: "hover:bg-gray-100 text-gray-600",
      hoverBg: "bg-gradient-to-r from-gray-50 to-gray-100",
      dot: "bg-gray-400"
    }
  };

  // Get default theme for unknown sections - using the same gray theme
  const getDefaultTheme = () => ({
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-900",
    hover: "hover:bg-gray-100 text-gray-600",
    hoverBg: "bg-gradient-to-r from-gray-50 to-gray-100",
    dot: "bg-gray-400"
  });

  // Render all available sections with consistent UI
  const entries = Object.entries(highPowerData);

  const sections = entries
    .map(([key, data]) => {
      const theme = themes[key as keyof typeof themes] || getDefaultTheme();
      return renderSection(key, data, theme);
    })
    .filter(Boolean);

  if (sections.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-gray-700">
          No valid high power sections found for {selectedMillType}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections}
    </div>
  );
};
