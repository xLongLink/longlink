import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents sharing a form through its provider. */
export default function UseFormContextPage() {
    return (
        <ViewLayout name="useFormContext" properties={[{ name: 'return', type: 'UseFormReturn<TFieldValues>' }]}>
            <CodeBlock
                language="jsx"
                code={`function NameField() {
  const { control } = useFormContext();

  return (
    <Controller
      name="name"
      control={control}
      render={({ field }) => <Input {...field} aria-label="Item name" />}
    />
  );
}

export default function ItemEditor() {
  const form = useForm({ defaultValues: { name: '' } });

  return (
    <FormProvider {...form}>
      <NameField />
      <Button type="button" onClick={() => form.reset()}>Reset</Button>
    </FormProvider>
  );
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
        </ViewLayout>
    );
}
