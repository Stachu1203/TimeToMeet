import { useState } from 'react';
import type { GroupCreatePayload, User } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface CreateGroupPageProps {
  currentUser: User | null;
  onOpenLogin: () => void;
  onCreateGroup: (payload: GroupCreatePayload) => Promise<void>;
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
const MAX_DAYS = 60;
const MAX_TITLE_LENGTH = 32;

export function CreateGroupPage({
  currentUser,
  onOpenLogin,
  onCreateGroup,
}: CreateGroupPageProps) {
  const [title, setTitle] = useState('');
  const [timezone, setTimezone] = useState('Europe/Warsaw');
  const [gridStartHour, setGridStartHour] = useState('09:00:00');
  const [gridEndHour, setGridEndHour] = useState('17:00:00');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(10);

  if (!currentUser) {
    return (
      <div className="w-full max-w-2xl mx-auto pt-8 space-y-6">
        <div className="p-8 rounded-md bg-[#181a20] border border-white/20 space-y-5 text-white">
          <h1 className="text-3xl font-semibold">Sign In Required</h1>
          <p className="text-base text-white">
            Only logged-in users can create new polls. Please sign in or create an account to continue.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-5 py-2.5 bg-white hover:bg-white/90 text-black text-sm font-semibold rounded-md transition-transform active:scale-95 cursor-pointer"
            >
              Go to Log In / Register
            </button>
          </div>
        </div>
      </div>
    );
  }

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
    setSelectedDates((prev) => {
      if (prev.includes(dateStr)) {
        setError('');
        return prev.filter((d) => d !== dateStr);
      }
      if (prev.length >= MAX_DAYS) {
        setError(`You can select up to ${MAX_DAYS} days maximum.`);
        return prev;
      }
      setError('');
      return [...prev, dateStr].sort();
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a meeting title.');
      return;
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setError(`Meeting title cannot exceed ${MAX_TITLE_LENGTH} characters.`);
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
    setSubmitting(true);
    try {
      await onCreateGroup({
        title: trimmedTitle,
        timezone,
        grid_start_hour: gridStartHour,
        grid_end_hour: gridEndHour,
        days: selectedDates,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create poll.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-end justify-between gap-4 border-b border-white/15 pb-5">
        <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
          Create Poll
        </h1>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="create-poll-title-input"
            className="block text-xs font-semibold uppercase tracking-wider text-white"
          >
            Meeting Title
          </label>
          <span className="text-xs font-mono text-white">
            {title.length}/{MAX_TITLE_LENGTH}
          </span>
        </div>
        <input
          id="create-poll-title-input"
          type="text"
          maxLength={MAX_TITLE_LENGTH}
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
          placeholder="Sprint Planning"
          className="w-full px-4 py-3 text-base bg-[#181a20] text-white placeholder:text-white/40 border border-white/20 rounded-md focus:outline-none focus:border-white transition-colors"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-baseline gap-3 sm:gap-4">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
              {monthName}
            </h2>
            <span className="text-xs sm:text-sm font-mono font-bold text-white">
              {selectedDates.length}/{MAX_DAYS} days
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-2 sm:p-2.5 bg-[#181a20] border border-white/20 rounded-md hover:bg-white/10 text-white transition-transform active:scale-95 cursor-pointer"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="p-2 sm:p-2.5 bg-[#181a20] border border-white/20 rounded-md hover:bg-white/10 text-white transition-transform active:scale-95 cursor-pointer"
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
                  className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white py-2 sm:py-2.5 border border-white/20 text-center"
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
                        className="h-12 sm:h-16 md:h-20 bg-[#14161c] border border-white/20 p-0"
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
                        aria-pressed={isSelected}
                        aria-label={`${dateStr}${isSelected ? ' (selected)' : ''}`}
                        onClick={() => toggleDate(dateStr)}
                        className={`relative overflow-hidden w-full h-12 sm:h-16 md:h-20 text-base sm:text-lg transition-all duration-200 cursor-pointer flex items-center justify-center bg-[#181a20] hover:bg-white/10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
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

        <div className="mt-8 pt-6 border-t border-white/15 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label
                htmlFor="create-poll-from-select"
                className="block text-xs font-semibold uppercase tracking-wider text-white mb-2"
              >
                From
              </label>
              <select
                id="create-poll-from-select"
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
              <label
                htmlFor="create-poll-to-select"
                className="block text-xs font-semibold uppercase tracking-wider text-white mb-2"
              >
                To
              </label>
              <select
                id="create-poll-to-select"
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
              <label
                htmlFor="create-poll-timezone-select"
                className="block text-xs font-semibold uppercase tracking-wider text-white mb-2"
              >
                Timezone
              </label>
              <select
                id="create-poll-timezone-select"
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
              disabled={submitting}
              className="w-full py-3 px-5 bg-white hover:bg-white/90 text-black text-base font-semibold rounded-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Poll'}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="px-4 py-3 text-sm text-white bg-[#181a20] border border-white/30 rounded-md"
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
