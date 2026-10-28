import ViewLayout from './ViewLayout';
import { Timestamp } from '@/components/ui/Timestamp';

/** Documents Timestamp in LongLink Views. */
export default function TimestampPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Timestamp"
            introduction={'Formats a date or timestamp using the standard date formats.'}
            properties={[
                {
                    name: 'value',
                    type: 'string | number',
                    description: 'The date/time to display. Accepts Unix timestamps (seconds) or ISO 8601 strings.',
                },
                {
                    name: 'format',
                    type: '"date" | "date_long" | "date_weekday" | "date_time" | "time" | "relative" | "system_date" | "system_date_time" | "system_time"',
                    description: 'Date, time, relative, or Unix-seconds display format.',
                },
            ]}
            examples={[
                {
                    title: 'Timestamp',
                    preview: <TimestampExample />,
                    code: `function Example() {
  return <Timestamp value="2026-10-02T12:00:00Z" format="date_time" />;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's timestamp example for documentation and the catalog. */
export function TimestampExample() {
    // Format the sample timestamp as a date.
    return <Timestamp value="2026-09-30T12:00:00Z" format="date" />;
}
