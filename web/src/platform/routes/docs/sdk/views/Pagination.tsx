import ViewLayout from './ViewLayout';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext
} from '@/components/shadcn/pagination';

export default function PaginationPage() {
    return (
        <ViewLayout
            name="Pagination"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Compose PaginationContent and PaginationItem.' },
                { name: 'PaginationLink.href', type: 'string', description: 'Destination URL for the page.' },
                { name: 'PaginationLink.isActive', type: 'boolean', description: 'Identifies the current page.' },
                {
                    name: 'PaginationPrevious / PaginationNext',
                    type: 'anchor props',
                    description: 'Links to the adjacent pages.'
                }
            ]}
            example={{
                title: 'Pagination',
                preview: <PaginationExample />,
                code: `<Pagination>
  <PaginationContent>
    <PaginationItem><PaginationPrevious href="?page=1" /></PaginationItem>
    <PaginationItem><PaginationLink href="?page=1">1</PaginationLink></PaginationItem>
    <PaginationItem><PaginationLink href="?page=2" isActive>2</PaginationLink></PaginationItem>
    <PaginationItem><PaginationNext href="?page=3" /></PaginationItem>
  </PaginationContent>
</Pagination>`
            }}
        />
    );
}

export function PaginationExample() {
    return (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious href="?page=1" />
                </PaginationItem>
                <PaginationItem>
                    <PaginationLink href="?page=1">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                    <PaginationLink href="?page=2" isActive>
                        2
                    </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                    <PaginationNext href="?page=3" />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
