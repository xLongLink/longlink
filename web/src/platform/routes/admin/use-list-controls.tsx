import { Search, X } from 'lucide-react';
import { useDeferredValue, useRef, useState } from 'react';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';

const pageSize = 25;

export function useListControls(resource: string, placeholder: string) {
    const [filters, setFilters] = useState({ search: '', page: 1 });
    const { search, page } = useDeferredValue(filters);
    const input = useRef<HTMLInputElement>(null);
    const id = `search-${resource}`;
    const label = `Search ${resource}`;

    function setSearch(search: string) {
        setFilters({ search, page: 1 });
    }

    return {
        suffix: `?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(search.trim())}`,
        pagination: {
            page: filters.page,
            pageSize,
            onPageChange: (page: number) => setFilters((current) => ({ ...current, page }))
        },
        searchField: (
            <Field>
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                <InputGroup>
                    <InputGroupInput
                        ref={input}
                        id={id}
                        placeholder={placeholder}
                        value={filters.search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <InputGroupAddon aria-hidden="true">
                        <Search />
                    </InputGroupAddon>
                    {filters.search !== '' && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                size="icon-xs"
                                aria-label={`Clear ${label}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setSearch('');
                                    input.current?.focus({ preventScroll: true });
                                }}
                            >
                                <X aria-hidden="true" />
                            </InputGroupButton>
                        </InputGroupAddon>
                    )}
                </InputGroup>
            </Field>
        )
    };
}
