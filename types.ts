
export interface PDFPage {
  id: string;
  sourceFileId: string;
  pageIndex: number;
  previewUrl: string;
  originalFileName: string;
}

export interface PDFFile {
  id: string;
  name: string;
  file: File;
  pageCount: number;
}
