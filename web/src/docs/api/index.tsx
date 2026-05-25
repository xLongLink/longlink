import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/api/index.md?raw';

/** Renders the control plane documentation page. */
export default function ControlPlanePage() {
    return <MarkdownDoc content={markdown} />;
}
