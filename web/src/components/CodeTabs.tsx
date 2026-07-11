import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { CodeBlock } from '@/components/CodeBlock';

type CodeTabItem = {
    code: string;
    label: string;
    value: string;
    language?: string;
};

/** Renders connected tabs for switching between equivalent code snippets. */
export function CodeTabs({ defaultValue, items }: { defaultValue: string; items: CodeTabItem[] }) {
    return (
        <TabsPrimitive.Root className="w-full max-w-2xl -mb-4" defaultValue={defaultValue}>
            <TabsPrimitive.List className="relative z-10 inline-flex h-8 w-fit items-stretch rounded-t-md border border-b-0 border-border bg-muted/30 px-0.5 pt-0.5 text-muted-foreground">
                {items.map((item) => (
                    <TabsPrimitive.Tab
                        key={item.value}
                        value={item.value}
                        className="relative -mb-px inline-flex h-full cursor-pointer items-center justify-center rounded-t-sm rounded-b-none border border-transparent bg-background px-3 text-sm font-medium whitespace-nowrap text-foreground/50 transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring data-active:border-border data-active:border-b-transparent data-active:bg-transparent data-active:font-semibold data-active:text-foreground dark:text-muted-foreground dark:hover:text-foreground dark:data-active:bg-transparent dark:data-active:text-foreground"
                    >
                        {item.label}
                    </TabsPrimitive.Tab>
                ))}
            </TabsPrimitive.List>
            {items.map((item) => (
                <TabsPrimitive.Panel
                    key={item.value}
                    value={item.value}
                    className="text-sm outline-none [[hidden]]:hidden"
                >
                    <CodeBlock className="max-w-none rounded-tl-none bg-muted/30" language={item.language ?? 'bash'}>
                        {item.code}
                    </CodeBlock>
                </TabsPrimitive.Panel>
            ))}
        </TabsPrimitive.Root>
    );
}
