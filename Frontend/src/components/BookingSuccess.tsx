import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, X, MapPin, Car, Calendar, Clock, Hash, IndianRupee } from 'lucide-react';

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

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-1000 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">

        {/* ── Dark Header (matches confirmation dialog style) ── */}
        <div className="bg-gray-900 px-6 pt-6 pb-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 ring-4 ring-green-500/30">
              <CheckCircle className="w-9 h-9 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Booking Confirmed!</h2>
            <p className="text-gray-400 text-sm">Your parking spot has been successfully reserved</p>
          </div>
        </div>

        {/* ── Booking Details ── */}
        <div className="px-6 py-5 space-y-3">

          {/* Parking Lot */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Parking Lot</p>
              <p className="font-bold text-gray-900 text-sm">{bookingDetails.parkingLotName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{bookingDetails.parkingLotAddress}</p>
            </div>
          </div>

          {/* Spot + Floor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">Spot</span>
              </div>
              <p className="text-base font-bold text-gray-900">{bookingDetails.spot}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">Floor</span>
              </div>
              <p className="text-base font-bold text-gray-900">Floor {bookingDetails.floor}</p>
            </div>
          </div>

          {/* Vehicle */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Car className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Vehicle Number</span>
            </div>
            <p className="text-base font-bold text-gray-900">{bookingDetails.vehicleNumber}</p>
          </div>

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">Date</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{date}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">Duration</span>
              </div>
              <p className="text-sm font-bold text-gray-900">
                {bookingDetails.duration} {bookingDetails.duration === 1 ? 'hour' : 'hours'}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">Start Time</p>
              <p className="text-sm font-bold text-gray-900">{time}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">End Time</p>
              <p className="text-sm font-bold text-gray-900">{endTime}</p>
            </div>
          </div>

          {/* Total Amount */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-gray-700">Total Amount</span>
            </div>
            <span className="text-2xl font-bold text-green-700">₹{bookingDetails.totalPrice}</span>
          </div>
        </div>

        {/* ── Footer Buttons ── */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Done
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-md"
          >
            View My Bookings
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.93); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.25s ease-out; }
      `}</style>
    </div>,
    document.body
  );
};

export default BookingSuccess;