import { Wordmark } from '@/components/Wordmark';
import Platform from '@/platform/layouts/Platform';
import { useCasePages } from '@/platform/usecases';
import { Button } from '@astryxdesign/core/Button';
import { Outlet, useLocation } from 'react-router';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';

/** Renders public use cases with the existing Platform navigation. */
export default function UseCases() {
    // Keep the detail breadcrumb and header-aware scrolling without section tabs.
    const { pathname } = useLocation();
    const isDetail = pathname.replace(/\/+$/, '') === useCasePages[0].path;

    // Preserve the shared Platform navigation and standalone action.
    return (
        <Platform
            breadcrumb={
                isDetail ? (
                    <Breadcrumbs separator=">" variant="supporting">
                        <BreadcrumbItem href="/">
                            <Wordmark />
                        </BreadcrumbItem>
                        <BreadcrumbItem href="/use-cases/">Use Cases</BreadcrumbItem>
                        <BreadcrumbItem isCurrent>{useCasePages[0].label}</BreadcrumbItem>
                    </Breadcrumbs>
                ) : undefined
            }
            action={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
            height={isDetail ? 'fill' : 'auto'}
            tabs={[]}
        >
            <Outlet />
        </Platform>
    );
}
