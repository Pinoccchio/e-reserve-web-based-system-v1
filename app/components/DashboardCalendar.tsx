'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const events = [
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 2), title: 'Town Hall Meeting' },
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 3), title: 'Community Festival' },
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 4), title: 'Local Government Conference' },
];

export default function DashboardCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update the current date every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCells = () => {
    const cells = [];
    const today = new Date();
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = events.filter(event => 
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth()
      );
      const isToday = date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear();
      cells.push(
        <div key={day} className={`p-2 border border-gray-200 ${dayEvents.length > 0 ? 'bg-blue-100' : ''} ${isToday ? 'bg-yellow-200 font-bold' : ''}`}>
          <span className={`${isToday ? 'text-blue-600' : ''}`}>{day}</span>
          {dayEvents.map((event, index) => (
            <div key={index} className="text-xs mt-1 truncate">{event.title}</div>
          ))}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <Button onClick={prevMonth} variant="outline" size="icon">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <Button onClick={nextMonth} variant="outline" size="icon">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(day => (
          <div key={day} className="font-semibold text-center p-2">{day}</div>
        ))}
        {renderCells()}
      </div>
    </div>
  )
}


