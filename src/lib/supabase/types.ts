export type UserRole = "superadmin" | "admin" | "member";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended";
  branch?: string;
  semester?: number;
  college?: string;
  createdAt: string;
  createdBy: string;
}

export interface Note {
  id?: string;
  title: string;
  subject: string;
  semester: number;
  type: "notes" | "pyq" | "analysis" | "short" | "mcq";
  description: string;
  price: number;
  compareAtPrice?: number;
  storageRef: string;
  coverImageRef?: string;
  pageCount?: number;
  isPublished: boolean;
  isFeatured: boolean;
  createdBy: string;
  createdAt: string;
  downloadCount: number;
  purchaseCount: number;
  rating?: number;
  ratingCount?: number;
}

export interface Bundle {
  id?: string;
  title: string;
  description: string;
  type: "semester" | "subject" | "exam" | "premium";
  noteIds: string[];
  originalPrice: number;
  discountedPrice: number;
  savingsPercent: number;
  isPublished: boolean;
  isFeatured: boolean;
  createdBy: string;
  createdAt: string;
  purchaseCount: number;
}

export interface Order {
  id?: string;
  uid: string;
  packageId?: string;
  noteId?: string;
  bundleId?: string;
  paymentId?: string;
  total: number;
  status: "pending" | "completed" | "failed" | "refunded";
  createdAt: string;
}

export interface Payment {
  id?: string;
  userId: string;
  amount: number;
  gateway: string;
  status: "success" | "failed" | "refunded";
  orderId?: string;
  createdAt: string;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  action: string;
  role: string;
  meta?: Record<string, string>;
  timestamp: string;
}

export interface LegalAcceptance {
  accepted: boolean;
  acceptedAt: string;
  termsVersion: string;
  privacyVersion: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalNotes: number;
  totalBundles: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface CreateStudentPayload {
  full_name: string;
  email: string;
  phone?: string;
  course?: string;
  semester?: number;
  password?: string;
}

export interface CreateStudentResponse {
  success: boolean;
  student: {
    user_id: string;
    email: string;
    temporary_password?: string;
  };
}

