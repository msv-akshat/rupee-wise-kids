
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface TimeFrameSelectorProps {
  timeFrame: string;
  dateRange: { from: Date; to: Date };
  onTimeFrameChange: (value: string) => void;
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export const TimeFrameSelector = ({
  timeFrame,
  dateRange,
  onTimeFrameChange,
  onDateRangeChange,
}: TimeFrameSelectorProps) => {
  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      onDateRangeChange({
        from: range.from,
        to: range.to || range.from
      });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={timeFrame} onValueChange={onTimeFrameChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Time Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="year">Last 12 Months</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      
      {timeFrame === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-auto justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from && dateRange.to ? (
                <>
                  {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                </>
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
