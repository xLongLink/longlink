import ViewLayout from './ViewLayout';

/** Documents DateTimeInput in LongLink Views. */
export default function DateTimeInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DateTimeInput"
            examples={[
                {
                    title: 'DateTimeInput',
                    code: `function Example() {
  const [value, setValue] = useState();

  return (
    <DateTimeInput label="Appointment" value={value} onChange={setValue} />
  );
}`,
                },
            ]}
        />
    );
}
