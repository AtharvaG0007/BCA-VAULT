import { ExternalLink, X } from "lucide-react";
import { useNavigate } from "react-router";
import { GOOGLE_PAYMENT_FORM_URL } from "../pages/PaymentPage";

export interface PaymentItem {
  id: string;
  title: string;
  price: number;
  type: "note" | "bundle";
}

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PaymentItem;
  onSuccess: () => void;
}

export function UPIPaymentModal({ isOpen, onClose }: UPIPaymentModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Payment instructions"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
              Manual payment verification
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Submit payment evidence securely
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Complete your UPI payment, then submit your transaction details via our official Google Form. Access is
          activated after manual admin verification.
        </p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/purchase");
            }}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition"
          >
            View UPI / QR payment instructions
          </button>

          <a
            href={GOOGLE_PAYMENT_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClose()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition"
          >
            Submit Payment Form <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
