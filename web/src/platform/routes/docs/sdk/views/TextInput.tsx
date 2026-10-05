import ViewLayout from './ViewLayout';

/** Documents TextInput in LongLink Views. */
export default function TextInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TextInput"
            examples={[
                {
                    title: 'TextInput',
                    code: `function Example() {
  const [value, setValue] = useState('');

  return (
    <TextInput label="Name" value={value} onChange={setValue} isRequired />
  );
}`,
                },
            ]}
        />
    );
}
