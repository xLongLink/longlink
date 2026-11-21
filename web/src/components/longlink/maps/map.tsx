import type { RefAttributes } from 'react';
import * as mapcn from '@/components/mapcn/map';
import { ErrorBoundary } from 'react-error-boundary';
import { Empty } from '@/components/longlink/display/empty';
import type { PublicComponent, PublicProps } from '../props';
import { Button } from '@/components/longlink/action/button';

export const MapGeoJSON: PublicComponent<typeof mapcn.MapGeoJSON> = mapcn.MapGeoJSON;
export const MapControls: PublicComponent<typeof mapcn.MapControls> = mapcn.MapControls;

/** Keeps WebGL initialization failures local to the composed map region. */
export function ViewMap(props: PublicProps<Omit<mapcn.MapProps, 'theme'> & RefAttributes<mapcn.MapRef>>) {
    return (
        <ErrorBoundary
            fallbackRender={({ resetErrorBoundary }) => (
                <div role="alert" className="flex min-w-0 flex-1">
                    <Empty title="Unable to load map">
                        <Button type="button" size="sm" variant="outline" onClick={resetErrorBoundary}>
                            Retry
                        </Button>
                    </Empty>
                </div>
            )}
        >
            <mapcn.Map {...props} theme={undefined} />
        </ErrorBoundary>
    );
}
