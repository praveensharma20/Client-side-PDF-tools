// PDF Operations using pdf-lib

const { PDFDocument, degrees, StandardFonts, rgb } = PDFLib;

// Merge multiple PDFs
async function mergePDFs(pdfFiles) {
    try {
        const mergedPdf = await PDFDocument.create();
        
        for (const file of pdfFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        
        const mergedPdfBytes = await mergedPdf.save();
        return mergedPdfBytes;
    } catch (error) {
        console.error('Error merging PDFs:', error);
        alert('Error merging PDFs. Please try again.');
    }
}

// PDF to text/markdown/html (best effort using PDF.js)
async function pdfToTextFormatted(pdfFile, format = 'text') {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str).join(' ');
        pages.push(strings.trim());
    }

    if (format === 'markdown') {
        return pages
            .map((p, idx) => `## Page ${idx + 1}\n\n${p}`)
            .join('\n\n');
    }

    if (format === 'html') {
        const body = pages
            .map((p, idx) => `<h2>Page ${idx + 1}</h2><p>${escapeHtml(p)}</p>`)
            .join('\n');
        return `<!doctype html><html><head><meta charset="utf-8"><title>PDF Export</title></head><body>${body}</body></html>`;
    }

    // plain text
    return pages.join('\n\n');
}

// PDF to images (PNG per page)
async function pdfToImages(pdfFile) {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        images.push(blob);
    }
    return images;
}

// Images to PDF
async function imagesToPdf(imageFiles) {
    const pdfDoc = await PDFDocument.create();

    for (const file of imageFiles) {
        const bytes = await file.arrayBuffer();
        let embedded;
        if (file.type === 'image/png') {
            embedded = await pdfDoc.embedPng(bytes);
        } else {
            embedded = await pdfDoc.embedJpg(bytes);
        }
        const { width, height } = embedded.scale(1);
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embedded, { x: 0, y: 0, width, height });
    }

    return pdfDoc.save();
}

// Reorder pages
async function reorderPDF(pdfFile, pagesOrder) {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pagesOrder);
    copiedPages.forEach((p) => newPdf.addPage(p));
    return newPdf.save();
}

// Add page numbers
async function addPageNumbers(pdfFile, start = 1) {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    pages.forEach((page, idx) => {
        const { width } = page.getSize();
        const text = `${start + idx}`;
        const textWidth = font.widthOfTextAtSize(text, 10);
        page.drawText(text, {
            x: (width - textWidth) / 2,
            y: 20,
            size: 10,
            font,
            color: rgb(0.6, 0.6, 0.6)
        });
    });
    return pdfDoc.save();
}

// Flatten forms (basic)
async function flattenPDF(pdfFile) {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    try {
        const form = pdfDoc.getForm();
        form.flatten();
    } catch (err) {
        console.warn('No forms to flatten or flatten failed', err);
    }
    return pdfDoc.save();
}

// escape HTML for safe embedding in export
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Split PDF (extract specific pages)
async function splitPDF(pdfFile, pageRanges) {
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(pdfDoc, pageRanges);
        pages.forEach((page) => newPdf.addPage(page));
        
        const splitPdfBytes = await newPdf.save();
        return splitPdfBytes;
    } catch (error) {
        console.error('Error splitting PDF:', error);
        alert('Error splitting PDF. Please try again.');
    }
}

// Compress PDF
async function compressPDF(pdfFile, level = 3) {
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        // Remove metadata to reduce size
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
        
        // toggle object streams and disable default page creation as lightweight compression
        const compressedPdfBytes = await pdfDoc.save({
            useObjectStreams: level < 5,
            addDefaultPage: false
        });
        
        return compressedPdfBytes;
    } catch (error) {
        console.error('Error compressing PDF:', error);
        alert('Error compressing PDF. Please try again.');
    }
}

// Add watermark
async function addWatermark(pdfFile, watermarkText) {
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        
        pages.forEach(page => {
            const { width, height } = page.getSize();
            page.drawText(watermarkText, {
                x: width / 2 - (watermarkText.length * 10),
                y: height / 2,
                size: 50,
                font,
                opacity: 0.3,
                rotate: degrees(45),
                color: rgb(0.5, 0.5, 0.5)
            });
        });
        
        const watermarkedPdfBytes = await pdfDoc.save();
        return watermarkedPdfBytes;
    } catch (error) {
        console.error('Error adding watermark:', error);
        throw error;
    }
}

// Delete specific pages
async function deletePages(pdfFile, pagesToDelete) {
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        // Sort in descending order to maintain correct indices
        pagesToDelete.sort((a, b) => b - a);
        
        pagesToDelete.forEach(pageIndex => {
            pdfDoc.removePage(pageIndex);
        });
        
        const modifiedPdfBytes = await pdfDoc.save();
        return modifiedPdfBytes;
    } catch (error) {
        console.error('Error deleting pages:', error);
        throw error;
    }
}

// Rotate pages
async function rotatePages(pdfFile, rotation = 90) {
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        
        pages.forEach(page => {
            page.setRotation(degrees(rotation));
        });
        
        const rotatedPdfBytes = await pdfDoc.save();
        return rotatedPdfBytes;
    } catch (error) {
        console.error('Error rotating pages:', error);
        throw error;
    }
}
