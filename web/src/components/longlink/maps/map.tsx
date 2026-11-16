import type { RefAttributes } from 'react';
import type { PublicProps } from '../props';
import * as mapcn from '@/components/mapcn/map';
import { ErrorBoundary } from 'react-error-boundary';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';

/** Keeps WebGL initialization failures local to the composed map region. */
export function ViewMap(props: PublicProps<mapcn.MapProps & RefAttributes<mapcn.MapRef>>) {
    return (
        <ErrorBoundary
            fallbackRender={({ resetErrorBoundary }) => (
                <Empty role="alert" title="Unable to load map">
                    <Button type="button" size="sm" variant="outline" onClick={resetErrorBoundary}>
                        Retry
                    </Button>
                </Empty>
            )}
        >
            <mapcn.Map {...props} />
        </ErrorBoundary>
    );
}
