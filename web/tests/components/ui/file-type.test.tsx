// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { FileType } from '@/components/longlink/display/file-type';

it('distinguishes normalized extensions from glyph-only families', () => {
    // Arrange
    const types = [' ..DOCX ', 'document'];

    // Act
    const output = renderStatic(types.map((type) => <FileType key={type} type={type} />));
    const [extension, family] = output.querySelectorAll('[data-slot="file-type"]');

    // Assert
    expect(extension?.getAttribute('aria-label')).toBe('DOCX file');
    expect(extension?.querySelector('[data-slot="file-type-label"]')?.textContent).toBe('DOCX');
    expect(extension?.querySelector('[data-slot="file-type-glyph"]')).toBeNull();
    expect(family?.getAttribute('aria-label')).toBe('Document');
    expect(family?.querySelector('[data-slot="file-type-label"]')).toBeNull();
    expect(family?.querySelector('[data-slot="file-type-glyph"]')).not.toBeNull();
});

it('keeps file and inherited property names as unknown extensions with custom labels', () => {
    // Arrange
    const types = ['file', 'constructor', 'custom-format'];

    // Act
    const output = renderStatic(types.map((type) => <FileType key={type} type={type} label="V3" />));
    const icons = output.querySelectorAll('[data-slot="file-type"]');

    // Assert
    expect(icons).toHaveLength(types.length);
    for (const [index, icon] of icons.entries()) {
        expect(icon.getAttribute('aria-label')).toBe(`V3, ${types[index]?.toUpperCase()} file`);
        expect(icon.querySelector('[data-slot="file-type-label"]')?.textContent).toBe('V3');
        expect(icon.querySelector('[data-slot="file-type-glyph"]')).toBeNull();
    }
    expect(renderStatic(<FileType type="file" />).textContent).toBe('FILE');
});

it('renders omitted, blank, and explicit empty types without an extension label', () => {
    // Arrange
    const types = [undefined, ' ... ', 'empty'];

    // Act
    const output = renderStatic(types.map((type) => <FileType key={String(type)} type={type} />));
    const icons = output.querySelectorAll('[data-slot="file-type"]');

    // Assert
    expect(icons).toHaveLength(types.length);
    for (const icon of icons) {
        expect(icon.getAttribute('aria-label')).toBe('File');
        expect(icon.querySelector('[data-slot="file-type-label"]')).toBeNull();
        expect(icon.querySelector('[data-slot="file-type-glyph"]')).toBeNull();
    }
});
