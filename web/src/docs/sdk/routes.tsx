import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/sdk/routes.md?raw';

/** Renders the SDK routes page. */
export default function SdkRoutesPage() {
    return <MarkdownDoc content={markdown} />;
}
