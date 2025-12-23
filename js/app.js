// Main Application Logic

let uploadedFiles = [];
let currentAction = 'merge';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.js';
    }
    initializeApp();
});

function initializeApp() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const actionButtons = {
        merge: document.getElementById('btnMerge'),
        split: document.getElementById('btnSplit'),
        compress: document.getElementById('btnCompress'),
        watermark: document.getElementById('btnWatermark'),
        pdfText: document.getElementById('btnPdfText'),
        pdfImages: document.getElementById('btnPdfImages'),
        imagesPdf: document.getElementById('btnImagesPdf'),
        reorder: document.getElementById('btnReorder'),
        pageNumbers: document.getElementById('btnPageNumbers'),
        flatten: document.getElementById('btnFlatten')
    };

    // Click to upload
    dropZone.addEventListener('click', () => fileInput.click());

    // File selected via input
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Drag and drop functionality
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // Action button selection
    Object.entries(actionButtons).forEach(([key, btn]) => {
        btn.addEventListener('click', () => {
            currentAction = key;
            setActiveAction(actionButtons, btn);
            setStatus(`Selected: ${capitalize(key)}. Configure options then run.`, 'info');
        });
    });
    setActiveAction(actionButtons, actionButtons.merge);

    // Run action
    document.getElementById('btnRun').addEventListener('click', handleRun);

    // Reset files
    document.getElementById('btnReset').addEventListener('click', () => {
        uploadedFiles = [];
        updateFileList();
        setStatus('Cleared files. Drop PDFs to start again.', 'info');
    });

    // Compress slider readout
    const compressInput = document.getElementById('compressInput');
    const compressValue = document.getElementById('compressValue');
    compressValue.textContent = compressInput.value;
    compressInput.addEventListener('input', () => {
        compressValue.textContent = compressInput.value;
    });

    // Feature card clicks map to same actions
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            const action = card.dataset.action;
            currentAction = action;
            setActiveAction(actionButtons, actionButtons[action]);
            setStatus(`Selected: ${capitalize(action)}. Configure options then run.`, 'info');
            document.getElementById('workspace').scrollIntoView({ behavior: 'smooth' });
        });
    });

    setStatus('Drop PDFs to start. Processing stays in your browser.', 'info');
}

function handleFiles(files) {
    const accepted = Array.from(files).filter(file => {
        return file.type === 'application/pdf' || file.type.startsWith('image/');
    });
    uploadedFiles = accepted;

    if (uploadedFiles.length === 0) {
        setStatus('Please add valid PDF or image files.', 'error');
        alert('Please upload valid PDF or image files');
        return;
    }

    updateFileList();
    setStatus(`${uploadedFiles.length} PDF(s) ready. Choose a tool and run.`, 'success');
}

function setActiveAction(actionButtons, activeBtn) {
    Object.values(actionButtons).forEach(btn => btn.classList.remove('ring-2', 'ring-blue-300'));
    activeBtn.classList.add('ring-2', 'ring-blue-300');
}

async function handleRun() {
    if (uploadedFiles.length === 0) {
        setStatus('Upload PDFs first.', 'error');
        alert('Please upload PDF files first!');
        return;
    }

    try {
        switch(currentAction) {
            case 'merge':
                if (uploadedFiles.length < 2) {
                    setStatus('Need at least 2 PDFs to merge.', 'error');
                    alert('Please upload at least 2 PDFs to merge');
                    return;
                }
                await performMerge();
                break;
            case 'split':
                await performSplit();
                break;
            case 'compress':
                await performCompress();
                break;
            case 'watermark':
                await performWatermark();
                break;
            case 'pdfText':
                await performPdfToText();
                break;
            case 'pdfImages':
                await performPdfToImages();
                break;
            case 'imagesPdf':
                await performImagesToPdf();
                break;
            case 'reorder':
                await performReorder();
                break;
            case 'pageNumbers':
                await performPageNumbers();
                break;
            case 'flatten':
                await performFlatten();
                break;
        }
    } catch (err) {
        console.error(err);
        setStatus('Something went wrong. Please try again.', 'error');
    }
}

function updateFileList() {
    const list = document.getElementById('fileList');
    list.innerHTML = '';
    if (uploadedFiles.length === 0) {
        const li = document.createElement('li');
        li.classList.add('empty');
        li.textContent = 'No PDFs loaded yet';
        list.appendChild(li);
        return;
    }

    uploadedFiles.forEach((file, idx) => {
        const li = document.createElement('li');
        const sizeMb = (file.size / 1024 / 1024).toFixed(2);
        li.textContent = `${idx + 1}. ${file.name} (${sizeMb} MB)`;
        list.appendChild(li);
    });
}

async function performMerge() {
    setStatus('Merging PDFs…', 'info');
    try {
        const mergedPdf = await mergePDFs(uploadedFiles);
        if (!mergedPdf) throw new Error('Merge returned empty result');
        downloadPDF(mergedPdf, 'merged.pdf');
        setStatus('Merged and downloaded as merged.pdf', 'success');
    } catch (err) {
        console.error(err);
        setStatus('Error merging PDFs. Please try again.', 'error');
    }
}

async function performSplit() {
    const pageRange = document.getElementById('splitInput').value.trim();
    if (!pageRange) {
        setStatus('Enter page numbers to split.', 'error');
        return;
    }

    const pages = parsePageRange(pageRange);
    if (pages.length === 0) {
        setStatus('No valid pages to split.', 'error');
        return;
    }

    setStatus('Splitting PDF…', 'info');
    try {
        const splitPdf = await splitPDF(uploadedFiles[0], pages);
        if (!splitPdf) throw new Error('Split returned empty result');
        downloadPDF(splitPdf, 'split.pdf');
        setStatus('Split complete — downloaded as split.pdf', 'success');
    } catch (err) {
        console.error(err);
        setStatus('Error splitting PDF. Check page numbers and try again.', 'error');
    }
}

async function performCompress() {
    const level = parseInt(document.getElementById('compressInput').value, 10) || 3;
    setStatus(`Compressing PDF (level ${level})…`, 'info');
    try {
        const compressedPdf = await compressPDF(uploadedFiles[0], level);
        if (!compressedPdf) throw new Error('Compress returned empty result');
        downloadPDF(compressedPdf, 'compressed.pdf');
        setStatus('Compressed and downloaded as compressed.pdf', 'success');
    } catch (err) {
        console.error(err);
        setStatus('Error compressing PDF. Please try again.', 'error');
    }
}

async function performWatermark() {
    const watermarkText = document.getElementById('watermarkInput').value.trim();
    if (!watermarkText) {
        setStatus('Enter watermark text.', 'error');
        return;
    }

    setStatus('Adding watermark…', 'info');
    try {
        const watermarkedPdf = await addWatermark(uploadedFiles[0], watermarkText);
        if (!watermarkedPdf) throw new Error('Watermark returned empty result');
        downloadPDF(watermarkedPdf, 'watermarked.pdf');
        setStatus('Watermark added — downloaded as watermarked.pdf', 'success');
    } catch (err) {
        console.error(err);
        setStatus(`Error adding watermark: ${err.message || 'Please try again.'}`, 'error');
    }
}

async function performPdfToText() {
    if (!ensurePdfAvailable()) return;
    const format = document.getElementById('exportFormat').value || 'text';
    setStatus('Extracting text…', 'info');
    const content = await pdfToTextFormatted(uploadedFiles[0], format);
    let filename = 'export.txt';
    if (format === 'markdown') filename = 'export.md';
    if (format === 'html') filename = 'export.html';
    const mime = format === 'html' ? 'text/html' : 'text/plain';
    downloadText(content, filename, mime);
    setStatus(`Exported as ${filename}`, 'success');
}

async function performPdfToImages() {
    if (!ensurePdfAvailable()) return;
    setStatus('Rendering pages to images…', 'info');
    const images = await pdfToImages(uploadedFiles[0]);
    images.forEach((img, idx) => downloadBlob(img, `page-${idx + 1}.png`));
    setStatus('Exported pages as PNG images.', 'success');
}

async function performImagesToPdf() {
    const images = uploadedFiles.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) {
        setStatus('Please add JPG/PNG images for this tool.', 'error');
        alert('Please upload JPG/PNG images for Images → PDF');
        return;
    }
    setStatus('Building PDF from images…', 'info');
    const pdfBytes = await imagesToPdf(images);
    downloadPDF(pdfBytes, 'images.pdf');
    setStatus('Images combined into images.pdf', 'success');
}

async function performReorder() {
    if (!ensurePdfAvailable()) return;
    const orderText = document.getElementById('reorderInput').value.trim();
    if (!orderText) {
        setStatus('Enter the new page order.', 'error');
        return;
    }
    const pages = parsePageRange(orderText);
    if (pages.length === 0) {
        setStatus('No valid pages to reorder.', 'error');
        return;
    }
    setStatus('Reordering pages…', 'info');
    const reordered = await reorderPDF(uploadedFiles[0], pages);
    downloadPDF(reordered, 'reordered.pdf');
    setStatus('Reordered and downloaded as reordered.pdf', 'success');
}

async function performPageNumbers() {
    if (!ensurePdfAvailable()) return;
    const start = parseInt(document.getElementById('pageNumberStart').value, 10) || 1;
    setStatus('Adding page numbers…', 'info');
    const numbered = await addPageNumbers(uploadedFiles[0], start);
    downloadPDF(numbered, 'paged.pdf');
    setStatus('Page numbers added — downloaded as paged.pdf', 'success');
}

async function performFlatten() {
    if (!ensurePdfAvailable()) return;
    setStatus('Flattening forms…', 'info');
    const flattened = await flattenPDF(uploadedFiles[0]);
    downloadPDF(flattened, 'flattened.pdf');
    setStatus('Flattened and downloaded as flattened.pdf', 'success');
}

function parsePageRange(range) {
    const pages = [];
    const parts = range.split(',');

    parts.forEach(part => {
        if (!part.trim()) return;
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
            if (isNaN(start) || isNaN(end)) return;
            for (let i = start; i <= end; i++) {
                pages.push(i - 1); // 0-indexed
            }
        } else {
            const page = parseInt(part.trim(), 10);
            if (!isNaN(page)) {
                pages.push(page - 1);
            }
        }
    });

    return pages.filter(p => p >= 0);
}

function ensurePdfAvailable() {
    if (uploadedFiles.length === 0) {
        setStatus('Upload a PDF first.', 'error');
        alert('Please upload PDF files first!');
        return false;
    }
    const hasPdf = uploadedFiles.some(f => f.type === 'application/pdf');
    if (!hasPdf) {
        setStatus('No PDF found in selection.', 'error');
        alert('Please upload at least one PDF for this tool');
        return false;
    }
    return true;
}

function downloadPDF(pdfBytes, filename) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`Downloaded: ${filename}`);
}

function downloadText(text, filename, type = 'text/plain') {
    const blob = new Blob([text], { type });
    downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function setStatus(message, type = 'info') {
    const box = document.getElementById('statusMessage');
    const chip = document.getElementById('statusChip');
    const colors = {
        info: { chip: 'rgba(96,165,250,0.25)', text: '#60a5fa' },
        success: { chip: 'rgba(16,185,129,0.2)', text: '#34d399' },
        error: { chip: 'rgba(248,113,113,0.2)', text: '#f87171' }
    };

    chip.style.background = colors[type].chip;
    chip.style.borderColor = colors[type].text;
    chip.style.color = colors[type].text;
    chip.textContent = type === 'success' ? 'Ready' : capitalize(type);
    box.textContent = message;
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}
