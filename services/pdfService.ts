
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * PDF.js v5+ requires an ES module worker (.mjs).
 * We pin the version and use unpkg for reliable asset delivery.
 */
const PDFJS_VERSION = '5.4.530';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export const loadPdfAndGetPreviews = async (file: File): Promise<{ pageCount: number; previews: string[] }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      // Helps avoid cross-origin font issues in some environments
      disableFontFace: true 
    });
    
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const previews: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      // scale 0.4 provides a good balance between preview quality and memory usage
      const viewport = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ 
          canvasContext: context, 
          viewport: viewport 
        }).promise;
        
        // Use JPEG with 0.7 quality to significantly reduce memory footprint for the UI state
        previews.push(canvas.toDataURL('image/jpeg', 0.7));
        
        // Release page resources to prevent memory leaks
        (page as any).cleanup?.();
      }
    }

    return { pageCount, previews };
  } catch (error) {
    console.error("PDF Preview Generation Error:", error);
    throw error;
  }
};

export const mergeAndDownloadPdf = async (pages: { sourceFile: File; pageIndex: number }[], fileName: string) => {
  const mergedPdf = await PDFDocument.create();
  const sourcePdfCache: Map<string, PDFDocument> = new Map();

  for (const item of pages) {
    const fileKey = `${item.sourceFile.name}-${item.sourceFile.size}`;
    let sourceDoc = sourcePdfCache.get(fileKey);
    
    if (!sourceDoc) {
      const bytes = await item.sourceFile.arrayBuffer();
      sourceDoc = await PDFDocument.load(bytes);
      sourcePdfCache.set(fileKey, sourceDoc);
    }

    const [copiedPage] = await mergedPdf.copyPages(sourceDoc, [item.pageIndex]);
    mergedPdf.addPage(copiedPage);
  }

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Revoke the URL after a delay to ensure the browser has triggered the download
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
