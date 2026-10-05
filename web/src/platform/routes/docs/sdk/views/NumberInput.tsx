import ViewLayout from './ViewLayout';

/** Documents NumberInput in LongLink Views. */
export default function NumberInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="NumberInput"
            examples={[
                {
                    title: 'NumberInput',
                    code: `function Example() {
  const [value, setValue] = useState(1);

  return (
    <NumberInput
      label="Quantity"
      value={value}
      onChange={setValue}
      min={1}
      step={1}
    />
  );
}`,
                },
            ]}
        />
    );
}
