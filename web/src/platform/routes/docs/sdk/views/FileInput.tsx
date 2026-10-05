import ViewLayout from './ViewLayout';

/** Documents FileInput in LongLink Views. */
export default function FileInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="FileInput"
            examples={[
                {
                    title: 'FileInput',
                    code: `function Example() {
  const [value, setValue] = useState(null);

  return (
    <FileInput
      label="Attachment"
      value={value}
      onChange={setValue}
      accept=".pdf"
      maxSize={5 * 1024 * 1024}
    />
  );
}`,
                },
            ]}
        />
    );
}
