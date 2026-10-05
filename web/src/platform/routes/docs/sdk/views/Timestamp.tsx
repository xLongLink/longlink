import ViewLayout from './ViewLayout';
import { Timestamp } from '@/components/ui/Timestamp';

/** Documents Timestamp in LongLink Views. */
export default function TimestampPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Timestamp"
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
