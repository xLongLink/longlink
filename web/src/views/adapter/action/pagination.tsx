import { viewComponent } from '../props';
import * as data from '@/components/custom/data-pagination';
import * as pagination from '@/components/shadcn/pagination';

export const Pagination = viewComponent(pagination.Pagination);

export const PaginationContent = viewComponent(pagination.PaginationContent);

export const PaginationItem = viewComponent(pagination.PaginationItem);

export const PaginationLink = viewComponent(pagination.PaginationLink);

export const PaginationPrevious = viewComponent(pagination.PaginationPrevious);

export const PaginationNext = viewComponent(pagination.PaginationNext);

export const PaginationEllipsis = viewComponent(pagination.PaginationEllipsis);

export const DataPagination = viewComponent(data.DataPagination);
