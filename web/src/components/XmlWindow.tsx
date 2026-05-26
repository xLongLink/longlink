import { Window } from '@/components/Window';

type XmlWindowProps = {
    children: string;
};

/** Renders XML snippets inside the playground-style preview window. */
export function XmlWindow({ children }: XmlWindowProps) {
    return (
        <div className="w-full max-w-3xl">
            <Window defaultViewMode="source">{children}</Window>
        </div>
    );
}
