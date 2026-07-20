import { Component, type ReactNode } from 'react';
import { Banner } from '@astryxdesign/core/Banner';

type XmlErrorBoundaryProps = {
    children: ReactNode;
    resetKey?: string | number | object | null;
};

type XmlErrorBoundaryState = {
    error: Error | null;
};

/** Keeps XML rendering failures scoped to the XML surface. */
export class XmlErrorBoundary extends Component<XmlErrorBoundaryProps, XmlErrorBoundaryState> {
    state: XmlErrorBoundaryState = { error: null };

    /** Stores the thrown error so the XML area can render the message. */
    static getDerivedStateFromError(error: Error): XmlErrorBoundaryState {
        return { error };
    }

    /** Clears a previous XML error when the rendered XML node changes. */
    componentDidUpdate(previousProps: XmlErrorBoundaryProps) {
        // Clear the stored error when the reset key changes.
        if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
            this.setState({ error: null });
        }
    }

    /** Renders the XML error message or the protected XML subtree. */
    render() {
        // Render the captured XML error instead of children.
        if (this.state.error) {
            return <Banner status="error" title={this.state.error.message || 'XML rendering failed'} />;
        }

        return this.props.children;
    }
}
