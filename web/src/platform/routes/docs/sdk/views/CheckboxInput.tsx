import ViewLayout from './ViewLayout';

/** Documents CheckboxInput in LongLink Views. */
export default function CheckboxInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="CheckboxInput"
            examples={[
                {
                    title: 'CheckboxInput',
                    code: `function Example() {
  const [value, setValue] = useState(false);

  return <CheckboxInput label="Approved" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}
