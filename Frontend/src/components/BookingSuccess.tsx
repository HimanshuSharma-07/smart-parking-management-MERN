import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, X, MapPin, Car, Calendar, Clock, Hash } from 'lucide-react';

interface BookingSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  bookingDetails: {
    parkingLotName: string;
    parkingLotAddress: string;
    spot: string;
    floor: number;
    vehicleNumber: string;
    startTime: string;
    duration: number;
    totalPrice: number;
  };
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({ isOpen, onClose, bookingDetails }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const end = new Date(new Date(startTime).getTime() + duration * 3600000);
    return end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const { date, time } = formatDateTime(bookingDetails.startTime);
  const endTime = calculateEndTime(bookingDetails.startTime, bookingDetails.duration);

  const handleViewBookings = () => {
    onClose();
    navigate('/my-bookings');
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center z-1000 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl shadow-slate-900/40 border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className="bg-liner-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 pt-7 pb-8 text-white relative text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/30 text-emerald-400 ring-4 ring-emerald-500/10">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Booking Confirmed!</h2>
            <p className="text-slate-400 text-xs mt-1 font-medium">Your parking spot has been successfully reserved</p>
          </div>
        </div>

        {/* Booking Details */}
        <div className="p-6 space-y-3.5 flex-1 overflow-y-auto">
          {/* Parking Lot Card */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/60 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Parking Location</p>
              <p className="text-sm font-bold text-slate-900 tracking-tight">{bookingDetails.parkingLotName}</p>
              <p className="text-xs text-slate-500">{bookingDetails.parkingLotAddress}</p>
            </div>
          </div>

          {/* Spot & Floor Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1 mb-1">
                <Hash className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Spot</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{bookingDetails.spot}</p>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1 mb-1">
                <Hash className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Floor</span>
              </div>
              <p className="text-sm font-bold text-slate-900">Floor {bookingDetails.floor}</p>
            </div>
          </div>

          {/* Vehicle Number */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-1 mb-1">
              <Car className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Vehicle Number</span>
            </div>
            <p className="text-sm font-extrabold text-slate-900 tracking-widest font-mono uppercase">{bookingDetails.vehicleNumber}</p>
          </div>

          {/* Date, Duration, Start, End */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Date</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">{date}</p>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Duration</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                {bookingDetails.duration} {bookingDetails.duration === 1 ? 'hour' : 'hours'}
              </p>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Start Time</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900">{time}</p>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">End Time</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900">{endTime}</p>
            </div>
          </div>

          {/* Total Amount */}
          <div className="flex items-center justify-between p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 shadow-2xs">
            <div>
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-0.5">Total Amount</span>
              <span className="text-xs text-emerald-600 font-medium">Payment Verified</span>
            </div>
            <span className="text-2xl font-black text-emerald-700 tracking-tight">₹{bookingDetails.totalPrice}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 pb-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold rounded-xl transition-all text-xs tracking-wider shadow-2xs cursor-pointer"
          >
            Done
          </button>
          <button
            type="button"
            onClick={handleViewBookings}
            className="flex-1 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/25 text-xs tracking-wider cursor-pointer flex items-center justify-center gap-2"
          >
            View My Bookings
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BookingSuccess;