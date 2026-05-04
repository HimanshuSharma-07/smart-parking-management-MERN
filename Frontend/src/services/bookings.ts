import api from './api';

/** Populated shapes from GET /bookings/my-bookings when backend uses nested populate */
export interface PopulatedLot {
  _id: string;
  lotName: string;
  address: string;
  parkingLotImg?: string;
  totalSlots?: number;
}

export interface PopulatedSlot {
  _id: string;
  slotNumber: string;
  floor: number;
  type: 'standard' | 'ev' | 'large' | 'disabled';
  status: string;
  pricePerHour: number;
  lotId?: PopulatedLot | string;
}

export interface RawPayment {
  amount: number;
  paymentMethod: 'online' | 'cash';
  paymentStatus: 'pending' | 'paid' | 'failed';
  razorpayPaymentId?: string;
  paidAt?: string;
}

export interface RawBooking {
  _id: string;
  vehicleNumber: string;
  startTime: string;
  endTime: string;
  bookingStatus: 'active' | 'reserved' | 'confirmed' | 'completed' | 'cancelled';
  slotId: PopulatedSlot | string;
  payment?: RawPayment;
}

export type BookingStatusUI = 'active' | 'upcoming' | 'completed' | 'cancelled';

export interface MyBookingsCard {
  id: string;
  parkingLotName: string;
  parkingLotAddress: string;
  spot: string;
  floor: number;
  vehicleNumber: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalPrice: number;
  status: BookingStatusUI;
  bookingRef: string;
  spotType: 'regular' | 'compact' | 'large' | 'ev-charging';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'unpaid';
  paymentMethod?: 'online' | 'cash';
}

export async function fetchMyBookings(): Promise<RawBooking[]> {
  const { data } = await api.get<{ data: RawBooking[] }>('/bookings/my-bookings');
  return data.data;
}

export async function cancelBookingRequest(bookingId: string): Promise<void> {
  await api.patch(`/bookings/${bookingId}/cancel`);
}

export function getLotMeta(slot: PopulatedSlot | string | undefined): {
  name: string;
  address: string;
} {
  if (!slot || typeof slot === 'string') {
    return { name: 'Parking lot', address: '' };
  }
  const lot = slot.lotId;
  if (lot && typeof lot === 'object' && 'lotName' in lot) {
    return { name: lot.lotName, address: lot.address ?? '' };
  }
  return { name: 'Parking lot', address: '' };
}

function slotTypeToSpotType(type: string): MyBookingsCard['spotType'] {
  if (type === 'ev') return 'ev-charging';
  if (type === 'large') return 'large';
  if (type === 'disabled') return 'compact';
  return 'regular';
}

function rawStatusToUi(b: RawBooking): BookingStatusUI {
  if (b.bookingStatus === 'cancelled') return 'cancelled';
  if (b.bookingStatus === 'completed') return 'completed';
  const now = Date.now();
  const start = new Date(b.startTime).getTime();
  if (start > now && (b.bookingStatus === 'active' || b.bookingStatus === 'reserved' || b.bookingStatus === 'confirmed')) {
    return 'upcoming';
  }
  return 'active';
}

export function mapRawToMyBookingsCard(b: RawBooking): MyBookingsCard {
  const slot = b.slotId;
  const { name: parkingLotName, address: parkingLotAddress } = getLotMeta(
    typeof slot === 'object' ? slot : undefined
  );

  const slotObj = typeof slot === 'object' ? slot : null;
  const pricePerHour = slotObj?.pricePerHour ?? 0;

  const startMs = new Date(b.startTime).getTime();
  const endMs = new Date(b.endTime).getTime();
  const duration = Math.max(1, Math.round((endMs - startMs) / 3_600_000));

  const paymentAmount = b.payment?.amount;
  const computedPrice = paymentAmount != null ? paymentAmount : duration * pricePerHour;

  return {
    id: b._id,
    parkingLotName,
    parkingLotAddress,
    spot: slotObj?.slotNumber ?? '—',
    floor: slotObj ? Number(slotObj.floor) : 0,
    vehicleNumber: b.vehicleNumber,
    startTime: b.startTime,
    endTime: b.endTime,
    duration,
    totalPrice: computedPrice,
    status: rawStatusToUi(b),
    bookingRef: `BK-${String(b._id).slice(-6).toUpperCase()}`,
    spotType: slotTypeToSpotType(slotObj?.type ?? 'standard'),
    paymentStatus: b.payment?.paymentStatus ?? 'unpaid',
    paymentMethod: b.payment?.paymentMethod,
  };
}

export interface ProfileRecentBooking {
  id: string;
  name: string;
  spot: string;
  date: string;
  price: number;
  status: 'active' | 'upcoming' | 'completed';
}

export function mapRawToProfileRecent(b: RawBooking): ProfileRecentBooking {
  const card = mapRawToMyBookingsCard(b);
  const uiStatus = card.status === 'cancelled' ? 'completed' : card.status;
  const status: ProfileRecentBooking['status'] =
    uiStatus === 'upcoming' || uiStatus === 'active' || uiStatus === 'completed'
      ? uiStatus
      : 'completed';

  return {
    id: card.id,
    name: card.parkingLotName,
    spot: `Spot ${card.spot}`,
    date: new Date(card.startTime).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    price: card.totalPrice,
    status,
  };
}
