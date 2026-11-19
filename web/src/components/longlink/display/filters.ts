import type { PublicProps } from '../props';
import * as filters from '@/components/reui/filters/filters';

export const Filters: <Value = unknown, Option = unknown>(
    props: PublicProps<Parameters<typeof filters.Filters<Value, Option>>[0]>
) => ReturnType<typeof filters.Filters> = filters.Filters;

export { createFilterQuery, flattenFilterConditions } from '@/components/reui/filters/filters-query';
