import {
    Column,
    Columns,
    Icon,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
    compileExpression,
    evaluate,
    fromXml,
    renderNode,
} from '@xml';
import { describe, expect, it } from 'bun:test';

describe('xml index', () => {
    it('re-exports the main xml runtime helpers', () => {
        expect(typeof compileExpression).toBe('function');
        expect(typeof evaluate).toBe('function');
        expect(typeof fromXml).toBe('function');
        expect(typeof renderNode).toBe('function');
        expect(Column).toBeDefined();
        expect(Columns).toBeDefined();
        expect(Icon).toBeDefined();
        expect(Select).toBeDefined();
        expect(SelectContent).toBeDefined();
        expect(SelectGroup).toBeDefined();
        expect(SelectItem).toBeDefined();
        expect(SelectLabel).toBeDefined();
        expect(SelectSeparator).toBeDefined();
        expect(SelectTrigger).toBeDefined();
        expect(SelectValue).toBeDefined();
        expect(Table).toBeDefined();
        expect(TableHeader).toBeDefined();
        expect(TableBody).toBeDefined();
        expect(TableFooter).toBeDefined();
        expect(TableRow).toBeDefined();
        expect(TableHead).toBeDefined();
        expect(TableCell).toBeDefined();
        expect(TableCaption).toBeDefined();
    });
});
