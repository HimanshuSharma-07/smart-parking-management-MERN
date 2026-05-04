import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, MapPin, Car, Search, Filter,
  CheckCircle, XCircle, AlertCircle, Download, CreditCard,
  ChevronRight, Hash, IndianRupee , Zap, ReceiptText,
  BadgeCheck, CircleDashed,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  fetchMyBookings,
  mapRawToMyBookingsCard,
  cancelBookingRequest,
  type MyBookingsCard,
  type BookingStatusUI,
} from '../services/bookings';
import { useAppSelector } from '../store/hooks';
import { getSocket } from '../services/socket';
import PaymentModal from '../components/PaymentModal';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { Skeleton } from './ui/Skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

type BookingStatus = BookingStatusUI;
type Booking = MyBookingsCard;

type TabFilter = 'All' | 'Active' | 'Upcoming' | 'Completed' | 'Cancelled';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const addHours = (iso: string, h: number) =>
  new Date(new Date(iso).getTime() + h * 3600_000).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: BookingStatus }> = ({ status }) => {
  const map: Record<BookingStatus, { label: string; cls: string; Icon: React.ElementType }> = {
    active: { label: 'Active', cls: 'bg-blue-100 text-blue-800', Icon: AlertCircle },
    upcoming: { label: 'Upcoming', cls: 'bg-orange-100 text-orange-800', Icon: Clock },
    completed: { label: 'Completed', cls: 'bg-green-100 text-green-800', Icon: CheckCircle },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700', Icon: XCircle },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
};

const PaymentBadge: React.FC<{ status: Booking['paymentStatus'] }> = ({ status }) => {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <BadgeCheck className="w-3 h-3" /> Paid
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
        <CircleDashed className="w-3 h-3" /> Pending
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" /> Failed
      </span>
    );
  }
  return null;
};

const SpotTypeBadge: React.FC<{ type: Booking['spotType'] }> = ({ type }) => {
  if (type === 'ev-charging') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
        <Zap className="w-3 h-3" /> EV Charging
      </span>
    );
  }
  const map: Record<string, string> = {
    compact: 'bg-purple-100 text-purple-700',
    regular: 'bg-gray-100 text-gray-600',
    large: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded capitalize ${map[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  );
};

// ─── Booking Card ─────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  onCancel: (id: string) => void;
  onPay: (booking: Booking) => void;
  onDownloadReceipt: (booking: Booking) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onCancel, onPay, onDownloadReceipt }) => {
  const [expanded, setExpanded] = useState(false);
  const canPayOnline =
    (booking.status === 'active' || booking.status === 'upcoming') &&
    booking.paymentStatus !== 'paid';

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all overflow-hidden">
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: lot icon + info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2 mb-0.5">
                <h3 className="font-bold text-gray-900 text-base">{booking.parkingLotName}</h3>
                <StatusBadge status={booking.status} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{booking.parkingLotAddress}</span>
              </div>
              <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Ref: <strong className="text-gray-700">{booking.bookingRef}</strong>
                </span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="flex items-center gap-1">
                  <Car className="w-3 h-3" /> {booking.vehicleNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Right: price + payment badge */}
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-gray-900">₹{booking.totalPrice}</div>
            <div className="mt-1">
              <PaymentBadge status={booking.paymentStatus} />
            </div>
          </div>
        </div>

        {/* Info strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">Spot</p>
            <p className="font-bold text-gray-900 text-sm">{booking.spot} · Floor {booking.floor}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">Date</p>
            <p className="font-bold text-gray-900 text-sm">{formatDate(booking.startTime)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">Time</p>
            <p className="font-bold text-gray-900 text-sm">
              {formatTime(booking.startTime)} → {addHours(booking.startTime, booking.duration)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">Duration</p>
            <p className="font-bold text-gray-900 text-sm">
              {booking.duration} hr{booking.duration > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <p className="text-xs text-gray-400 mb-0.5">Spot Type</p>
              <SpotTypeBadge type={booking.spotType} />
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <p className="text-xs text-gray-400 mb-0.5">Price/hr</p>
              <p className="font-bold text-gray-900 text-sm">
                ₹{(booking.totalPrice / booking.duration).toFixed(0)}/hr
              </p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-700 transition-colors"
          >
            {expanded ? 'Show less' : 'Show more'}
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>

          <div className="flex items-center gap-2">
            {(booking.paymentStatus === 'paid') && (
              <button
                onClick={() => onDownloadReceipt(booking)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Receipt
              </button>
            )}
            {(booking.status === 'active' || booking.status === 'upcoming') && (
              <button
                onClick={() => onCancel(booking.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
            {canPayOnline && (
              <button
                onClick={() => onPay(booking)}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pay Online
              </button>
            )}
            {booking.status === 'completed' && (
              <Link
                to="/parking-lots"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Book Again
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Cancel Confirm Dialog ────────────────────────────────────────────────────

const CancelDialog: React.FC<{ booking: Booking; onConfirm: () => void; onClose: () => void }> = ({
  booking, onConfirm, onClose,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
      <div className="bg-red-600 px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <XCircle className="w-6 h-6" />
          <h3 className="text-lg font-bold">Cancel Booking</h3>
        </div>
        <p className="text-red-100 text-sm mt-1">This action cannot be undone.</p>
      </div>
      <div className="p-6">
        <p className="text-gray-700 text-sm mb-4">
          Are you sure you want to cancel your booking at{' '}
          <strong>{booking.parkingLotName}</strong> (Spot {booking.spot}, Ref: {booking.bookingRef})?
        </p>
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800 mb-5">
          Refunds are processed within 3-5 business days as per cancellation policy.
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Keep Booking
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const MyBookings: React.FC = () => {
  const user = useAppSelector(s => s.auth.user);
  const initialized = useAppSelector(s => s.auth.initialized);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Booking | null>(null);

  const loadBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const raw = await fetchMyBookings();
      setBookings(raw.map(mapRawToMyBookingsCard));
    } catch {
      setListError('Could not load your bookings.');
      setBookings([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized) return;
    void loadBookings();
  }, [initialized, loadBookings]);

  // Real-time updates for bookings
  useEffect(() => {
    if (!initialized || !user) return;
    const socket = getSocket();
    if (!socket) return;

    const handleRefresh = () => {
      void loadBookings();
    };

    socket.on('booking:updated', handleRefresh);

    return () => {
      socket.off('booking:updated', handleRefresh);
    };
  }, [initialized, user, loadBookings]);

  const tabs: TabFilter[] = ['All', 'Active', 'Upcoming', 'Completed', 'Cancelled'];

  // Stats
  const stats = {
    total: bookings.length,
    active: bookings.filter(b => b.status === 'active').length,
    upcoming: bookings.filter(b => b.status === 'upcoming').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    spent: bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalPrice, 0),
  };

  // Filter
  const filtered = bookings.filter(b => {
    const matchTab =
      activeTab === 'All' ||
      b.status === activeTab.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      b.parkingLotName.toLowerCase().includes(q) ||
      b.vehicleNumber.toLowerCase().includes(q) ||
      b.bookingRef.toLowerCase().includes(q) ||
      b.spot.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const handleCancel = (id: string) => {
    const b = bookings.find(b => b.id === id);
    if (b) setCancelTarget(b);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    try {
      await cancelBookingRequest(id);
      setBookings(prev => prev.map(b => (b.id === id ? { ...b, status: 'cancelled' } : b)));
    } catch {
      setListError('Could not cancel this booking.');
    } finally {
      setCancelTarget(null);
    }
  };

  const tabCount = (t: TabFilter) =>
    t === 'All' ? bookings.length : bookings.filter(b => b.status === t.toLowerCase()).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My Bookings</h1>
          <p className="text-gray-500 text-sm">Track and manage all your parking reservations</p>
        </div>

        {!initialized && (
          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-11 rounded-lg w-full mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          </div>
        )}

        {initialized && !user && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Please sign in to view your bookings.
          </div>
        )}

        {initialized && user && (
          <>
            {listError && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {listError}
              </div>
            )}

            {listLoading && (
              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Skeleton className="flex-1 h-11 rounded-lg" />
                  <Skeleton className="w-24 h-11 rounded-lg" />
                </div>
                <Skeleton className="h-12 rounded-xl mb-6" />
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
                </div>
              </div>
            )}

            {!listLoading && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Bookings', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', Icon: ReceiptText },
                    { label: 'Active', value: stats.active, color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: Car },
                    { label: 'Upcoming', value: stats.upcoming, color: 'text-orange-600', bg: 'bg-orange-50', Icon: Calendar },
                    { label: 'Total Spent', value: `₹${stats.spent}`, color: 'text-gray-600', bg: 'bg-gray-50', Icon: IndianRupee  },
                  ].map(({ label, value, color, bg, Icon }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <div>
                        <div className={`text-2xl font-bold ${color}`}>{value}</div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by lot, vehicle, ref or spot…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-500 cursor-default">
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                  </div>
                </div>

                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
                  {tabs.map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 min-w-max flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {tab}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                        {tabCount(tab)}
                      </span>
                    </button>
                  ))}
                </div>

                {filtered.length > 0 ? (
                  <div className="space-y-4">
                    {filtered.map(b => (
                      <BookingCard 
                        key={b.id} 
                        booking={b} 
                        onCancel={handleCancel} 
                        onPay={(booking) => setPaymentTarget(booking)}
                        onDownloadReceipt={(booking) => {
                          generateInvoicePDF({
                            bookingRef: booking.bookingRef,
                            parkingLotName: booking.parkingLotName,
                            parkingLotAddress: booking.parkingLotAddress,
                            spot: booking.spot,
                            floor: booking.floor,
                            vehicleNumber: booking.vehicleNumber,
                            startTime: booking.startTime,
                            endTime: booking.endTime,
                            duration: booking.duration,
                            totalPrice: booking.totalPrice,
                            paymentStatus: booking.paymentStatus,
                            paymentMethod: booking.paymentMethod,
                          });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ReceiptText className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No bookings found</h3>
                    <p className="text-sm text-gray-500 mb-6">
                      {searchQuery ? 'Try a different search term.' : "You don't have any bookings here yet."}
                    </p>
                    <Link
                      to="/parking-lots"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      Browse Parking Lots
                    </Link>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelDialog
          booking={cancelTarget}
          onConfirm={confirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {/* Payment Modal */}
      {paymentTarget && (
        <PaymentModal
          bookingId={paymentTarget.id}
          amount={paymentTarget.totalPrice}
          onSuccess={() => {
            setPaymentTarget(null);
            void loadBookings();
          }}
          onClose={() => setPaymentTarget(null)}
        />
      )}
    </div>
  );
};

export default MyBookings;
