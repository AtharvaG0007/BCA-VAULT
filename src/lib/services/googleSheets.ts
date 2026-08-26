// Shared display types only. Google Sheets and Apps Script calls are server-side
// under /api; this browser module must never contain an endpoint or secret.
export interface SheetOrder {
  orderId: string;
  date: string;
  time: string;
  fullName: string;
  phone: string;
  email: string;
  college: string;
  course: string;
  semester: string;
  bundleName: string;
  bundlePrice: string;
  screenshotUrl: string;
  status: string;
  notesSent: string;
}
