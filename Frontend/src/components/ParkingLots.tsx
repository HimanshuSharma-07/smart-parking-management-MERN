import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { MapPin, Search, Plus, Edit2, Image as ImageIcon, Trash2, Layers, MoreVertical } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';

import BookingSuccess from './BookingSuccess';
import ParkingSlot from './ParkingSlots';
import CreateLotModal from '../admin/components/CreateLotModal';
import EditLotModal from '../admin/components/EditLotModal';
import EditLotImageModal from '../admin/components/EditLotImageModal';
import CreateSlotsModal from '../admin/components/CreateSlotsModal';
import ConfirmDialog from './ConfirmDialog';
import { Skeleton } from './ui/Skeleton';

import type { BackendParkingLot, BackendParkingSlot } from '../services/parking';
import { fetchAllParkingLots, fetchSlotsForLot } from '../services/parking';
import { useAppSelector } from '../store/hooks';
import api from '../services/api';
import { getSocket } from '../services/socket';

interface ParkingLotCard {
  id: string;
  name: string;
  image: string;
  priceLabel: string;
  address: string;
  availableSpots: number;
  totalSlots: number;
  raw: BackendParkingLot;
}

function buildLotCard(
  lot: BackendParkingLot,
  slots: BackendParkingSlot[]
): ParkingLotCard {
  const availableSpots = slots.filter(s => s.status === 'available').length;
  const rates = slots.map(s => s.pricePerHour).filter(n => n > 0);
  const minRate = rates.length ? Math.min(...rates) : null;
  const priceLabel = minRate != null ? `₹${minRate}/hr` : '—';

  return {
    id: lot._id,
    name: lot.lotName,
    image: lot.parkingLotImg,
    priceLabel,
    address: lot.address,
    availableSpots,
    totalSlots: lot.totalSlots,
    raw: lot
  };
}

const ParkingLots: React.FC = () => {
  const user = useAppSelector(s => s.auth.user);
  const initialized = useAppSelector(s => s.auth.initialized);
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const authLoading = !initialized;
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [parkingLots, setParkingLots] = useState<ParkingLotCard[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<BackendParkingLot | null>(null);

  const [bookingUi, setBookingUi] = useState<{
    open: boolean;
    lot: ParkingLotCard | null;
  }>({ open: false, lot: null });
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<{
    parkingLotName: string;
    parkingLotAddress: string;
    spot: string;
    floor: number;
    vehicleNumber: string;
    startTime: string;
    duration: number;
    totalPrice: number;
  } | null>(null);

  const loadLots = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setLoadError(null);
    try {
      const lots = await fetchAllParkingLots();
      const cards = await Promise.all(
        lots.map(async lot => {
          try {
            const slots = await fetchSlotsForLot(lot._id);
            return buildLotCard(lot, slots);
          } catch {
            return buildLotCard(lot, []);
          }
        })
      );
      setParkingLots(cards);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { status?: number } })?.response?.status === 401
          ? 'Please sign in to browse parking lots.'
          : 'Could not load parking lots. Try again later.';
      setLoadError(msg);
      setParkingLots([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      setLoadError('Please sign in to browse parking lots.');
      setParkingLots([]);
      return;
    }
    void loadLots();
  }, [authLoading, isAuthenticated, loadLots]);

  // Real-time updates for lots and slot counts
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const handleRefresh = () => {
      void loadLots();
    };

    socket.on('lot:created', handleRefresh);
    socket.on('lot:updated', handleRefresh);
    socket.on('lot:deleted', handleRefresh);
    socket.on('slot:statusUpdate', handleRefresh);

    return () => {
      socket.off('lot:created', handleRefresh);
      socket.off('lot:updated', handleRefresh);
      socket.off('lot:deleted', handleRefresh);
      socket.off('slot:statusUpdate', handleRefresh);
    };
  }, [isAuthenticated, loadLots]);

  const filteredLots = parkingLots.filter(
    lot =>
      lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBookNow = (lot: ParkingLotCard) => {
    setBookingUi({ open: true, lot });
  };

  const handleConfirmBooking = (booking: {
    spot: string;
    floor: number;
    vehicleNumber: string;
    startTime: string;
    duration: number;
    totalPrice: number;
  }) => {
    setCompletedBooking({
      ...booking,
      parkingLotName: bookingUi.lot?.name ?? '',
      parkingLotAddress: bookingUi.lot?.address ?? '',
    });
    setBookingUi({ open: false, lot: null });
    setShowSuccessModal(true);
    void loadLots();
  };

  const handleDelete = async () => {
    if (!selectedLot) return;
    try {
      await api.delete(`/parking-lots/delete-parking-lot/${selectedLot._id}`);
      void loadLots();
      setIsDeleteConfirmOpen(false);
      setSelectedLot(null);
    } catch (err) {
      console.error("Failed to delete parking lot", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Parking Lots</h1>
            <p className="text-gray-600">Find and book parking spots near you</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Parking Lot
            </button>
          )}
        </div>

        <div className="mb-8">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by location or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loadError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <Skeleton className="w-full h-48 rounded-none" />
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <Skeleton className="w-2/3 h-6" />
                    <Skeleton className="w-16 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <Skeleton className="w-full h-4" />
                  </div>
                  <Skeleton className="w-full h-12 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLots.map(lot => (
              <div
                key={lot.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 group relative"
              >
                {isAdmin && (
                    <div className="absolute top-3 left-3 z-50">
                      <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="p-1.5 bg-white/90 backdrop-blur-sm text-gray-700 hover:text-gray-900 rounded-lg shadow-sm transition-colors border border-gray-100">
                          <MoreVertical className="w-4 h-4" />
                        </Menu.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute left-0 mt-2 w-48 origin-top-left divide-y divide-gray-100 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <div className="px-1 py-1 ">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => { setSelectedLot(lot.raw); setIsEditModalOpen(true); }}
                                    className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
                                  >
                                    <Edit2 className="mr-3 h-4 w-4" aria-hidden="true" />
                                    Edit Details
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => { setSelectedLot(lot.raw); setIsImageModalOpen(true); }}
                                    className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
                                  >
                                    <ImageIcon className="mr-3 h-4 w-4" aria-hidden="true" />
                                    Update Image
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => { setSelectedLot(lot.raw); setIsSlotsModalOpen(true); }}
                                    className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
                                  >
                                    <Layers className="mr-3 h-4 w-4" aria-hidden="true" />
                                    Bulk Add Slots
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                            <div className="px-1 py-1">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => { setSelectedLot(lot.raw); setIsDeleteConfirmOpen(true); }}
                                    className={`${active ? 'bg-red-50 text-red-600' : 'text-gray-700'} group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
                                  >
                                    <Trash2 className="mr-3 h-4 w-4" aria-hidden="true" />
                                    Delete Lot
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </div>
                  )}

                <div className="relative h-48 overflow-hidden rounded-t-xl">
                  <img
                    src={lot.image}
                    alt={lot.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    {lot.availableSpots} / {lot.totalSlots} available
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{lot.name}</h3>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{lot.priceLabel}</span>
                      <span className="text-xs text-gray-500 block">from</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 mb-5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-600 line-clamp-1">{lot.address}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBookNow(lot)}
                    disabled={lot.availableSpots === 0}
                    className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 cursor-pointer disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all active:scale-95"
                  >
                    {lot.availableSpots === 0 ? 'No spots available' : user?.role === "admin" ? "Edit Lots" : "Book Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredLots.length === 0 && !loadError && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No parking lots found</h3>
            <p className="text-gray-600">Try adjusting your search terms</p>
          </div>
        )}
      </main>

      {bookingUi.lot && (
        <ParkingSlot
          isOpen={bookingUi.open}
          onClose={() => setBookingUi({ open: false, lot: null })}
          lotId={bookingUi.lot.id}
          parkingLotName={bookingUi.lot.name}
          parkingLotAddress={bookingUi.lot.address}
          onConfirmBooking={handleConfirmBooking}
        />
      )}

      {completedBooking && (
        <BookingSuccess
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setCompletedBooking(null);
          }}
          bookingDetails={completedBooking}
        />
      )}

      <CreateLotModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={loadLots} 
      />

      <EditLotModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedLot(null);
        }}
        onSuccess={loadLots}
        lot={selectedLot}
      />

      <EditLotImageModal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setSelectedLot(null);
        }}
        onSuccess={loadLots}
        lot={selectedLot}
      />

      <CreateSlotsModal
        isOpen={isSlotsModalOpen}
        onClose={() => {
          setIsSlotsModalOpen(false);
          setSelectedLot(null);
        }}
        onSuccess={loadLots}
        lotId={selectedLot?._id || ""}
        lotName={selectedLot?.lotName || ""}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setSelectedLot(null);
        }}
        onConfirm={handleDelete}
        title="Delete Parking Lot"
        message={`Are you sure you want to delete "${selectedLot?.lotName}"? This action cannot be undone and will delete all associated slots and bookings.`}
        confirmLabel="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default ParkingLots;
