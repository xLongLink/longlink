import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/api/self-hosted.md?raw';

/** Renders the self-hosted control plane page. */
export default function SelfHostedControlPlanePage() {
    return <MarkdownDoc content={markdown} />;
}
