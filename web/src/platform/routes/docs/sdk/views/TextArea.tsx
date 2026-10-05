import ViewLayout from './ViewLayout';

/** Documents TextArea in LongLink Views. */
export default function TextAreaPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TextArea"
            examples={[
                {
                    title: 'TextArea',
                    code: `function Example() {
  const [value, setValue] = useState('');

  return <TextArea label="Notes" value={value} onChange={setValue} rows={4} />;
}`,
                },
            ]}
        />
    );
}
