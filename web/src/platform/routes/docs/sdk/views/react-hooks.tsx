import ViewLayout from './view-layout';
import { viewHooks } from '@/lib/documentation';
import { InlineCode } from '@/components/shadcn/inline-code';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

const examples = {
    useState: `export default function Counter() {
  const [count, setCount] = useState(0);

  return <Button onClick={() => setCount((previous) => previous + 1)}>{count}</Button>;
}`,
    useEffect: `export default function ConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return <Text>{online ? 'Online' : 'Offline'}</Text>;
}`,
    useMemo: `export default function SortedItems() {
  const [items] = useApi('/api/items');
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  return <Stack>{sorted.map((item) => <Text key={item.id}>{item.name}</Text>)}</Stack>;
}`,
    useRef: `export default function NameInput() {
  const input = useRef(null);

  return (
    <Stack gap={3}>
      <Input ref={input} aria-label="Name" />
      <Button onClick={() => input.current?.focus()}>Focus name</Button>
    </Stack>
  );
}`
};

/** Documents the React hooks available without imports in Views. */
export default function ReactHooksPage() {
    return (
        <ViewLayout
            name="ReactHooks"
            toc={Object.keys(examples).map((name) => ({ id: name.toLowerCase(), label: name, level: 2 }))}
            properties={[
                { name: 'useState.initial', type: 'T | (() => T)' },
                { name: 'useState.return', type: '[T, (value: T | ((previous: T) => T)) => void]' },
                { name: 'useEffect.effect', type: '() => void | (() => void)' },
                { name: 'useEffect.dependencies', type: 'readonly unknown[] | undefined' },
                { name: 'useMemo.factory', type: '() => T' },
                { name: 'useMemo.dependencies', type: 'readonly unknown[]' },
                { name: 'useMemo.return', type: 'T' },
                { name: 'useRef.initial', type: 'T' },
                { name: 'useRef.return', type: '{ current: T }' }
            ]}
        >
            {Object.entries(examples).map(([name, code]) => (
                <section key={name} className="flex min-w-0 flex-col gap-3">
                    <h2 className="font-semibold tracking-tight text-3xl" id={name.toLowerCase()}>
                        {name}
                    </h2>
                    {viewHooks
                        .filter((hook) => hook.name.startsWith(`${name}(`))
                        .map((hook) => (
                            <div key={hook.name} className="flex flex-col gap-3">
                                <InlineCode className="self-start">{hook.name}</InlineCode>
                            </div>
                        ))}
                    <CodeBlock language="jsx" code={code}>
                        <CodeBlockCopyButton />
                    </CodeBlock>
                </section>
            ))}
        </ViewLayout>
    );
}
