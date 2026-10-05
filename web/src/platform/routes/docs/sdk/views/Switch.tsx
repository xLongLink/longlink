import ViewLayout from './ViewLayout';

/** Documents Switch in LongLink Views. */
export default function SwitchPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Switch"
            examples={[
                {
                    title: 'Switch',
                    code: `function Example() {
  const [value, setValue] = useState(true);

  return <Switch label="Enabled" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}
