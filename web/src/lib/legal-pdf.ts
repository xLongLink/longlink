import { jsPDF } from 'jspdf';

/** Downloads a simple text-only PDF for a legal page. */
export function downloadLegalPdf(filename: string, title: string, sections: string[]): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const lineHeight = 16;
    const paragraphGap = 10;
    const sectionGap = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;

    // Keep the document simple and readable with a single title and wrapped body text.
    let y = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(doc.splitTextToSize(title, contentWidth), margin, y);
    y += 30;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    for (const section of sections) {
        const paragraphs = section.split('\n');

        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                y += paragraphGap;
                continue;
            }

            const lines = doc.splitTextToSize(paragraph, contentWidth) as string[];

            for (const line of lines) {
                // Add a new page before writing when the next line would overflow the bottom margin.
                if (y > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }

                doc.text(line, margin, y);
                y += lineHeight;
            }

            y += paragraphGap;
        }

        y += sectionGap;
    }

    doc.save(filename);
}
