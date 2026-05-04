import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/payment';

interface PaymentModalProps {
  bookingId: string;
  amount: number;
  onSuccess: (paymentId: string) => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ bookingId, amount, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    setStatus('processing');

    try {
      const order = await createRazorpayOrder(bookingId);

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "Parkify",
        description: `Payment for Parking Slot Booking`,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            setLoading(true);
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: bookingId
            });
            setStatus('success');
            setTimeout(() => onSuccess(response.razorpay_payment_id), 2000);
          } catch (err: any) {
            setError(err.response?.data?.message || "Payment verification failed");
            setStatus('failed');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: "", 
          email: "",
          contact: ""
        },
        theme: {
          color: "#111827"
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatus('idle');
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(response.error.description);
        setStatus('failed');
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not initiate payment");
      setStatus('failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="relative px-8 pt-8 pb-4">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-gray-900/20">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Secure Payment</h2>
          <p className="text-gray-500 text-sm mt-1">Complete your transaction using Razorpay</p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500 font-medium">Amount to Pay</span>
              <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-md font-bold uppercase tracking-wider">INR</span>
            </div>
            <div className="text-4xl font-black text-gray-900">₹{amount.toFixed(2)}</div>
          </div>

          {status === 'success' ? (
            <div className="flex flex-col items-center py-6 text-center animate-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Payment Successful</h3>
              <p className="text-gray-500 text-sm mt-2">Your booking has been confirmed.</p>
            </div>
          ) : status === 'failed' ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 mb-6 animate-in shake duration-300">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-900">Payment Failed</p>
                <p className="text-xs text-red-700 mt-1">{error || "An unexpected error occurred. Please try again."}</p>
              </div>
            </div>
          ) : null}

          {status !== 'success' && (
            <button
              onClick={handlePayment}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black hover:shadow-xl hover:shadow-gray-900/20'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay Now ₹{amount.toFixed(2)}
                </>
              )}
            </button>
          )}

          {status === 'idle' && (
            <p className="text-center text-[10px] text-gray-400 mt-6 uppercase font-bold tracking-[0.2em]">
              Powered by Razorpay Secure
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
            By proceeding, you agree to our Terms of Service and Privacy Policy. 
            All transactions are encrypted and secure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;