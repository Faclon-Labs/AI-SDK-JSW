"use client"

import React, { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, ChevronDown, ChevronRight, Download, Filter, LogOut, Search, Settings, X } from "lucide-react"
import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useDiagnosticData } from "./hooks/useDiagnosticData"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TrendChart from "./components/TrendChart"
import { TimeRangePicker, TimeRange } from "./components/ui/TimeRangePicker";
import { Popover, PopoverTrigger, PopoverContent } from "./components/ui/popover";

// Utility functions for formatting
const formatNumber = (value: any): string => {
  if (value === null || value === undefined || value === "N/A") {
    return "N/A";
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return String(value);
  }
  return num.toFixed(2);
};

const formatTime = (value: any): string => {
  if (value === null || value === undefined || value === "N/A") {
    return "N/A";
  }
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return String(value);
    }
    
    // Format as YYYY-MM-DD HH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return String(value);
  }
};

// Function to highlight numbers in text
const highlightNumbers = (text: any) => {
  if (text === null || text === undefined) return "";
  const str = String(text);
  const parts = str.split(/(\d+(?:\.\d+)?)/);
  return parts.map((part, index) => {
    if (/^\d+(?:\.\d+)?$/.test(part)) {
      return (
        <span key={index} className="text-blue-600 font-semibold">
          {part}
        </span>
      );
    }
    return part;
  });
};

export default function Component() {
  const { diagnosticData, loading, error } = useDiagnosticData();
  const [selectedFilter, setSelectedFilter] = useState<"high" | "medium" | "low" | "all">("all")
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [popupData, setPopupData] = useState<{isOpen: boolean, data: any, section: string, backendData?: any}>({
    isOpen: false,
    data: null,
    section: "",
    backendData: null
  })
  // Add state for time picker modal and range
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>({
    startDate: new Date().toISOString().slice(0, 10),
    startTime: "00:00",
    endDate: new Date().toISOString().slice(0, 10),
    endTime: "23:59",
  });

  // Format range for display
  const displayRange = `${selectedRange.startDate} - ${selectedRange.endDate}`;

  // Function to extract real device ID from payload
  const extractDeviceId = (data: any): string | null => {
    if (!data) return null;
    
    // Search for device IDs in the payload
    const searchForDeviceId = (obj: any): string | null => {
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          // Look for device-related keys
          if (key.toLowerCase().includes('device') || key.toLowerCase().includes('deviceid')) {
            if (typeof value === 'string' && value.includes('ABBRWML')) {
              return value;
            }
          }
          // Look for ABBRWML strings anywhere
          if (typeof value === 'string' && value.includes('ABBRWML')) {
            return value;
          }
          // Recursively search nested objects
          if (typeof value === 'object' && value !== null) {
            const result = searchForDeviceId(value);
            if (result) return result;
          }
        }
      }
      return null;
    };
    
    return searchForDeviceId(data);
  };

  // Function to extract sensor IDs from payload
  const extractSensorIds = (data: any, section: string): string[] | null => {
    if (!data) return null;
    
    // Look for sensor data in the specific section
    const sectionData = data[section];
    if (!sectionData) return null;
    
    // Check if section has sensor information
    if (sectionData.sensor) {
      if (Array.isArray(sectionData.sensor)) {
        return sectionData.sensor;
      } else if (typeof sectionData.sensor === 'object') {
        return Object.keys(sectionData.sensor);
      } else {
        return [sectionData.sensor];
      }
    }
    
    // Look for sensor IDs in nested objects
    const searchForSensors = (obj: any): string[] | null => {
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (key.toLowerCase().includes('sensor') || key.toLowerCase().includes('sensorid')) {
            if (Array.isArray(value)) {
              return value;
            } else if (typeof value === 'string') {
              return [value];
            }
          }
          // Recursively search nested objects
          if (typeof value === 'object' && value !== null) {
            const result = searchForSensors(value);
            if (result) return result;
          }
        }
      }
      return null;
    };
    
    return searchForSensors(sectionData);
  };

  // Function to check if trend data should be shown
  const shouldShowTrend = (data: any, section: string): boolean => {
    const deviceId = extractDeviceId(data);
    const sensorIds = extractSensorIds(data, section);
    
    return !!(deviceId && sensorIds && sensorIds.length > 0);
  };

  // Debug: Log the payload structure
  useEffect(() => {
    if (diagnosticData.length > 0) {
      console.log('Diagnostic Data Structure:', diagnosticData[0]);
      console.log('Backend Data Structure:', diagnosticData[0]?.backendData);
      console.log('TPH Structure:', diagnosticData[0]?.backendData?.TPH);
      console.log('High Power Structure:', diagnosticData[0]?.backendData?.High_Power);
      
      // Debug device and sensor information
      const firstItem = diagnosticData[0];
      if (firstItem?.backendData) {
        console.log('=== DEVICE AND SENSOR DEBUG ===');
        
        // Log the entire backendData structure to find device IDs
        console.log('Full Backend Data:', JSON.stringify(firstItem.backendData, null, 2));
        
        // Extract real device ID
        const realDeviceId = extractDeviceId(firstItem.backendData);
        console.log('Extracted Real Device ID:', realDeviceId);
        
        // Check TPH section
        if (firstItem.backendData.TPH) {
          console.log('TPH Device:', firstItem.backendData.TPH.device);
          console.log('TPH Sensor:', firstItem.backendData.TPH.sensor);
          if (firstItem.backendData.TPH["Reduced Feed Operations"]) {
            console.log('Reduced Feed Operations Device:', firstItem.backendData.TPH["Reduced Feed Operations"].device);
            console.log('Reduced Feed Operations Sensor:', firstItem.backendData.TPH["Reduced Feed Operations"].sensor);
          }
        }
        
        // Check High Power section
        if (firstItem.backendData.High_Power) {
          console.log('High Power Device:', firstItem.backendData.High_Power.device);
          console.log('High Power Sensor:', firstItem.backendData.High_Power.sensor);
          if (firstItem.backendData.High_Power.SKS_FAN) {
            console.log('SKS Fan Device:', firstItem.backendData.High_Power.SKS_FAN.device);
            console.log('SKS Fan Sensor:', firstItem.backendData.High_Power.SKS_FAN.sensor);
          }
          if (firstItem.backendData.High_Power.mill_auxiliaries) {
            console.log('Mill Auxiliaries Device:', firstItem.backendData.High_Power.mill_auxiliaries.device);
            console.log('Mill Auxiliaries Sensor:', firstItem.backendData.High_Power.mill_auxiliaries.sensor);
          }
          if (firstItem.backendData.High_Power.product_transportation) {
            console.log('Product Transportation Device:', firstItem.backendData.High_Power.product_transportation.device);
            console.log('Product Transportation Sensor:', firstItem.backendData.High_Power.product_transportation.sensor);
          }
        }
        
        // Look for device IDs in the entire structure
        console.log('=== SEARCHING FOR DEVICE IDS ===');
        const searchForDeviceIds = (obj: any, path: string = '') => {
          if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key;
              if (key.toLowerCase().includes('device') || key.toLowerCase().includes('deviceid')) {
                console.log(`Found device at ${currentPath}:`, value);
              }
              if (typeof value === 'string' && value.includes('ABBRWML')) {
                console.log(`Found ABBRWML device at ${currentPath}:`, value);
              }
              if (typeof value === 'object' && value !== null) {
                searchForDeviceIds(value, currentPath);
              }
            }
          }
        };
        searchForDeviceIds(firstItem.backendData);
        console.log('=== END DEVICE AND SENSOR DEBUG ===');
      }
    }
  }, [diagnosticData]);

  // Create expanded data from real backend data
  const expandedData = diagnosticData.reduce((acc, item, index) => {
    acc[index] = {
      targetSPC: item.details?.targetSPC || "N/A",
      daySPC: item.details?.daySPC || "N/A", 
      deviation: item.details?.deviation || "N/A",
      impact: item.details?.impact || "N/A"
    };
    return acc;
  }, {} as Record<number, { targetSPC: string; daySPC: string; deviation: string; impact: string }>);

  const toggleRowExpansion = (index: number) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index)
    } else {
      newExpandedRows.add(index)
    }
    setExpandedRows(newExpandedRows)
  }

  const openPopup = (data: any, section: string, backendData?: any) => {
    setPopupData({
      isOpen: true,
      data,
      section,
      backendData
    })
  }

  const closePopup = () => {
    setPopupData({
      isOpen: false,
      data: null,
      section: "",
      backendData: null
    })
  }

  const filteredData = diagnosticData.filter((item) => {
    if (selectedFilter === "all") return true
    return item.status.toLowerCase() === selectedFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading diagnostic data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Automatic Diagnosis and Recommendation Dashboard</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-4 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                Raw Mill
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Raw Mill</DropdownMenuItem>
              <DropdownMenuItem>Cement Mill</DropdownMenuItem>
              <DropdownMenuItem>Coal Mill</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Replace DropdownMenu for date range with Duration button and popover */}
          <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                Duration : <span className="font-semibold">Today</span>
                <span className="ml-2">{displayRange}</span>
                <CalendarDays className="w-4 h-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0 max-w-fit shadow-xl border rounded-lg">
              <TimeRangePicker
                value={selectedRange}
                onChange={setSelectedRange}
                onCancel={() => setTimePickerOpen(false)}
                onApply={() => setTimePickerOpen(false)}
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
            <span className="font-medium">Insight:</span>
            <span className="font-mono">INS_015ce0dcf91c</span>
            <span>•</span>
            <span className="font-medium">Results:</span>
            <span>{diagnosticData.length}</span>
            <span>•</span>
            <span className="font-medium">Range:</span>
            <span>Real-time data</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            onClick={() => setSelectedFilter(selectedFilter === "high" ? "all" : "high")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "high" ? "bg-red-500 text-white shadow-md" : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            High ({diagnosticData.filter((item) => item.status.toLowerCase() === "high").length})
          </div>

          <div
            onClick={() => setSelectedFilter(selectedFilter === "medium" ? "all" : "medium")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "medium"
                ? "bg-yellow-500 text-white shadow-md"
                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            }`}
          >
            Medium ({diagnosticData.filter((item) => item.status.toLowerCase() === "medium").length})
          </div>

          <div
            onClick={() => setSelectedFilter(selectedFilter === "low" ? "all" : "low")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "low"
                ? "bg-green-500 text-white shadow-md"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            Low ({diagnosticData.filter((item) => item.status.toLowerCase() === "low").length})
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Diagnostic View</CardTitle>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search faults, assets, or status..." className="pl-10 pr-10" />
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Mill Name</TableHead>
                  <TableHead>Detected Issue</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[180px]">Last Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <React.Fragment key={index}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-medium">{item.millName}</TableCell>
                      <TableCell className="text-sm text-gray-700">{item.issue}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status.toLowerCase() === "high" ? "destructive" : item.status.toLowerCase() === "medium" ? "secondary" : "outline"
                          }
                          className={
                            item.status.toLowerCase() === "high"
                              ? "bg-red-100 text-red-800 hover:bg-red-100"
                              : item.status.toLowerCase() === "medium"
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                : "bg-green-100 text-green-800 hover:bg-green-100"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{item.lastUpdated}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => toggleRowExpansion(index)}
                        >
                          {expandedRows.has(index) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(index) && expandedData[index as keyof typeof expandedData] && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-gray-50 p-6">
                          <div className="space-y-6">
                            {/* Level 1: KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-xs font-medium text-gray-600">Target SPC</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-xl font-bold text-gray-900">
                                    {expandedData[index as keyof typeof expandedData].targetSPC}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                                    <span className="text-xs text-green-600 font-medium">Target</span>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-xs font-medium text-gray-600">Day SPC</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-xl font-bold text-gray-900">
                                    {expandedData[index as keyof typeof expandedData].daySPC}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                                    <span className="text-xs text-red-600 font-medium">Above Target</span>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-xs font-medium text-gray-600">Deviation</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-xl font-bold text-red-600">
                                    {expandedData[index as keyof typeof expandedData].deviation}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                                    <span className="text-xs text-red-600 font-medium">Above Target</span>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-xs font-medium text-gray-600">Impact</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-xl font-bold text-gray-900">
                                    {item.status}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                        item.status.toLowerCase().includes("high") ||
                                        item.status.toLowerCase().includes("critical") ||
                                        item.status.toLowerCase().includes("severe")
                                          ? "bg-red-500"
                                          : item.status.toLowerCase().includes("medium") || item.status.toLowerCase().includes("moderate")
                                            ? "bg-yellow-500"
                                            : "bg-green-500"
                                      }`}
                                    ></div>
                                    <span
                                      className={`text-xs font-medium ${
                                        item.status.toLowerCase().includes("high") ||
                                        item.status.toLowerCase().includes("critical") ||
                                        item.status.toLowerCase().includes("severe")
                                          ? "text-red-600"
                                          : item.status.toLowerCase().includes("medium") || item.status.toLowerCase().includes("moderate")
                                            ? "text-yellow-600"
                                            : "text-green-600"
                                      }`}
                                    >
                                      {item.status} Impact
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Level 3: Accordions */}
                            <div className="bg-white rounded-lg border">
                              <Accordion
                                type="multiple"
                                className="w-full"
                                defaultValue={["lower-output", "idle-running", "high-power"]}
                              >
                                <AccordionItem value="lower-output" className="border-b">
                                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-900 font-bold">Lower Output (TPH)</span>
                                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 112 0v11.586l2.293-2.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="font-medium text-gray-900">)</span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    <div className="space-y-4">
                                      {/* TPH Cause from backend */}
                                      {filteredData[index]?.backendData?.TPH?.cause && (
                                        <p className="text-gray-700">
                                          {filteredData[index].backendData.TPH.cause}
                                        </p>
                                      )}

                                      {/* One RP Down Section */}
                                      {filteredData[index]?.backendData?.TPH?.one_rp_down && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900">One RP Down</h4>
                                            <button
                                              onClick={() => openPopup(filteredData[index].backendData.TPH.one_rp_down.rampup, "One RP Down", filteredData[index].backendData)}
                                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                                              title="View trend chart"
                                            >
                                              <svg
                                                className="w-4 h-4 text-blue-600"
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
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {Array.isArray(filteredData[index].backendData.TPH.one_rp_down) ? 
                                              filteredData[index].backendData.TPH.one_rp_down.map((item: any, i: number) => (
                                                <div key={`one-rp-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`one-rp-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {value}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">{item}</span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )) : (
                                                <div className="space-y-1">
                                                  {typeof filteredData[index].backendData.TPH.one_rp_down === 'object' ? 
                                                    Object.entries(filteredData[index].backendData.TPH.one_rp_down)
                                                      .filter(([key]) => /^\d+$/.test(key)) // Only numbered keys
                                                      .map(([key, value], j) => (
                                                      <div key={`one-rp-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(value)}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(JSON.stringify(filteredData[index].backendData.TPH.one_rp_down))}
                                                        </span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )
                                            }
                                          </div>
                                        </div>
                                      )}

                                      {/* Both RP Down Section */}
                                      {filteredData[index]?.backendData?.TPH?.both_rp_down && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900">Both RP Down</h4>
                                            <button
                                              onClick={() => openPopup(filteredData[index].backendData.TPH.both_rp_down, "Both RP Down", filteredData[index].backendData)}
                                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                                              title="View trend chart"
                                            >
                                              <svg
                                                className="w-4 h-4 text-blue-600"
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
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {Array.isArray(filteredData[index].backendData.TPH.both_rp_down) ? 
                                              filteredData[index].backendData.TPH.both_rp_down.map((item: any, i: number) => (
                                                <div key={`both-rp-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`both-rp-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {value}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">{item}</span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )) : (
                                                <div className="space-y-1">
                                                  {typeof filteredData[index].backendData.TPH.both_rp_down === 'object' ? 
                                                    Object.entries(filteredData[index].backendData.TPH.both_rp_down)
                                                      .filter(([key]) => /^\d+$/.test(key)) // Only numbered keys
                                                      .map(([key, value], j) => (
                                                      <div key={`both-rp-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(value)}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(JSON.stringify(filteredData[index].backendData.TPH.both_rp_down))}
                                                        </span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )
                                            }
                                          </div>
                                        </div>
                                      )}

                                      {/* Reduced Feed Operations Section */}
                                      {filteredData[index]?.backendData?.TPH?.["Reduced Feed Operations"] && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900">Reduced Feed Operations</h4>
                                            <button
                                              onClick={() => openPopup(filteredData[index].backendData.TPH.lowfeed, "Reduced Feed Operations", filteredData[index].backendData)}
                                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                                              title="View trend chart"
                                            >
                                              <svg
                                                className="w-4 h-4 text-blue-600"
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
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {Array.isArray(filteredData[index].backendData.TPH["Reduced Feed Operations"]) ? 
                                              filteredData[index].backendData.TPH["Reduced Feed Operations"].map((item: any, i: number) => (
                                                <div key={`reduced-feed-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`reduced-feed-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(value)}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">{highlightNumbers(item)}</span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )) : (
                                                <div className="space-y-1">
                                                  {typeof filteredData[index].backendData.TPH["Reduced Feed Operations"] === 'object' ? 
                                                    Object.entries(filteredData[index].backendData.TPH["Reduced Feed Operations"]).map(([key, value], j: number) => (
                                                      <div key={`reduced-feed-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(value)}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(JSON.stringify(filteredData[index].backendData.TPH["Reduced Feed Operations"]))}
                                                        </span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )
                                            }
                                          </div>
                                          
                                          
                                        </div>
                                      )}


                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="idle-running" className="border-b">
                                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                                    <span className="text-gray-900 font-bold">Idle Running</span>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    {filteredData[index]?.backendData?.idle_running?.cause ? (
                                      <p className="text-gray-700">
                                        {highlightNumbers(filteredData[index].backendData.idle_running.cause)}
                                      </p>
                                    ) : (
                                      <p className="text-gray-700">
                                        No idle running data available.
                                      </p>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="high-power">
                                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                                    <span className="text-gray-900 font-bold">High Power</span>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    {filteredData[index]?.backendData?.High_Power ? (
                                      <div className="space-y-4">
                                        {filteredData[index].backendData.High_Power.SKS_FAN && (
                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-semibold text-gray-900">SKS Fan</h4>
                                              <button
                                                onClick={() => openPopup(filteredData[index].backendData.High_Power.SKS_FAN, "SKS Fan", filteredData[index].backendData)}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                title="View trend chart"
                                              >
                                                <svg
                                                  className="w-4 h-4 text-blue-600"
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
                                              </button>
                                            </div>
                                            {filteredData[index].backendData.High_Power.SKS_FAN.cause && (
                                              <p className="text-sm text-gray-700 mb-3">
                                                {highlightNumbers(filteredData[index].backendData.High_Power.SKS_FAN.cause)}
                                              </p>
                                            )}
                                            <div className="space-y-2">
                                              {Object.entries(filteredData[index].backendData.High_Power.SKS_FAN)
                                                .filter(([key, value]) => !isNaN(Number(key)) && typeof value === 'string')
                                                .map(([key, value], i: number) => (
                                                  <div key={`sks-fan-${index}-${i}`} className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                    <span className="text-sm text-gray-600">
                                                      {highlightNumbers(value)}
                                                    </span>
                                                  </div>
                                                ))
                                              }
                                            </div>
                                            

                                          </div>
                                        )}
                                        {filteredData[index].backendData.High_Power.mill_auxiliaries && (
                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-semibold text-gray-900">Mill Auxiliaries</h4>
                                              <button
                                                onClick={() => openPopup(filteredData[index].backendData.High_Power.mill_auxiliaries, "Mill Auxiliaries", filteredData[index].backendData)}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                title="View trend chart"
                                              >
                                                <svg
                                                  className="w-4 h-4 text-blue-600"
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
                                              </button>
                                            </div>
                                            {filteredData[index].backendData.High_Power.mill_auxiliaries.cause && (
                                              <p className="text-sm text-gray-700 mb-3">
                                                {highlightNumbers(filteredData[index].backendData.High_Power.mill_auxiliaries.cause)}
                                              </p>
                                            )}
                                            <div className="space-y-2">
                                              {Object.entries(filteredData[index].backendData.High_Power.mill_auxiliaries)
                                                .filter(([key, value]) => !isNaN(Number(key)) && typeof value === 'string')
                                                .map(([key, value], i: number) => (
                                                  <div key={`mill-aux-${index}-${i}`} className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                    <span className="text-sm text-gray-600">
                                                      {highlightNumbers(value)}
                                                    </span>
                                                  </div>
                                                ))
                                              }
                                            </div>
                                            

                                          </div>
                                        )}
                                        {filteredData[index].backendData.High_Power.product_transportation && (
                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-semibold text-gray-900">Product Transportation</h4>
                                              <button
                                                onClick={() => openPopup(filteredData[index].backendData.High_Power.product_transportation, "Product Transportation", filteredData[index].backendData)}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                title="View trend chart"
                                              >
                                                <svg
                                                  className="w-4 h-4 text-blue-600"
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
                                              </button>
                                            </div>
                                            {filteredData[index].backendData.High_Power.product_transportation.cause && (
                                              <p className="text-sm text-gray-700 mb-3">
                                                {highlightNumbers(filteredData[index].backendData.High_Power.product_transportation.cause)}
                                              </p>
                                            )}
                                            <div className="space-y-2">
                                              {Object.entries(filteredData[index].backendData.High_Power.product_transportation)
                                                .filter(([key, value]) => !isNaN(Number(key)) && typeof value === 'string')
                                                .map(([key, value], i: number) => (
                                                  <div key={`product-transport-${index}-${i}`} className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                    <span className="text-sm text-gray-600">
                                                      {highlightNumbers(value)}
                                                    </span>
                                                  </div>
                                                ))
                                              }
                                            </div>
                                            

                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-gray-700">
                                        No high power data available.
                                      </p>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Popup Modal */}
      {popupData.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-full max-h-[100vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {popupData.section} - Detailed Analysis
              </h3>
              <button
                onClick={closePopup}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <Tabs defaultValue="table" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="table">Table Data</TabsTrigger>
                  <TabsTrigger value="trend">Trend Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="table" className="mt-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Data Table</h4>
                    {popupData.data && Array.isArray(popupData.data) ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {popupData.section === "Reduced Feed Operations" ? (
                                <>
                                  <TableHead className="w-[150px]">Start Time</TableHead>
                                  <TableHead className="w-[150px]">End Time</TableHead>
                                  <TableHead className="w-[120px]">Duration (min)</TableHead>
                                  <TableHead className="w-[120px]">Pumps Running</TableHead>
                                  <TableHead className="w-[120px]">Average TPH</TableHead>
                                  <TableHead className="w-[120px]">Minimum TPH</TableHead>
                                  <TableHead className="w-[120px]">Maximum TPH</TableHead>
                                </>
                              ) : popupData.section.includes("RP Down") && Array.isArray(popupData.data) && popupData.data.length > 0 && popupData.data[0].scenario ? (
                                <>
                                  <TableHead className="w-[200px]">Scenario</TableHead>
                                  <TableHead className="w-[150px]">Ramp Start</TableHead>
                                  <TableHead className="w-[150px]">Ramp End</TableHead>
                                  <TableHead className="w-[150px]">Duration (min)</TableHead>
                                  <TableHead className="w-[120px]">Final TPH</TableHead>
                                  <TableHead className="w-[200px]">Stability Reason</TableHead>
                                </>
                              ) : (
                                <>
                                  <TableHead className="w-[200px]">Scenario</TableHead>
                                  <TableHead className="w-[150px]">Ramp Start</TableHead>
                                  <TableHead className="w-[150px]">Ramp End</TableHead>
                                  <TableHead className="w-[150px]">Duration (min)</TableHead>
                                  <TableHead className="w-[120px]">Final TPH</TableHead>
                                </>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {popupData.data.map((item: any, i: number) => (
                              <TableRow key={i}>
                                {popupData.section === "Reduced Feed Operations" ? (
                                  <>
                                    <TableCell>{formatTime(item.period_start)}</TableCell>
                                    <TableCell>{formatTime(item.period_end)}</TableCell>
                                    <TableCell>{formatNumber(item.duration_minutes)}</TableCell>
                                    <TableCell>{item.pumps_running === 1 ? "Single" : item.pumps_running === 2 ? "Both" : item.pumps_running || "N/A"}</TableCell>
                                    <TableCell>{formatNumber(item.avg_tph)}</TableCell>
                                    <TableCell>{formatNumber(item.min_tph)}</TableCell>
                                    <TableCell>{formatNumber(item.max_tph)}</TableCell>
                                  </>
                                ) : popupData.section.includes("RP Down") && Array.isArray(popupData.data) && item.scenario ? (
                                  <>
                                    <TableCell className="font-medium">{item.scenario || `Event ${i + 1}`}</TableCell>
                                    <TableCell>{formatTime(item.ramp_start)}</TableCell>
                                    <TableCell>{formatTime(item.ramp_end)}</TableCell>
                                    <TableCell>{formatNumber(item.duration_minutes)}</TableCell>
                                    <TableCell>{formatNumber(item.final_tph)}</TableCell>
                                    <TableCell>{item.stability_reason || ""}</TableCell>
                                  </>
                                ) : (
                                  <>
                                    <TableCell className="font-medium">{item.scenario || `Event ${i + 1}`}</TableCell>
                                    <TableCell>{formatTime(item.ramp_start) !== 'N/A' && !isNaN(Date.parse(item.ramp_start)) ? formatTime(item.ramp_start) : (item.start_time ? formatTime(item.start_time) : (item.period_start ? formatTime(item.period_start) : 'N/A'))}</TableCell>
                                    <TableCell>{formatTime(item.ramp_end) !== 'N/A' && !isNaN(Date.parse(item.ramp_end)) ? formatTime(item.ramp_end) : (item.end_time ? formatTime(item.end_time) : (item.period_end ? formatTime(item.period_end) : 'N/A'))}</TableCell>
                                    <TableCell>{formatNumber(item.duration_minutes)}</TableCell>
                                    <TableCell>{formatNumber(item.final_tph)}</TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-gray-500">No table data available</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="trend" className="mt-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Trend Analysis</h4>
                    <div className="bg-white rounded p-4 border">
                      <p className="text-gray-600 mb-4">
                        Real-time trend analysis for {popupData.section.toLowerCase()} data.
                        The chart shows sensor values over time for the selected period.
                      </p>
                      
                      {/* Show trend chart only if data and device/sensor info is available */}
                      {popupData.data && (
                        <div className="space-y-4">
                          {/* TPH Trend Chart for all TPH subsections */}
                          {["Reduced Feed Operations", "One RP Down", "Both RP Down"].includes(popupData.section) && popupData.backendData?.TPH?.sensor && popupData.backendData?.TPH?.Device && (
                            <TrendChart
                              deviceId={popupData.backendData.TPH.Device}
                              sensorList={Object.keys(popupData.backendData.TPH.sensor)}
                              startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                              endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                              title={`${popupData.section} Trend`}
                              events={
                                popupData.data && Array.isArray(popupData.data) 
                                  ? popupData.data.map((item: any, index: number) => {
                                      let startTime, endTime;
                                      
                                      if (popupData.section === "Reduced Feed Operations") {
                                        startTime = item.period_start || item.start_time;
                                        endTime = item.period_end || item.end_time;
                                      } else if (popupData.section.includes("RP Down")) {
                                        startTime = item.ramp_start || item.start_time;
                                        endTime = item.ramp_end || item.end_time;
                                      }
                                      
                                      return {
                                        startTime,
                                        endTime,
                                        color: undefined // Will use default color from TrendChart
                                      };
                                    }).filter((event: any) => event.startTime && event.endTime)
                                  : undefined
                              }
                            />
                          )}
                          
                          {/* SKS Fan Trend Chart */}
                          {popupData.section === "SKS Fan" && shouldShowTrend(popupData.backendData, "High_Power") && (
                            <TrendChart
                              deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                              sensorList={extractSensorIds(popupData.backendData, "High_Power") || ["sks_fan_sensor_001", "sks_fan_sensor_002"]}
                              startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                              endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                              title="SKS Fan Trend"
                            />
                          )}
                          
                          {/* Mill Auxiliaries Trend Chart */}
                          {popupData.section === "Mill Auxiliaries" && shouldShowTrend(popupData.backendData, "High_Power") && (
                            <TrendChart
                              deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                              sensorList={extractSensorIds(popupData.backendData, "High_Power") || ["mill_aux_sensor_001", "mill_aux_sensor_002"]}
                              startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                              endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                              title="Mill Auxiliaries Trend"
                            />
                          )}
                          
                          {/* Product Transportation Trend Chart */}
                          {popupData.section === "Product Transportation" && shouldShowTrend(popupData.backendData, "High_Power") && (
                            <TrendChart
                              deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                              sensorList={extractSensorIds(popupData.backendData, "High_Power") || ["transport_sensor_001", "transport_sensor_002"]}
                              startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                              endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                              title="Product Transportation Trend"
                            />
                          )}
                          
                          {/* Show message if no trend data available */}
                          
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
