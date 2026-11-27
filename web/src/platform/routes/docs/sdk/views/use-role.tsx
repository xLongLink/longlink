import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents exact role checks for conditional View controls. */
export default function UseRolePage() {
    return (
        <ViewLayout
            name="useRole"
            properties={[
                { name: 'role', type: 'string' },
                { name: 'returns', type: 'boolean' }
            ]}
        >
            <CodeBlock
                language="jsx"
                code={`export default function Review() {
  const reviewer = useRole('reviewer');

  return reviewer ? <Button>Review</Button> : null;
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
        </ViewLayout>
    );
}
