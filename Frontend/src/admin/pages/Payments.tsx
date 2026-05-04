import api from "../../services/api";
import { useEffect, useState, useCallback } from "react";
import { getSocket } from "../../services/socket";
import { 
  CreditCard, Banknote, Search, 
  CheckCircle2, XCircle, Clock, 
  User as UserIcon, Hash, ExternalLink 
} from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";

const Payments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPayments = useCallback(() => {
    setLoading(true);
    api.get("/admin/payments")
      .then((res) => {
        setPayments(res.data.data);
      })
      .catch((err) => console.error("Failed to fetch payments", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => fetchPayments();
    socket.on('payment:created', refresh);
    socket.on('payment:verified', refresh);
    return () => {
      socket.off('payment:created', refresh);
      socket.off('payment:verified', refresh);
    };
  }, [fetchPayments]);

  const filteredPayments = payments.filter(p => 
    p.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.razerpayPaymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p._id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-gray-200 pb-8">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="w-full max-w-sm">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  {['Bill ID', 'Customer', 'Amount', 'Method', 'Transaction ID', 'Time', 'Status'].map((h, i) => (
                    <th key={i} className="px-8 py-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </td>
                    <td className="px-8 py-5"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </td>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-24 rounded-full" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">Payment Ledger</h1>
          <p className="text-sm font-medium text-gray-500">Full audit history of all financial transactions.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search User or TX ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-gray-900/5 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-8 py-5">Bill ID</th>
                <th className="px-8 py-5">Customer</th>
                <th className="px-8 py-5">Amount</th>
                <th className="px-8 py-5">Method</th>
                <th className="px-8 py-5">Transaction ID</th>
                <th className="px-8 py-5">Time</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50/50 group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Hash className="w-3.5 h-3.5 opacity-40" />
                      <span className="text-[11px] font-mono font-bold uppercase">{p._id.slice(-8)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-gray-900 tracking-tight">{p.user?.fullName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-gray-900 tracking-tight">₹{p.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tight ${
                      p.paymentMethod === 'online' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {p.paymentMethod === 'online' ? <CreditCard className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                      {p.paymentMethod}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-[10px] font-mono font-bold text-gray-400">
                       {p.razerpayPaymentId ? (
                         <div className="flex items-center gap-2">
                           <span className="text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50 italic">{p.razerpayPaymentId}</span>
                           <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer text-indigo-400" />
                         </div>
                       ) : (
                         <span className="opacity-30 italic">CASH-DESK</span>
                       )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900">{new Date(p.paidAt || p.createdAt).toLocaleDateString()}</span>
                      <span className="text-[10px] font-medium text-gray-400 uppercase">{new Date(p.paidAt || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tight ${
                      p.paymentStatus === 'successful' || p.paymentStatus === 'completed' || p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      p.paymentStatus === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
                      'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {p.paymentStatus === 'successful' || p.paymentStatus === 'completed' || p.paymentStatus === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                       p.paymentStatus === 'failed' ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {p.paymentStatus}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPayments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No transaction records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;