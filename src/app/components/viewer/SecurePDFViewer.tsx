/**
 * SecurePDFViewer adapter
 * Re-exports the controlled ProtectedPdfViewer to maintain backwards compatibility
 * while ensuring full view-only content protection.
 */
export {
  ProtectedPdfViewer as SecurePDFViewer,
  ProtectedPdfViewer,
  type ProtectedPdfViewerProps,
} from "./ProtectedPdfViewer";
