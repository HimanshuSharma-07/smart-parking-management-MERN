import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Car, Zap, ChevronRight, AlertCircle, CheckCircle, MapPin, Plus, Layers, Trash2, Loader2, RotateCcw } from 'lucide-react';
import axios from 'axios';
import api from '../services/api';
import type { BackendParkingSlot } from '../services/parking';
import { fetchSlotsForLot } from '../services/parking';
import { useAppSelector } from '../store/hooks';
import { verifyRazorpayPayment } from '../services/payment';
import CreateSlotsModal from '../admin/components/CreateSlotsModal';
import CreateSingleSlotModal from '../admin/components/CreateSingleSlotModal';
import ConfirmDialog from './ConfirmDialog';
import { getSocket, joinLotRoom, leaveLotRoom } from '../services/socket';
import { Skeleton } from './ui/Skeleton';

interface ParkingSpot {
  id: string;
  label: string;
  status: 'available' | 'occupied' | 'ev-charging';
  type?: 'compact' | 'regular' | 'large';
  pricePerHour?: number;
}

interface FloorData {
  floor: number;
  rows: {
    [key: string]: ParkingSpot[];
  };
}

interface ParkingSlotProps {
  isOpen: boolean;
  onClose: () => void;
  lotId: string;
  parkingLotName: string;
  parkingLotAddress: string;
  onConfirmBooking?: (booking: BookingData) => void;
}

export interface BookingData {
  spot: string;
  floor: number;
  vehicleNumber: string;
  startTime: string;
  duration: number;
  totalPrice: number;
}

interface FormErrors {
  spot?: string;
  vehicleNumber?: string;
  startTime?: string;
  duration?: string;
}

function rowKeyFromSlotNumber(slotNumber: string): string {
  const last = slotNumber.split('-').pop() || slotNumber;
  const letters = last.replace(/\d+$/, '');
  return letters || 'A';
}

function toUiSpot(s: BackendParkingSlot): ParkingSpot {
  const isUnavailable =
    s.status === 'occupied' || s.status === 'reserved' || s.status === 'maintenance';
  if (isUnavailable) {
    return {
      id: s._id,
      label: s.slotNumber,
      status: 'occupied',
      type: s.type === 'large' ? 'large' : s.type === 'disabled' ? 'compact' : 'regular',
      pricePerHour: s.pricePerHour,
    };
  }
  if (s.type === 'ev') {
    return {
      id: s._id,
      label: s.slotNumber,
      status: 'ev-charging',
      type: 'regular',
      pricePerHour: s.pricePerHour,
    };
  }
  return {
    id: s._id,
    label: s.slotNumber,
    status: 'available',
    type: s.type === 'large' ? 'large' : s.type === 'disabled' ? 'compact' : 'regular',
    pricePerHour: s.pricePerHour,
  };
}

function buildFloorsFromSlots(slots: BackendParkingSlot[]): FloorData[] {
  const byFloor = new Map<number, BackendParkingSlot[]>();
  for (const s of slots) {
    const f = Number(s.floor);
    if (!byFloor.has(f)) byFloor.set(f, []);
    byFloor.get(f)!.push(s);
  }
  const floorNums = [...byFloor.keys()].sort((a, b) => a - b);
  return floorNums.map(floorNum => {
    const floorSlots = byFloor.get(floorNum)!;
    const byRow = new Map<string, BackendParkingSlot[]>();
    for (const s of floorSlots) {
      const row = rowKeyFromSlotNumber(s.slotNumber);
      if (!byRow.has(row)) byRow.set(row, []);
      byRow.get(row)!.push(s);
    }
    const rows: FloorData['rows'] = {};
    for (const rowName of [...byRow.keys()].sort()) {
      const rowSlots = byRow.get(rowName)!;
      rowSlots.sort((a, b) =>
        a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true })
      );
      rows[rowName] = rowSlots.map(toUiSpot);
    }
    return { floor: floorNum, rows };
  });
}

function bookingErrMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as { message?: string } | undefined;
    return d?.message ?? err.message ?? 'Booking failed';
  }
  return 'Booking failed. Please try again.';
}

const ParkingSlot: React.FC<ParkingSlotProps> = ({
  isOpen,
  onClose,
  lotId,
  parkingLotName,
  parkingLotAddress,
  onConfirmBooking,
}) => {
  const [floorsData, setFloorsData] = useState<FloorData[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(2);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2>(1); // 1: Selection, 2: Details

  // Admin states
  const user = useAppSelector(s => s.auth.user);

  /**
   * Formats Indian vehicle numbers dynamically as the user types (e.g., PB 12 AA 1212)
   */
  const formatVehicleNumber = (val: string): string => {
    const clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let formatted = '';
    if (clean.length > 0) formatted += clean.substring(0, 2);
    if (clean.length > 2) formatted += ' ' + clean.substring(2, 4);
    if (clean.length > 4) {
      const rest = clean.substring(4);
      const seriesMatch = rest.match(/^[A-Z]{1,2}/);
      if (seriesMatch) {
        formatted += ' ' + seriesMatch[0];
        const numbers = rest.substring(seriesMatch[0].length);
        if (numbers) formatted += ' ' + numbers.substring(0, 4);
      } else {
        const numbersMatch = rest.match(/^[0-9]{1,4}/);
        if (numbersMatch) formatted += ' ' + numbersMatch[0];
      }
    }
    return formatted;
  };

  /**
   * Extracts the numeric portion of an Indian vehicle registration string.
   * Example: "PB 23 AA 1212" → "1212"
   */
  const parseVehicleNumber = (v: string): string => {
    const match = v.match(/(\d{1,4})$/);
    return match ? match[1] : '';
  };

  // Auto‑detect and select a spot based on vehicle number when user finishes typing.
  const handleVehicleNumberBlur = () => {
    if (!vehicleNumber || bookingStep !== 2) return;
    
    const numeric = parseVehicleNumber(vehicleNumber);
    if (!numeric) return;
    
    // Normalise spot labels (remove non‑alphanumeric characters and uppercase).
    const normalizeLabel = (label: string) => label.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    // Use the last two digits of the vehicle number for matching (common in Indian plates).
    const matchDigits = numeric.slice(-2);
    
    // Search for a matching available spot.
    for (const floor of floorsData) {
      for (const rowName of Object.keys(floor.rows)) {
        const spot = floor.rows[rowName].find(s => {
          const norm = normalizeLabel(s.label);
          return norm.endsWith(matchDigits) && s.status === 'available';
        });
        if (spot && spot.id !== selectedSpot?.id) {
          setSelectedSpot(spot);
          setSelectedFloor(floor.floor);
          return;
        }
      }
    }
  };
  const [isAddSlotsModalOpen, setIsAddSlotsModalOpen] = useState(false);
  const [isSingleSlotModalOpen, setIsSingleSlotModalOpen] = useState(false);
  
  const [adminEditType, setAdminEditType] = useState('standard');
  const [adminEditStatus, setAdminEditStatus] = useState('available');
  const [adminEditPrice, setAdminEditPrice] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState('');

  const cancelBookingProcess = () => {
    setShowConfirmDialog(false);
    setSubmitting(false);
    setBookingError(null);
  };
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteLotConfirm, setShowDeleteLotConfirm] = useState(false);
  const [showDeleteFloorConfirm, setShowDeleteFloorConfirm] = useState(false);

  const loadSlots = useCallback(async (cancelled?: { value: boolean }) => {
    try {
      const slots = await fetchSlotsForLot(lotId);
      if (cancelled?.value) return;
      const floors = buildFloorsFromSlots(slots);
      setFloorsData(floors);
      // Ensure we stay on a valid floor or default to first
      setSelectedFloor(prev => floors.some(f => f.floor === prev) ? prev : floors[0]?.floor || 1);
    } catch {
      if (!cancelled?.value) {
        setSlotsError('Could not load slots for this lot.');
        setFloorsData([]);
      }
    } finally {
      if (!cancelled?.value) setSlotsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    if (!isOpen || !lotId) return;

    setSlotsLoading(true);
    setSlotsError(null);
    setBookingError(null);
    setSelectedSpot(null);
    setVehicleNumber('');
    setDuration(2);
    setErrors({});
    setShowConfirmDialog(false);
    setBookingStep(1);

    const cancelledObj = { value: false };
    void loadSlots(cancelledObj);

    return () => {
      cancelledObj.value = true;
    };
  }, [isOpen, lotId, loadSlots]);

  // ── Real-time: join/leave the lot room and react to live slot events ──────
  useEffect(() => {
    if (!isOpen || !lotId) return;

    const socket = getSocket();
    if (!socket) return;

    joinLotRoom(lotId);

    const refresh = () => void loadSlots();

    socket.on('slot:statusUpdate', refresh);
    socket.on('slot:created', refresh);
    socket.on('slot:deleted', refresh);
    socket.on('slot:updated', refresh);

    return () => {
      socket.off('slot:statusUpdate', refresh);
      socket.off('slot:created', refresh);
      socket.off('slot:deleted', refresh);
      socket.off('slot:updated', refresh);
      leaveLotRoom(lotId);
    };
  }, [isOpen, lotId, loadSlots]);

  const currentFloorData = floorsData.find(f => f.floor === selectedFloor);

  const getSpotColor = (spot: ParkingSpot): string => {
    if (spot.id === selectedSpot?.id) return 'bg-green-600 text-white border-green-700 shadow-lg';

    switch (spot.status) {
      case 'available':
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:border-green-300 hover:shadow-sm cursor-pointer';
      case 'occupied':
        return user?.role === 'admin' 
          ? 'bg-red-50 text-red-700 border-red-200 cursor-pointer hover:border-red-400 opacity-90' 
          : 'bg-red-50 text-red-700 border-red-200 cursor-not-allowed opacity-70';
      case 'ev-charging':
        return 'bg-green-50 text-green-700 border-green-300 hover:border-green-400 cursor-pointer';
      default:
        // Reserved, maintenance etc
        return user?.role === 'admin'
          ? 'bg-orange-50 text-orange-700 border-orange-200 cursor-pointer hover:border-orange-400'
          : 'bg-orange-50 text-orange-700 border-orange-200 cursor-not-allowed opacity-70';
    }
  };

  const handleSpotClick = (spot: ParkingSpot) => {
    if (spot.status === 'occupied' && user?.role !== 'admin') return;
    
    if (spot.id === selectedSpot?.id) {
      setSelectedSpot(null);
    } else {
      setSelectedSpot(spot);
      if (user?.role === 'admin') {
        const fullSlotInfo = floorsData.flatMap(f => Object.values(f.rows).flat()).find(s => s.id === spot.id);
        setAdminEditType(fullSlotInfo?.type || 'regular');
        setAdminEditStatus(spot.status);
        setAdminEditPrice(spot.pricePerHour?.toString() || '');
        setAdminError('');
      }
    }
    if (errors.spot) setErrors(prev => ({ ...prev, spot: undefined }));
  };

  const getStats = () => {
    const allSpots = Object.values(currentFloorData?.rows || {}).flat();
    return {
      available: allSpots.filter(s => s.status === 'available' || s.status === 'ev-charging').length,
      occupied: allSpots.filter(s => s.status === 'occupied').length,
    };
  };

  const stats = getStats();

  const calculateTotalPrice = () => {
    if (!selectedSpot || !duration) return 0;
    return (selectedSpot.pricePerHour || 0) * duration;
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedSpot) {
      newErrors.spot = 'Please select a parking spot from the map above.';
    }
    if (!vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required.';
    }
    if (!startTime) {
      newErrors.startTime = 'Start time is required.';
    }
    if (!duration || duration < 1) {
      newErrors.duration = 'Duration must be at least 1 hour.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirmBooking = () => {
    if (!validate()) return;
    setBookingError(null);
    setShowConfirmDialog(true);
  };

  const handleFinalConfirm = async () => {
    if (!selectedSpot) return;
    setSubmitting(true);
    setBookingError(null);
    try {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + duration * 3_600_000);
      
      const response = await api.post(`/bookings/parking-slots/${selectedSpot.id}/booking`, {
        vehicleNumber,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });

      const { booking, razorpayOrder, key } = response.data.data;

      // Razorpay Checkout
      const options = {
        key: key || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Parkify',
        description: `Booking for ${selectedSpot.label}`,
        order_id: razorpayOrder.id,
        handler: async (paymentResponse: any) => {
          try {
            await verifyRazorpayPayment({
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
              bookingId: booking._id
            });

            const bookingData: BookingData = {
              spot: selectedSpot.label,
              floor: selectedFloor,
              vehicleNumber,
              startTime: start.toISOString(),
              duration,
              totalPrice: calculateTotalPrice(),
            };

            onConfirmBooking?.(bookingData);
            setShowConfirmDialog(false);
            onClose();
          } catch (err: any) {
            setBookingError(err.response?.data?.message || 'Payment verification failed');
            setSubmitting(false);
          }
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.email || '',
        },
        theme: {
          color: '#111827',
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (e) {
      setBookingError(bookingErrMessage(e));
      setShowConfirmDialog(false);
    } finally {
      // Don't set submitting to false here if Razorpay is open
      // setSubmitting(false);
    }
  };

  const calculateAdminStatusUpdate = (currentStatus: string) => {
    // Map our UI statuses to backend statuses
    if (currentStatus === 'ev-charging') return 'available';
    return currentStatus;
  }

  const handleAdminUpdateSlot = async () => {
    if (!selectedSpot) return;
    setAdminSaving(true);
    setAdminError('');
    try {
      const backendStatus = calculateAdminStatusUpdate(adminEditStatus);
      const originalBackendStatus = calculateAdminStatusUpdate(selectedSpot.status);

      // Separate calls for status and details
      if (backendStatus !== originalBackendStatus) {
        await api.patch(`/parking-slots/slots/${selectedSpot.id}/status`, { status: backendStatus });
      }

      const payload: any = { type: adminEditType };
      if (adminEditPrice) payload.pricePerHour = Number(adminEditPrice);

      await api.patch(`/parking-slots/slots/${selectedSpot.id}`, payload);
      
      void loadSlots();
      setSelectedSpot(null);
    } catch (e) {
      setAdminError(bookingErrMessage(e));
    } finally {
      setAdminSaving(false);
    }
  };

  const handleDeleteLot = async () => {
    setAdminSaving(true);
    setAdminError('');
    try {
      await api.delete(`/parking-lots/delete-parking-lot/${lotId}`);
      onClose();
    } catch (e) {
      setAdminError('Failed to delete lot. Ensure no active bookings or try again.');
    } finally {
      setAdminSaving(false);
    }
  };

  const handleDeleteFloor = async () => {
    setAdminSaving(true);
    setAdminError('');
    try {
      await api.delete(`/parking-slots/${lotId}/floors/${selectedFloor}`);
      void loadSlots();
    } catch (e: any) {
      setAdminError(e.response?.data?.message || 'Failed to delete floor. Ensure no active bookings exist.');
    } finally {
      setAdminSaving(false);
      setShowDeleteFloorConfirm(false);
    }
  };

  const executeAdminDeleteSlot = async () => {
    if (!selectedSpot) return;
    setAdminSaving(true);
    try {
      await api.delete(`/parking-slots/slots/${selectedSpot.id}`);
      void loadSlots();
      setSelectedSpot(null);
    } catch (e) {
      setAdminError(bookingErrMessage(e));
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminDeleteSlot = () => {
    if (!selectedSpot) return;
    setShowDeleteConfirm(true);
  };

  const formatDateTime = (dt: string) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (!isOpen) return null;

  const modal = (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-1000 p-4">
        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl">
          <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 pt-7 pb-8 text-white relative shrink-0 rounded-t-2xl">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight">
                  {bookingStep === 1 ? 'Step 1: Select Spot' : 'Step 2: Booking Details'} — {parkingLotName}
                </h2>
                {user?.role === 'admin' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSingleSlotModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-white/10 text-white border border-white/20 px-3 py-1.5 rounded text-xs font-semibold hover:bg-white/20 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Single Slot
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddSlotsModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-emerald-600 border border-emerald-400/50 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Bulk Add Slots
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteLotConfirm(true)}
                      className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-200 border border-red-500/30 px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-500/30 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Lot
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1.5 font-medium">{parkingLotAddress}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {bookingError && (
              <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{bookingError}</span>
              </div>
            )}

            {slotsLoading && (
              <div className="py-6">
                <div className="mb-8">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-24 rounded-xl" />
                    <Skeleton className="h-10 w-24 rounded-xl" />
                    <Skeleton className="h-10 w-24 rounded-xl" />
                  </div>
                </div>
                <Skeleton className="w-full h-32 rounded-2xl mb-8" />
                <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8 mb-6 shadow-sm overflow-hidden">
                  <div className="flex justify-center mb-10">
                    <Skeleton className="h-8 w-32 rounded-full" />
                  </div>
                  <div className="space-y-5">
                    {[1, 2, 3].map(row => (
                      <div key={row}>
                        <div className="flex items-center gap-3 mb-2">
                          <Skeleton className="h-4 w-12" />
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
                          {[...Array(10)].map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-lg" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!slotsLoading && slotsError && (
              <div className="py-12 text-center text-red-600">{slotsError}</div>
            )}

            {!slotsLoading && !slotsError && floorsData.length === 0 && (
              <div className="py-12 text-center text-gray-600">
                No slots configured for this parking lot yet.
              </div>
            )}

            {!slotsLoading && !slotsError && floorsData.length > 0 && (
              <>
                {bookingStep === 1 ? (
                  <>
                    <div className="mb-8">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Select floor
                      </label>
                      <div className="flex gap-3 flex-wrap items-center">
                        {floorsData.map(floor => (
                          <button
                            key={floor.floor}
                            type="button"
                            onClick={() => {
                              setSelectedFloor(floor.floor);
                              setSelectedSpot(null);
                            }}
                            className={`px-6 py-2.5 rounded-xl font-bold transition-all uppercase text-[10px] tracking-widest ${
                              selectedFloor === floor.floor
                                ? 'bg-gray-900 text-white shadow-lg'
                                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Floor {floor.floor}
                          </button>
                        ))}
                        {user?.role === 'admin' && floorsData.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowDeleteFloorConfirm(true)}
                            className="ml-2 p-2.5 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all shadow-sm group"
                            title={`Delete Floor ${selectedFloor}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-200">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Color key</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                            <Car className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">Available</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{stats.available} spots</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Car className="w-5 h-5 text-red-500" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">Occupied</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{stats.occupied} spots</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-600 border border-green-700 rounded-xl flex items-center justify-center shadow-lg">
                            <Car className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">Selected</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Your choice</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Zap className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">EV</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Charging</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {errors.spot && (
                      <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-bold">{errors.spot}</span>
                      </div>
                    )}

                  <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8 mb-6 shadow-sm overflow-hidden relative">
                    <div className="flex justify-center mb-10">
                      <div className="px-6 py-2 bg-emerald-600 text-white font-black rounded-full text-[10px] tracking-widest flex items-center gap-3 shadow-lg shadow-emerald-200">
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        ENTRANCE
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                      <div className="space-y-5">
                        {currentFloorData &&
                          Object.entries(currentFloorData.rows).map(([rowName, spots]) => (
                            <div key={rowName}>
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-bold text-gray-700 min-w-12">Row {rowName}</span>
                                <div className="flex-1 h-px bg-gray-200" />
                              </div>
                              <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
                                {spots.map(spot => (
                                  <button
                                    key={spot.id}
                                    type="button"
                                    onClick={() => handleSpotClick(spot)}
                                    disabled={spot.status === 'occupied' && user?.role !== 'admin'}
                                    className={`relative aspect-square rounded-lg border-2 font-bold text-xs transition-all flex items-center justify-center ${getSpotColor(
                                      spot
                                    )}`}
                                  >
                                    {spot.status === 'ev-charging' && (
                                      <Zap className="w-3 h-3 absolute top-0.5 right-0.5" />
                                    )}
                                    <span className="truncate px-0.5">{spot.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>

                      <div className="flex justify-center mt-10">
                        <div className="px-6 py-2 bg-red-600 text-white font-black rounded-full text-[10px] tracking-widest flex items-center gap-3 shadow-lg shadow-red-200">
                          <ChevronRight className="w-4 h-4 rotate-180" />
                          EXIT
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {selectedSpot && user?.role === 'admin' && (
                      <div className="p-6 bg-white border border-gray-200 rounded-2xl mb-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">Manage Slot — {selectedSpot.label}</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-widest">Floor {selectedFloor}</span>
                          </div>
                          <button type="button" onClick={() => setSelectedSpot(null)} className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Cancel Edit</button>
                        </div>

                        {adminError && (
                          <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-bold">{adminError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Slot Status</label>
                            <select 
                              value={adminEditStatus} 
                              onChange={e => setAdminEditStatus(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-all text-sm font-bold cursor-pointer"
                            >
                              <option value="available">Available / Normal</option>
                              <option value="ev-charging">Available / EV Charging</option>
                              <option value="occupied">Occupied</option>
                              <option value="maintenance">Maintenance</option>
                              <option value="reserved">Reserved</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Slot Type</label>
                            <select 
                              value={adminEditType} 
                              onChange={e => setAdminEditType(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-all text-sm font-bold cursor-pointer"
                            >
                              <option value="standard">Standard</option>
                              <option value="ev">EV Charging</option>
                              <option value="large">Large Vehicle</option>
                              <option value="disabled">Disabled Parking</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Price per Hour (₹)</label>
                            <input 
                              type="number" 
                              min="0"
                              value={adminEditPrice}
                              onChange={e => setAdminEditPrice(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-all text-sm font-bold"
                              placeholder="e.g. 50"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 -mx-6 -mb-6 p-6 mt-8 rounded-b-2xl border-t border-gray-200">
                          <button 
                            onClick={() => void handleAdminDeleteSlot()} 
                            disabled={adminSaving}
                            className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-600 bg-white hover:bg-red-50 border border-red-100 rounded-xl transition-all disabled:opacity-50 shadow-sm"
                          >
                            Delete Slot
                          </button>
                          <button 
                            onClick={() => void handleAdminUpdateSlot()} 
                            disabled={adminSaving}
                            className="px-8 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl transition-all disabled:opacity-50"
                          >
                            {adminSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  selectedSpot && (
                    <>
                      <div className="mb-6 p-6 bg-green-50/60 border border-green-100 border-l-[5px] border-l-green-600 rounded-2xl">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-[11px] font-black text-green-600 uppercase tracking-[0.25em]">Selected Spot</h3>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSpot(null);
                              setBookingStep(1);
                            }}
                            className="text-[11px] text-green-600 font-bold hover:underline uppercase tracking-[0.15em]"
                          >
                            Change Spot
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block mb-1">Spot</span>
                            <div className="font-bold text-gray-900 text-2xl">{selectedSpot.label}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block mb-1">Type</span>
                            <div className="font-bold text-green-600 capitalize text-2xl">{selectedSpot.type ?? 'Regular'}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block mb-1">Floor</span>
                            <div className="font-bold text-gray-900 text-2xl">{selectedFloor}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block mb-1">Rate</span>
                            <div className="font-bold text-gray-900 text-2xl">₹{selectedSpot.pricePerHour}<span className="text-sm text-gray-400 font-medium">/hr</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 md:p-8 bg-white border border-dashed border-gray-300 rounded-2xl mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-8 flex items-center gap-3">
                          <div className="p-2.5 bg-gray-100 rounded-xl"><Car className="w-5 h-5 text-gray-700" /></div>
                          Booking details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
                              Vehicle number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={vehicleNumber}
                              onBlur={handleVehicleNumberBlur}
                              onChange={e => {
                                setVehicleNumber(formatVehicleNumber(e.target.value));
                                if (errors.vehicleNumber) setErrors(prev => ({ ...prev, vehicleNumber: undefined }));
                              }}
                              placeholder="e.g. MH-01-AB-1234"
                              className={`w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all text-base font-semibold text-gray-700 placeholder:text-gray-400 placeholder:font-normal ${
                                errors.vehicleNumber ? 'border-red-400 bg-red-50' : ''
                              }`}
                            />
                            {errors.vehicleNumber && (
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-bold">
                                <AlertCircle className="w-4 h-4" />
                                {errors.vehicleNumber}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
                              Start time <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="datetime-local"
                              value={startTime}
                              onChange={e => {
                                setStartTime(e.target.value);
                                if (errors.startTime) setErrors(prev => ({ ...prev, startTime: undefined }));
                              }}
                              className={`w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all text-base font-semibold text-gray-700 ${
                                errors.startTime ? 'border-red-400 bg-red-50' : ''
                              }`}
                            />
                            {errors.startTime && (
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-bold">
                                <AlertCircle className="w-4 h-4" />
                                {errors.startTime}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
                              Duration (hours) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={duration}
                              onChange={e => {
                                setDuration(parseInt(e.target.value, 10) || 1);
                                if (errors.duration) setErrors(prev => ({ ...prev, duration: undefined }));
                              }}
                              min={1}
                              max={24}
                              className={`w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all text-base font-semibold text-gray-700 ${
                                errors.duration ? 'border-red-400 bg-red-50' : ''
                              }`}
                            />
                            {errors.duration && (
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-bold">
                                <AlertCircle className="w-4 h-4" />
                                {errors.duration}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col justify-end">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 text-right">Estimated Price</label>
                            <div className="px-6 py-4 bg-gray-900 text-white rounded-2xl flex items-center justify-between shadow-xl shadow-gray-900/10">
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Payable:</span>
                              <span className="text-3xl font-black">₹{calculateTotalPrice()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                )}
              </>
            )}
          </div>

            <div className="flex flex-col md:flex-row items-center justify-end gap-4 p-6 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
              {bookingStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full md:w-auto px-8 py-3 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all uppercase text-[10px] tracking-widest shadow-sm"
                  >
                    Cancel
                  </button>
                  {user?.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => setBookingStep(2)}
                      disabled={!selectedSpot || slotsLoading || !!slotsError || floorsData.length === 0}
                      className="w-full md:w-auto px-10 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl uppercase text-[10px] tracking-widest"
                    >
                      Proceed to details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="w-full md:w-auto px-8 py-3 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all uppercase text-[10px] tracking-widest shadow-sm"
                  >
                    Back to selection
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    className="w-full md:w-auto px-10 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all active:scale-95 shadow-xl shadow-green-100 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest"
                  >
                    Confirm booking
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
        </div>
      </div>

      {showConfirmDialog && selectedSpot && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-1100 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl shadow-slate-900/30 border border-slate-100 overflow-hidden">

            {/* Dark Header */}
            <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 pt-7 pb-8 text-white relative text-center shrink-0">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                title="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/30 text-emerald-400 ring-4 ring-emerald-500/10">
                  <CheckCircle className="w-9 h-9" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Confirm your booking</h2>
                <p className="text-slate-400 text-xs mt-1 font-medium">Please review before confirming.</p>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {bookingError && (
                <div className="p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-3 text-xs text-red-800 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-red-900 mb-0.5">Payment / Booking Notice</p>
                    <p className="text-slate-600 leading-relaxed">{bookingError}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-sm">
                <div className="p-2.5 bg-green-50 text-green-600 rounded-xl border border-green-100/60 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Parking Location</p>
                  <p className="text-sm font-bold text-slate-900 tracking-tight">{parkingLotName}</p>
                  <p className="text-xs text-slate-500">{parkingLotAddress}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Spot &amp; Floor</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    {selectedSpot.label} • Floor {selectedFloor}
                  </p>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Vehicle</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide uppercase">{vehicleNumber}</p>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Start</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">{formatDateTime(startTime)}</p>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Duration</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    {duration} hr{duration > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80">
                <div>
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-0.5">Total Amount</span>
                  <span className="text-xs text-emerald-600 font-medium">Includes all taxes</span>
                </div>
                <span className="text-2xl font-black text-emerald-700 tracking-tight">₹{calculateTotalPrice()}</span>
              </div>
            </div>

            {/* Pinned footer */}
            <div className="px-6 pb-6 pt-2 space-y-2.5 shrink-0">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelBookingProcess}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold rounded-xl transition-all text-xs tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={() => void handleFinalConfirm()}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/25 text-xs tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Booking…</span>
                    </>
                  ) : bookingError ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Retry Payment</span>
                    </>
                  ) : (
                    'Yes, book now'
                  )}
                </button>
              </div>

              {submitting && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={cancelBookingProcess}
                    className="text-[11px] text-slate-400 hover:text-red-600 underline font-medium cursor-pointer transition-colors"
                  >
                    Stuck or payment cancelled? Click here to cancel process
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <CreateSlotsModal
          isOpen={isAddSlotsModalOpen}
          onClose={() => setIsAddSlotsModalOpen(false)}
          onSuccess={() => void loadSlots()}
          lotId={lotId}
          lotName={parkingLotName}
        />
      )}
      {user?.role === 'admin' && (
        <CreateSingleSlotModal
          isOpen={isSingleSlotModalOpen}
          onClose={() => setIsSingleSlotModalOpen(false)}
          onSuccess={() => void loadSlots()}
          lotId={lotId}
          lotName={parkingLotName}
        />
      )}
      
      {user?.role === 'admin' && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => void executeAdminDeleteSlot()}
          title="Delete Parking Slot"
          message={`Are you sure you want to permanently delete slot ${selectedSpot?.label}?`}
          confirmLabel="Delete"
          isDestructive={true}
        />
      )}

      {user?.role === 'admin' && (
        <ConfirmDialog
          isOpen={showDeleteLotConfirm}
          onClose={() => setShowDeleteLotConfirm(false)}
          onConfirm={() => void handleDeleteLot()}
          title="Delete Parking Lot"
          message={`Are you sure you want to delete ${parkingLotName}? This will permanently remove all associated slots and data. This action is irreversible.`}
          confirmLabel={adminSaving ? 'Deleting...' : 'Delete Lot'}
          isDestructive={true}
        />
      )}

      {user?.role === 'admin' && (
        <ConfirmDialog
          isOpen={showDeleteFloorConfirm}
          onClose={() => setShowDeleteFloorConfirm(false)}
          onConfirm={() => void handleDeleteFloor()}
          title={`Delete Floor ${selectedFloor}`}
          message={`Are you sure you want to delete all slots on Floor ${selectedFloor}? This will fail if there are active or reserved bookings.`}
          confirmLabel={adminSaving ? 'Deleting Floor...' : 'Delete Floor'}
          isDestructive={true}
        />
      )}
    </>
  );

  return createPortal(modal, document.body);
};

export default ParkingSlot;
