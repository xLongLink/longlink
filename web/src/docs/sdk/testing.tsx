import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/sdk/testing.md?raw';

/** Renders the SDK testing page. */
export default function SdkTestingPage() {
    return <MarkdownDoc content={markdown} />;
}
