/**
 * SecurePDFViewer adapter
 * Re-exports the hardened ProtectedPdfViewer to maintain backwards compatibility
 * with all existing components while ensuring full content protection.
 */
export {
  ProtectedPdfViewer as SecurePDFViewer,
  ProtectedPdfViewer,
  type ProtectedPdfViewerProps,
} from "./ProtectedPdfViewer";
