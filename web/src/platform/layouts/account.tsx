import { Outlet } from 'react-router';
import Content from '@/components/layouts/content';

/** Renders standalone account pages inside the shared content surface. */
export default function Account() {
    return (
        <Content>
            <meta name="robots" content="noindex, nofollow" />
            <Outlet />
        </Content>
    );
}
