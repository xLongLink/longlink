import { createRegistry } from '../src';


function Page(props: React.HTMLAttributes<HTMLElement>) {
    return <main {...props} />;
}

function Section(props: React.HTMLAttributes<HTMLElement>) {
    return <section {...props} />;
}

function Card(props: React.HTMLAttributes<HTMLDivElement>) {
    return <article {...props} />;
}

function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
    return <header {...props} />;
}

function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 {...props} />;
}

function CardDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p {...props} />;
}

function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
    return <div {...props} />;
}

function Badge(props: React.HTMLAttributes<HTMLSpanElement>) {
    return <span {...props} />;
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    kind?: string;
};

function Input({ label, kind, ...props }: InputProps) {
    const inputType = kind ?? props.type ?? 'text';

    return (
        <label>
            {label ? <span>{label}</span> : null}
            <input {...props} type={inputType} />
        </label>
    );
}
function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button {...props} type={props.type ?? 'button'} />;
}

export const registry = createRegistry({
    Page,
    Section,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Badge,
    Input,
    Button,
});

