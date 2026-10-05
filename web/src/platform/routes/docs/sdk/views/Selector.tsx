import ViewLayout from './ViewLayout';

/** Documents Selector in LongLink Views. */
export default function SelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Selector"
            examples={[
                {
                    title: 'Selector',
                    code: `function Example() {
  const [value, setValue] = useState('open');

  return (
    <Selector
      label="Status"
      options={['open', 'closed']}
      value={value}
      onChange={setValue}
    />
  );
}`,
                },
            ]}
        />
    );
}
