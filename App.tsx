
import React, { useState, useCallback, useRef } from 'react';
import { 
  FileUp, 
  Download, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Files, 
  X,
  LayoutGrid,
  FileText,
  Loader2,
  Maximize2
} from 'lucide-react';
import { Button } from './components/Button';
import { PDFPage, PDFFile } from './types';
import { loadPdfAndGetPreviews, mergeAndDownloadPdf } from './services/pdfService';

const App: React.FC = () => {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [allPages, setAllPages] = useState<PDFPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsLoading(true);
    try {
      const newFiles: PDFFile[] = [];
      const newPages: PDFPage[] = [];

      for (const file of selectedFiles) {
        if (file.type !== 'application/pdf') continue;

        const { pageCount, previews } = await loadPdfAndGetPreviews(file);
        const fileId = Math.random().toString(36).substr(2, 9);
        
        newFiles.push({
          id: fileId,
          name: file.name,
          file: file,
          pageCount: pageCount
        });

        previews.forEach((previewUrl, index) => {
          newPages.push({
            id: `${fileId}-${index}`,
            sourceFileId: fileId,
            pageIndex: index,
            previewUrl: previewUrl,
            originalFileName: file.name
          });
        });
      }

      setFiles(prev => [...prev, ...newFiles]);
      setAllPages(prev => [...prev, ...newPages]);
    } catch (error) {
      console.error("Error processing PDFs:", error);
      alert("There was an error processing your PDF files.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const movePage = (index: number, direction: 'left' | 'right') => {
    const newPages = [...allPages];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPages.length) return;
    
    [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
    setAllPages(newPages);
  };

  const removePage = (index: number) => {
    setAllPages(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all pages?")) {
      setFiles([]);
      setAllPages([]);
    }
  };

  const handleDownload = async () => {
    if (allPages.length === 0) return;
    
    setIsLoading(true);
    try {
      const pagesToProcess = allPages.map(page => {
        const sourceFile = files.find(f => f.id === page.sourceFileId);
        if (!sourceFile) throw new Error("Source file missing");
        return {
          sourceFile: sourceFile.file,
          pageIndex: page.pageIndex
        };
      });

      await mergeAndDownloadPdf(pagesToProcess, 'merged_document.pdf');
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Files size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">PDF Master</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              multiple 
              accept=".pdf" 
              className="hidden"
            />
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              icon={<Plus size={18} />}
            >
              Add PDFs
            </Button>
            {allPages.length > 0 && (
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleDownload}
                disabled={isLoading}
                icon={isLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              >
                {isLoading ? 'Processing...' : 'Export PDF'}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {allPages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
            <div className="bg-indigo-50 p-6 rounded-full mb-6">
              <FileUp size={48} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Upload your PDFs</h2>
            <p className="text-slate-500 max-w-sm mb-8">
              Select one or more PDF files from your computer to merge, split, or reorder pages. 100% private, everything stays in your browser.
            </p>
            <Button 
              size="lg" 
              onClick={() => fileInputRef.current?.click()}
              icon={<FileUp size={20} />}
            >
              Choose Files
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Workspace</h2>
                <p className="text-sm text-slate-500">{allPages.length} pages in current selection</p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                Clear All
              </Button>
            </div>

            {/* Pages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {allPages.map((page, index) => (
                <div 
                  key={page.id}
                  className="group relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-indigo-300"
                >
                  {/* Preview Image Container */}
                  <div className="relative aspect-[3/4] p-2 overflow-hidden bg-slate-100 rounded-t-xl group">
                    <img 
                      src={page.previewUrl} 
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-contain shadow-sm"
                    />
                    
                    {/* Hover Actions Overlay */}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                       <button 
                        onClick={() => removePage(index)}
                        className="bg-white p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors shadow-lg"
                        title="Remove page"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                      P{index + 1}
                    </div>
                  </div>

                  {/* Metadata & Controls */}
                  <div className="p-3 bg-white rounded-b-xl">
                    <p className="text-[11px] text-slate-400 truncate mb-2 px-1" title={page.originalFileName}>
                      {page.originalFileName}
                    </p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                      <button 
                        disabled={index === 0}
                        onClick={() => movePage(index, 'left')}
                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 transition-colors"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <button 
                         disabled={index === allPages.length - 1}
                        onClick={() => movePage(index, 'right')}
                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 transition-colors"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add More Placeholder */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center aspect-[3/4] border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-slate-400 hover:text-indigo-500"
              >
                <Plus size={32} />
                <span className="text-xs font-medium mt-2">Add more</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer / Instructions */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-slate-600">
            <div>
              <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold">
                <LayoutGrid size={20} className="text-indigo-600" />
                <h3>How to use</h3>
              </div>
              <ul className="text-sm space-y-2">
                <li>1. <strong>Upload:</strong> Choose one or more PDF files.</li>
                <li>2. <strong>Reorder:</strong> Use the arrows to move pages around.</li>
                <li>3. <strong>Split/Delete:</strong> Remove unwanted pages using the trash icon.</li>
                <li>4. <strong>Download:</strong> Click "Export PDF" to save your new file.</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold">
                <Maximize2 size={20} className="text-indigo-600" />
                <h3>Local Processing</h3>
              </div>
              <p className="text-sm leading-relaxed">
                This app uses <strong>pdf-lib</strong> and <strong>pdf.js</strong> to manipulate your files directly in your browser. 
                Your files are <strong>never</strong> uploaded to any server. Your data remains completely private.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold">
                <FileText size={20} className="text-indigo-600" />
                <h3>Features</h3>
              </div>
              <ul className="text-sm space-y-2">
                <li>• Merge multiple PDFs into one</li>
                <li>• Extract/Split specific pages</li>
                <li>• Intuitive page reordering</li>
                <li>• Instant local preview</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} PDF Master - World Class Client-Side PDF Tools.
          </div>
        </div>
      </footer>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-indigo-600 animate-spin" />
            <p className="font-semibold text-slate-700">Processing PDF...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
