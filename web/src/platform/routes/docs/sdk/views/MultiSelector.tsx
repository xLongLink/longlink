import ViewLayout from './ViewLayout';

/** Documents MultiSelector in LongLink Views. */
export default function MultiSelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MultiSelector"
            examples={[
                {
                    title: 'MultiSelector',
                    code: `function Example() {
  const [value, setValue] = useState(['design']);

  return (
    <MultiSelector
      label="Teams"
      options={['design', 'engineering']}
      value={value}
      onChange={setValue}
      hasSearch
    />
  );
}`,
                },
            ]}
        />
    );
}
