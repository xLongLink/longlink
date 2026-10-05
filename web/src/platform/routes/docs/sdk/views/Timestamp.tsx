import ViewLayout from './ViewLayout';

/** Documents Timestamp in LongLink Views. */
export default function TimestampPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Timestamp"
            examples={[
                {
                    title: 'Timestamp',
                    code: `function Example() {
  return <Timestamp value="2026-10-02T12:00:00Z" format="date_time" />;
}`,
                },
            ]}
        />
    );
}
