import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/sdk/index.md?raw';

/** Renders the SDK overview page. */
export default function SdkOverviewPage() {
    return <MarkdownDoc content={markdown} />;
}
