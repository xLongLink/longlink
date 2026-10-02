// Editor declarations only. The shared frontend supplies these APIs at runtime.
type ViewNode = React.JSX.Element | string | number | boolean | null | undefined | ViewNode[];
type ViewComponent<P> = (props: P & { children?: ViewNode }) => React.JSX.Element;
type Spacing = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;

declare namespace React {
    namespace JSX {
        interface Element {
            readonly type: unknown;
            readonly props: unknown;
        }
        interface ElementChildrenAttribute {
            children: unknown;
        }
        interface IntrinsicElements {
            [name: string]: Record<string, unknown>;
        }
    }
    function createElement(type: unknown, props: unknown, ...children: ViewNode[]): JSX.Element;
    function useState<T = undefined>(initial?: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void];
    function useEffect(effect: () => void | (() => void), dependencies?: readonly unknown[]): void;
    function useMemo<T>(factory: () => T, dependencies: readonly unknown[]): T;
    function useRef<T>(initial: T): { current: T };
}

declare const params: Readonly<Record<string, string>>;
declare function navigate(path: string): void;
declare function request<T = unknown>(
    path: string,
    options?: {
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        json?: unknown;
        form?: [string, string | Blob][];
        binary?: boolean;
    }
): Promise<T>;
declare function useQuery<T>(options: { queryKey: readonly unknown[]; queryFn: () => Promise<T>; enabled?: boolean }): {
    data: T | undefined;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
};
declare function useQueryClient(): { invalidateQueries(options: { queryKey: readonly unknown[] }): Promise<void> };

declare const Stack: ViewComponent<{
    gap?: Spacing;
    direction?: 'horizontal' | 'vertical';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'center' | 'end' | 'stretch';
    wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    padding?: Spacing;
}>;
declare const Heading: ViewComponent<{ level?: 1 | 2 | 3 | 4 | 5 | 6 }>;
declare const Text: ViewComponent<{
    color?: 'primary' | 'secondary';
    type?: 'body' | 'large' | 'label' | 'supporting' | 'code';
}>;
declare const Button: ViewComponent<{
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    isDisabled?: boolean;
    clickAction?: () => void | Promise<void>;
}>;
declare const IconButton: ViewComponent<{ icon: ViewNode; label: string; onClick?: () => void }>;
declare const Link: ViewComponent<{ to: string }>;
declare const Badge: ViewComponent<{ label?: string; variant?: 'neutral' | 'info' | 'success' | 'warning' | 'error' }>;
declare const Avatar: ViewComponent<{ name?: string; src?: string; alt?: string }>;
declare const Dialog: ViewComponent<{
    'aria-label': string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    purpose?: 'form' | 'info' | 'required';
}>;
declare const TextInput: ViewComponent<{
    label: string;
    value?: string;
    placeholder?: string;
    isRequired?: boolean;
    onChange?: (value: string) => void;
}>;
declare const TextArea: typeof TextInput;
declare const NumberInput: ViewComponent<{
    label: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (value: number | undefined) => void;
}>;
declare const Selector: ViewComponent<{
    label?: string;
    value?: string;
    options: { value: string; label: string }[];
    onChange?: (value: string | undefined) => void;
}>;
declare const FileInput: ViewComponent<{
    label: string;
    value?: File | null;
    accept?: string;
    onChange?: (value: File | null) => void;
}>;
declare const FileViewer: ViewComponent<{ src: string; title: string }>;
declare const Grid: ViewComponent<{ columns?: number; gap?: Spacing }>;
declare const GridSpan: ViewComponent<{ columns?: number | 'full' }>;
declare const StackItem: ViewComponent<{
    size?: 'static' | 'fill';
    isScrollable?: boolean;
    crossAlignSelf?: 'start' | 'center' | 'end' | 'stretch';
}>;
declare const Card: ViewComponent<{ padding?: Spacing; elevation?: 'none' | 'low' | 'medium' | 'high' }>;
declare const CheckboxInput: ViewComponent<{ label: string; value: boolean; onChange?: (value: boolean) => void }>;
declare const Switch: typeof CheckboxInput;
declare const Slider: ViewComponent<{
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (value: number) => void;
}>;
declare const RadioList: ViewComponent<{ label?: string; value?: string; onChange?: (value: string) => void }>;
declare const RadioListItem: ViewComponent<{ label: string; value: string }>;
declare const MoreMenu: ViewComponent<{ items: { label: string; onClick: () => void; variant?: 'destructive' }[] }>;
declare const Menu: ViewComponent<{
    sections: { title: string; entries: { kind: 'item'; id: string; label: string; content: ViewNode }[] }[];
    gap?: Spacing;
}>;
declare const Icon: ViewComponent<{ icon: string; size: 'sm' | 'md' | 'lg' }>;
declare const CodeBlock: ViewComponent<{ code: string; language?: string; title?: string; isWrapped?: boolean }>;
declare const ProgressBar: ViewComponent<{ label?: string; value: number; max?: number; hasValueLabel?: boolean }>;
declare const Stepper: ViewComponent<{ activeStep?: number; orientation?: 'horizontal' | 'vertical' }>;
declare const Step: ViewComponent<{ step: number; label: string }>;
declare const TabList: ViewComponent<{ value?: string; onChange?: (value: string) => void }>;
declare const Tab: ViewComponent<{ value: string; label: string }>;
declare const StatusBadge: ViewComponent<{ status: 'running' | 'creating' | 'failed' }>;
declare const EmptyState: ViewComponent<{ title: string; isCompact?: boolean }>;
declare const Currency: ViewComponent<{ value: number; currency: string; locale?: string }>;
declare const Timestamp: ViewComponent<{ value: number | string; format?: string }>;
declare const Divider: ViewComponent<Record<string, never>>;
declare const Spinner: ViewComponent<{ label?: string }>;
declare const Banner: ViewComponent<{ status?: 'error' | 'warning' | 'success' | 'info'; title: string }>;
declare function Table<T>(props: {
    data: readonly T[];
    idKey?: string | ((row: T) => string | number);
    density?: 'compact' | 'comfortable';
    columns: { key: string; header?: string; align?: 'start' | 'center' | 'end'; renderCell: (row: T) => ViewNode }[];
}): React.JSX.Element;
