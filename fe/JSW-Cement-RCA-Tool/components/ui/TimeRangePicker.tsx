import React, { useState } from 'react';
import { Calendar } from './calendar';
import { Button } from './button';
import { Input } from './input';
import { DateRange } from 'react-day-picker';

const PRESETS = [
  'Custom',
  'Today',
  'Yesterday',
  'Current Week',
  'Previous Week',
  'Previous 7 Days',
  'Current Month',
  'Previous Month',
  'Previous 3 Months',
  'Previous 12 Months',
  'Current Year',
  'Previous Year',
];

export interface TimeRange {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  onCancel: () => void;
  onApply: () => void;
}

// Helper to format Date to YYYY-MM-DD
function formatDateYMD(date: Date | undefined): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({ value, onChange, onCancel, onApply }) => {
  const [selectedPreset, setSelectedPreset] = useState('Today');
  const [range, setRange] = useState<TimeRange>({
    ...value,
    startDate: value.startDate,
    endDate: value.endDate,
  });
  // For calendar range selection
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: range.startDate ? new Date(range.startDate) : undefined,
    to: range.endDate ? new Date(range.endDate) : undefined,
  });

  // Handlers
  const handlePresetClick = (preset: string) => {
    setSelectedPreset(preset);
    // TODO: Update range based on preset
  };

  const handleInputChange = (field: keyof TimeRange, val: string) => {
    // Always expect YYYY-MM-DD from input
    const newRange = { ...range, [field]: val };
    setRange(newRange);
    onChange(newRange);
    // Sync calendar if start/end date changes
    if (field === 'startDate' || field === 'endDate') {
      setCalendarRange({
        from: field === 'startDate' ? (val ? new Date(val) : undefined) : (range.startDate ? new Date(range.startDate) : undefined),
        to: field === 'endDate' ? (val ? new Date(val) : undefined) : (range.endDate ? new Date(range.endDate) : undefined),
      });
    }
  };

  // Calendar range select handler
  const handleCalendarSelect = (selected: DateRange | undefined) => {
    setCalendarRange(selected);
    if (selected?.from) {
      const startDate = formatDateYMD(selected.from);
      let endDate = startDate;
      if (selected.to) {
        endDate = formatDateYMD(selected.to);
      }
      const newRange = { ...range, startDate, endDate };
      setRange(newRange);
      onChange(newRange);
    }
  };

  return (
    <div className="flex bg-white rounded-lg shadow-lg w-[540px] min-w-[400px] max-w-[98vw]">
      {/* Left: Presets */}
      <div className="w-36 border-r p-2">
        <ul className="space-y-0.5">
          {PRESETS.map(preset => (
            <li key={preset}>
              <button
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition font-medium ${selectedPreset === preset ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50'}`}
                onClick={() => handlePresetClick(preset)}
              >
                {preset}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Right: Date/Time & Calendar */}
      <div className="flex-1 p-2 flex flex-col gap-2 min-w-[300px]">
        <div className="grid grid-cols-2 gap-1 mb-1">
          <div>
            <label className="block text-xs font-medium mb-0.5">Start Date *</label>
            <Input type="date" value={range.startDate} onChange={e => handleInputChange('startDate', e.target.value)} className="text-xs h-8" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-0.5">Start Time *</label>
            <Input type="time" value={range.startTime} onChange={e => handleInputChange('startTime', e.target.value)} className="text-xs h-8" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-0.5">End Date *</label>
            <Input type="date" value={range.endDate} onChange={e => handleInputChange('endDate', e.target.value)} className="text-xs h-8" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-0.5">End Time *</label>
            <Input type="time" value={range.endTime} onChange={e => handleInputChange('endTime', e.target.value)} className="text-xs h-8" />
          </div>
        </div>
        <div>
          <Calendar
            mode="range"
            selected={calendarRange}
            onSelect={handleCalendarSelect}
            className="rounded-md border text-xs"
          />
        </div>
        <div className="flex justify-end gap-1 mt-2">
          <Button variant="outline" size="sm" className="px-3 py-1 text-xs h-8" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="px-3 py-1 text-xs h-8" onClick={onApply}>Apply</Button>
        </div>
      </div>
    </div>
  );
}; 