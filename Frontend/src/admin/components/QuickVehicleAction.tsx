import { useState } from "react";
import { Search, Car, LogIn, LogOut, Loader2, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../../services/api";

const QuickVehicleAction = ({ onActionSuccess }: { onActionSuccess?: () => void }) => {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [exitDetails, setExitDetails] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) return;

    setLoading(true);
    setError("");
    setBooking(null);
    setExitDetails(null);

    try {
      const res = await api.get(`/bookings/vehicle/${vehicleNumber.trim()}`);
      setBooking(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "No active or reserved booking found for this vehicle");
    } finally {
      setLoading(false);
    }
  };

  const handleEntry = async () => {
    if (!booking) return;
    setProcessing(true);
    try {
      await api.patch(`/bookings/${booking._id}/entry`);
      // Refresh local state or just show success
      setBooking({ ...booking, bookingStatus: 'active' });
      if (onActionSuccess) onActionSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to mark entry");
    } finally {
      setProcessing(false);
    }
  };

  const handleExit = async () => {
    if (!booking) return;
    setProcessing(true);
    try {
      const res = await api.patch(`/bookings/${booking._id}/complete`, { paymentMethod });
      setExitDetails(res.data.data);
      setBooking({ ...booking, bookingStatus: 'completed' });
      if (onActionSuccess) onActionSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to mark exit");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setVehicleNumber("");
    setBooking(null);
    setError("");
    setExitDetails(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-gray-50/30">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Car className="w-5 h-5 text-gray-400" /> Gate Operations
        </h3>
        <p className="text-xs text-gray-500 font-medium mt-1">Quick Check-in & Check-out</p>
      </div>

      <div className="p-6 flex-1 space-y-6">
        <form onSubmit={handleSearch} className="relative group">
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            placeholder="TYPE VEHICLE NUMBER..."
            className="w-full pl-12 pr-28 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:bg-white transition-all uppercase"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
          </button>
        </form>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Searching Records</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-800 leading-relaxed">{error}</p>
          </div>
        )}

        {booking && booking.bookingStatus !== 'completed' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Booking Details Card */}
            <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Booking Status</div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${
                    booking.bookingStatus === 'active' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    booking.bookingStatus === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    'bg-indigo-50 text-indigo-700 border-indigo-100'
                  }`}>
                    {booking.bookingStatus === 'active' ? 'On-Site' : booking.bookingStatus === 'confirmed' ? 'Paid & Waiting' : 'Reserved'}
                  </span>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Vehicle Number</div>
                    <div className="text-sm font-bold text-gray-900 tracking-wide font-mono">{booking.vehicleNumber}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 py-2 border-y border-gray-100">
                <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center text-gray-400">
                   <MapPin className="w-5 h-5" />
                </div>
                <div>
                   <div className="text-xs font-bold text-gray-900 uppercase tracking-tight">{booking.slotId?.lotId?.lotName}</div>
                   <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Floor {booking.slotId?.floor} &bull; Spot {booking.slotId?.slotNumber}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-5">
              {booking.bookingStatus === 'active' && (
                <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all ${
                      paymentMethod === "cash" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Cash Payment
                  </button>
                  <button
                    onClick={() => setPaymentMethod("online")}
                    className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all ${
                      paymentMethod === "online" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Online/Prepaid
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {(booking.bookingStatus === 'reserved' || booking.bookingStatus === 'confirmed') ? (
                  <button
                    onClick={handleEntry}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-bold uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-gray-200 transition-all disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                    Confirm Entry
                  </button>
                ) : (
                  <button
                    onClick={handleExit}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-emerald-50 transition-all disabled:opacity-50"
                  >
                     {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                    Confirm {paymentMethod === 'cash' ? 'Cash' : ''} Checkout
                  </button>
                )}
                <button 
                  onClick={reset}
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors py-2"
                >
                  Clear Process
                </button>
              </div>
            </div>
          </div>
        )}

        {exitDetails && (
          <div className="space-y-6 animate-in scale-in-95 duration-300">
            <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                 <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-emerald-900 tracking-tight">Checkout Complete</h4>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Payment Received</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-8 w-full border-t border-emerald-100 pt-6">
                 <div>
                    <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Duration</div>
                    <div className="text-xl font-bold text-emerald-900 tracking-tight">{exitDetails.hours} hrs</div>
                 </div>
                 <div>
                    <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Paid</div>
                    <div className="text-xl font-bold text-emerald-900 tracking-tight">₹{exitDetails.totalPrice}</div>
                    <div className="text-[8px] font-bold text-emerald-500 uppercase tracking-tight mt-1">Method: {exitDetails.paymentMethod}</div>
                 </div>
              </div>
            </div>
            <button
               onClick={reset}
               className="w-full py-4 bg-gray-900 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-black shadow-lg transition-all"
            >
              Finish Session
            </button>
          </div>
        )}

        {!booking && !loading && !error && !exitDetails && (
          <div className="flex flex-col items-center justify-center py-16 text-center opacity-40 group-hover:opacity-60 transition-opacity">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
               <Car className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
              Enter vehicle number to initiate check-in or check-out
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickVehicleAction;
