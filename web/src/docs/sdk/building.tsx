import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/sdk/building.md?raw';

/** Renders the SDK build page. */
export default function SdkBuildingPage() {
    return <MarkdownDoc content={markdown} />;
}
