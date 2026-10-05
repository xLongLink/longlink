import ViewLayout from './ViewLayout';

/** Documents DateRangeInput in LongLink Views. */
export default function DateRangeInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DateRangeInput"
            examples={[
                {
                    title: 'DateRangeInput',
                    code: `function Example() {
  const [value, setValue] = useState({
    start: '2026-10-02',
    end: '2026-10-09',
  });

  return <DateRangeInput label="Period" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}
