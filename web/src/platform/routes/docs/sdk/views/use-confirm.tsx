import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents confirmation state and retry behavior. */
export default function UseConfirmPage() {
    return (
        <ViewLayout
            name="useConfirm"
            properties={[
                { name: 'show', type: '(options: ConfirmOptions) => void' },
                { name: 'hide', type: '() => void' },
                { name: 'isOpen', type: 'boolean' },
                { name: 'element', type: 'ReactNode' },
                { name: 'options.title', type: 'string' },
                { name: 'options.description', type: 'string | undefined' },
                { name: 'options.cancelLabel', type: 'string | undefined' },
                { name: 'options.actionLabel', type: 'string' },
                { name: 'options.actionVariant', type: '"default" | "destructive" | undefined' },
                { name: 'options.onAction', type: '() => void | Promise<void>' }
            ]}
        >
            <CodeBlock
                language="jsx"
                code={`export default function DeleteItem({ params }) {
  const [deleted, setDeleted] = useState(false);
  const confirmation = useConfirm();
  const form = useForm(\`/api/items/\${params.item}\`, {
    method: 'DELETE',
    onSuccess: () => setDeleted(true)
  });

  if (deleted) return <Link href="/items">Back to items</Link>;

  return (
    <>
      <Button onClick={() => confirmation.show({
        title: 'Delete item?',
        description: 'This cannot be undone.',
        actionLabel: 'Delete',
        actionVariant: 'destructive',
        onAction: async () => {
          await form.submit();
        }
      })}>
        Delete
      </Button>
      {confirmation.element}
    </>
  );
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
        </ViewLayout>
    );
}
