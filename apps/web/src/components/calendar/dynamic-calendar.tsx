'use client';

import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type CalendarProps,
  type Event,
} from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InternalDnDCalendar = withDragAndDrop(BigCalendar as any);

type DnDCalendarProps = Omit<CalendarProps<Event, object>, 'localizer'> &
  Record<string, unknown>;

export default function DynamicDnDCalendar(props: DnDCalendarProps) {
  return <InternalDnDCalendar localizer={localizer} {...props} />;
}
