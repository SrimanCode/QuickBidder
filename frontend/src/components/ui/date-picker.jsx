"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export function DatePicker({ onDateChange }) {
  const [date, setDate] = React.useState(null);
  const [time, setTime] = React.useState(null); // Default to 10:00 AM
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (date && time) {
      console.log("Date and time changed", date, time);
      const updatedDate = new Date(date);
      updatedDate.setHours(time.hour());
      updatedDate.setMinutes(time.minute());
      onDateChange(updatedDate);
    }
  }, [date, time]);

  const handlePopoverToggle = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleClosePopover = () => {
    setIsPopoverOpen(false);
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          onClick={handlePopoverToggle}
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          {date && time
            ? `${format(date, "PPP")} at ${time.format("hh:mm A")}`
            : <span>Pick a date and time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 rounded-lg shadow-lg"
        aria-hidden={!isPopoverOpen}
      >
        <div className="flex flex-col items-center p-6">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate);
              setIsPopoverOpen(true);
            }}
            initialFocus
            className="w-full mb-4 border rounded-lg"
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimePicker
              label="Select time"
              value={time}
              onChange={(newTime) => setTime(newTime)}
              renderInput={(params) => (
                <input
                  {...params}
                  className="w-full p-2 text-center border rounded-md"
                />
              )}
              ampm
            />
          </LocalizationProvider>
          <Button
            onClick={handleClosePopover}
            className="mt-4"
          >
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
