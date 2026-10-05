import ViewLayout from './ViewLayout';

/** Documents Slider in LongLink Views. */
export default function SliderPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Slider"
            examples={[
                {
                    title: 'Slider',
                    code: `function Example() {
  const [value, setValue] = useState(60);

  return (
    <Slider
      label="Progress"
      value={value}
      onChange={setValue}
      min={0}
      max={100}
    />
  );
}`,
                },
            ]}
        />
    );
}
