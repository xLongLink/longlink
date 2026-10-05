import ViewLayout from './ViewLayout';

/** Documents DateInput in LongLink Views. */
export default function DateInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DateInput"
            examples={[
                {
                    title: 'DateInput',
                    code: `function Example() {
  const [value, setValue] = useState('2026-10-02');

  return <DateInput label="Due date" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}
