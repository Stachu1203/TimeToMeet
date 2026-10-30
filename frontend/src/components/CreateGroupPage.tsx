import { useState } from 'react';
import type { GroupCreatePayload } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface CreateGroupPageProps {
  onCreateGroup: (payload: GroupCreatePayload) => void;
  onCancel: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hh = String(i).padStart(2, '0');
  return { value: `${hh}:00:00`, label: `${hh}:00` };
});

const TIMEZONES = [
  'Europe/Warsaw',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CreateGroupPage({ onCreateGroup, onCancel }: CreateGroupPageProps) {
  const [title, setTitle] = useState('');
  const [timezone, setTimezone] = useState('Europe/Warsaw');
  const [gridStartHour, setGridStartHour] = useState('09:00:00');
  const [gridEndHour, setGridEndHour] = useState('17:00:00');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [error, setError] = useState('');

  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(10);

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const mondayOffset = (firstDayOfWeek + 6) % 7;
  const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayIndex = i - mondayOffset + 1;
    if (dayIndex >= 1 && dayIndex <= daysInMonth) {
      currentWeek.push(dayIndex);
    } else {
      currentWeek.push(null);
    }
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr].sort()
    );
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a meeting title.');
      return;
    }
    if (selectedDates.length === 0) {
      setError('Please select at least one day on the calendar.');
      return;
    }
    if (gridStartHour >= gridEndHour) {
      setError('Start time must be earlier than end time.');
      return;
    }

    setError('');
    onCreateGroup({
      title: title.trim(),
      timezone,
      grid_start_hour: gridStartHour,
      grid_end_hour: gridEndHour,
      dates: selectedDates,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-5xl mx-auto space-y-8">
      <div className="flex items-end justify-between gap-4 border-b border-white/15 pb-5">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Create Poll
        </h1>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-white bg-[#181a20] hover:bg-white/10 border border-white/20 rounded-md transition-transform active:scale-95 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-white mb-2">
          Meeting Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sprint Planning"
          className="w-full px-4 py-3 text-base bg-[#181a20] text-white placeholder:text-white/40 border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            {monthName}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-2.5 bg-[#181a20] border border-white/20 rounded-md hover:bg-white/10 text-white transition-transform active:scale-95 cursor-pointer"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="p-2.5 bg-[#181a20] border border-white/20 rounded-md hover:bg-white/10 text-white transition-transform active:scale-95 cursor-pointer"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-[#181a20]">
              {WEEKDAYS.map((day) => (
                <th
                  key={day}
                  className="text-sm font-semibold uppercase tracking-wider text-white py-2.5 border border-white/20 text-center"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wIdx) => (
              <tr key={wIdx}>
                {week.map((dayNum, dIdx) => {
                  if (dayNum === null) {
                    return (
                      <td
                        key={`empty-${wIdx}-${dIdx}`}
                        className="h-16 md:h-20 bg-[#14161c] border border-white/20 p-0"
                      />
                    );
                  }

                  const mm = String(viewMonth + 1).padStart(2, '0');
                  const dd = String(dayNum).padStart(2, '0');
                  const dateStr = `${viewYear}-${mm}-${dd}`;
                  const isSelected = selectedDates.includes(dateStr);

                  return (
                    <td
                      key={dateStr}
                      className="border border-white/20 p-0"
                    >
                      <button
                        type="button"
                        onClick={() => toggleDate(dateStr)}
                        className={`relative overflow-hidden w-full h-16 md:h-20 text-lg transition-all duration-200 cursor-pointer flex items-center justify-center bg-[#181a20] hover:bg-white/10 text-white ${
                          isSelected ? 'font-semibold' : ''
                        }`}
                      >
                        <span
                          className={`absolute inset-0 bg-[#3b5278] transition-all duration-250 ease-out ${
                            isSelected
                              ? 'opacity-100 scale-100'
                              : 'opacity-0 scale-75'
                          }`}
                        />
                        {isSelected && (
                          <span className="pointer-events-none absolute inset-0 border-2 border-white z-20" />
                        )}
                        <span className="relative z-10">{dayNum}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className={`grid transition-all duration-300 ease-out ${
            selectedDates.length > 0
              ? 'grid-rows-[1fr] opacity-100 mt-8 pt-6 border-t border-white/15'
              : 'grid-rows-[0fr] opacity-0 mt-0 pt-0 border-t-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white mb-2">
                  From
                </label>
                <select
                  value={gridStartHour}
                  onChange={(e) => setGridStartHour(e.target.value)}
                  className="w-full px-4 py-3 text-base font-bold bg-[#181a20] text-white border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
                >
                  {HOURS.map((h) => (
                    <option
                      key={h.value}
                      value={h.value}
                      className="bg-[#181a20] text-white font-bold"
                    >
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white mb-2">
                  To
                </label>
                <select
                  value={gridEndHour}
                  onChange={(e) => setGridEndHour(e.target.value)}
                  className="w-full px-4 py-3 text-base font-bold bg-[#181a20] text-white border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
                >
                  {HOURS.map((h) => (
                    <option
                      key={h.value}
                      value={h.value}
                      className="bg-[#181a20] text-white font-bold"
                    >
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 text-base bg-[#181a20] text-white border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} className="bg-[#181a20] text-white">
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-5 bg-white hover:bg-white/90 text-black text-base font-semibold rounded-md transition-transform active:scale-95 cursor-pointer"
              >
                Create Poll
              </button>
            </div>

            {error && (
              <div className="px-4 py-3 text-sm text-white bg-[#181a20] border border-white/30 rounded-md">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
