import { action, createRegistry } from '../src';
import { Grid } from '../src';

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
                ...props.style,
            }}
        >
            <Grid gap="0.5rem">{props.children}</Grid>
        </article>
    );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    action: React.MouseEventHandler<HTMLButtonElement>;
    pending: boolean;
};

function Button({ action: runAction, pending, children, ...props }: ButtonProps) {
    const { disabled, onClick: _onClick, ...rest } = props;

    return (
        <button
            type="button"
            onClick={runAction}
            disabled={pending || disabled}
            {...rest}
            style={{
                border: 'none',
                borderRadius: '0.625rem',
                background: pending ? '#94a3b8' : '#0f172a',
                color: '#fff',
                padding: '0.625rem 0.875rem',
                cursor: pending ? 'wait' : 'pointer',
                justifySelf: 'start',
                ...rest.style,
            }}
        >
            {pending ? 'Saving...' : children}
        </button>
    );
}

export const registry = createRegistry({
    Section,
    Title,
    Text,
    Card,
    Button: action(Button),
});
