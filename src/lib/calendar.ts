import { createEventInCalendarAsync } from 'expo-calendar/legacy';

// Opens the phone's own "new event" screen with an all-day event on the given date (YYYY-MM-DD), with reminders 7 days
// and 1 day before where the calendar app supports them. The person decides whether to save: because the system
// screen does the saving, the app needs no calendar permission and cannot read the calendar.
export async function addDateToCalendar(event: {
  title: string;
  date: string;
  notes?: string;
}): Promise<'saved' | 'canceled' | 'error'> {
  try {
    const [y, m, d] = event.date.split('-').map(Number);
    const result = await createEventInCalendarAsync({
      title: event.title,
      notes: event.notes,
      allDay: true,
      startDate: new Date(y, m - 1, d),
      endDate: new Date(y, m - 1, d + 1),
      alarms: [{ relativeOffset: -7 * 24 * 60 }, { relativeOffset: -24 * 60 }],
    });
    return result.action === 'saved' ? 'saved' : 'canceled';
  } catch {
    return 'error';
  }
}
