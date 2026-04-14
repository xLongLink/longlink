import { createRegistry } from '../src';
function Section(props: React.HTMLAttributes<HTMLElement>) {
    return (
        <section
            {...props}
            style={{
                display: 'grid',
                gap: '1rem',
                ...props.style,
            }}
        />
    );
}

function Title(props: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 {...props} />;
}

function Text(props: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p {...props} />;
}

function Card(props: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <article
            {...props}
            style={{
                border: '1px solid #d4d4d8',
                borderRadius: '0.75rem',
                padding: '1rem',
                display: 'grid',
                gap: '0.5rem',
                ...props.style,
            }}
        />
    );
}

export const registry = createRegistry({
    Section,
    Title,
    Text,
    Card,
});
