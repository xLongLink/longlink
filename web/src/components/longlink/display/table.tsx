import { cn } from 'cn';
import type { ComponentProps } from 'react';

function Table({ wrap = false, ...props }: Omit<ComponentProps<'table'>, 'className' | 'style'> & { wrap?: boolean }) {
    return (
        <div data-slot="table-container" className="relative w-full overflow-x-auto">
            <table
                data-slot="table"
                data-wrap={wrap || undefined}
                className="w-full caption-bottom text-sm data-wrap:[&_td]:whitespace-normal"
                {...props}
            />
        </div>
    );
}

function TableHeader(props: Omit<ComponentProps<'thead'>, 'className' | 'style'>) {
    return <thead data-slot="table-header" className="[&_tr]:border-b" {...props} />;
}

function TableBody(props: Omit<ComponentProps<'tbody'>, 'className' | 'style'>) {
    return <tbody data-slot="table-body" className="[&_tr:last-child]:border-0" {...props} />;
}

function TableFooter(props: Omit<ComponentProps<'tfoot'>, 'className' | 'style'>) {
    return (
        <tfoot
            data-slot="table-footer"
            className="border-t bg-muted/50 font-medium [&>tr]:last:border-b-0"
            {...props}
        />
    );
}

function TableRow(props: Omit<ComponentProps<'tr'>, 'className' | 'style'>) {
    return (
        <tr
            data-slot="table-row"
            className="border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted"
            {...props}
        />
    );
}

function TableHead({
    align = 'start',
    ...props
}: Omit<ComponentProps<'th'>, 'align' | 'className' | 'style'> & { align?: 'start' | 'center' | 'end' }) {
    return (
        <th
            data-slot="table-head"
            className={cn(
                'h-10 px-2 align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pe-0',
                align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start'
            )}
            {...props}
        />
    );
}

function TableCell({
    align = 'start',
    ...props
}: Omit<ComponentProps<'td'>, 'align' | 'className' | 'style'> & { align?: 'start' | 'center' | 'end' }) {
    return (
        <td
            data-slot="table-cell"
            className={cn(
                'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0',
                align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start'
            )}
            {...props}
        />
    );
}

function TableCaption(props: Omit<ComponentProps<'caption'>, 'className' | 'style'>) {
    return <caption data-slot="table-caption" className="mt-4 text-sm text-muted-foreground" {...props} />;
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
