import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";
import { Booking } from "../models/booking.model";
import { Payment } from "../models/payment.model";
import { ParkingSlots } from "../models/parkingSlots.model";
import { ParkingLots } from "../models/parkingLot.model";

const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  
  const dateFilter: any = {};
  if (date) {
    const start = new Date(date as string);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date as string);
    end.setHours(23, 59, 59, 999);
    
    dateFilter.createdAt = { $gte: start, $lte: end };
  }

  const usersCount = await User.countDocuments({}); // All time users as per user request

  // Active bookings = reserved + active (any slot currently in use)
  const activeBookings = await Booking.countDocuments({
    ...dateFilter,
    bookingStatus: { $in: ["active", "reserved"] }
  });

  const slotsCount = await ParkingSlots.countDocuments({}); // Slots are usually static, but we could filter by creation if needed.

  // Calculate total revenue from successful payments
  const paymentFilter: any = {
    paymentStatus: "paid",
  };
  if (dateFilter.createdAt) paymentFilter.createdAt = dateFilter.createdAt;

  const payments = await Payment.find(paymentFilter);
  const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users: usersCount,
        bookings: activeBookings,
        slots: slotsCount,
        revenue: totalRevenue,
      },
      "Dashboard stats fetched successfully"
    )
  );
});

const getAllBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await Booking.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "parkingslots",
        localField: "slotId",
        foreignField: "_id",
        as: "slot"
      }
    },
    { $unwind: "$slot" },
    {
      $lookup: {
        from: "parkinglots",
        localField: "slot.lotId",
        foreignField: "_id",
        as: "lot"
      }
    },
    { $unwind: "$lot" },
    {
      $lookup: {
        from: "payments",
        localField: "_id",
        foreignField: "bookingId",
        as: "payment"
      }
    },
    { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        vehicleNumber: 1,
        startTime: 1,
        endTime: 1,
        bookingStatus: 1,
        createdAt: 1,
        "user.fullName": 1,
        "user.email": 1,
        "user.phoneNo": 1,
        "slot.slotNumber": 1,
        "slot.floor": 1,
        "lot.lotName": 1,
        "lot.address": 1,
        "payment.amount": 1,
        "payment.paymentMethod": 1,
        "payment.paymentStatus": 1,
      }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "All bookings fetched successfully"));
});

const getAllCustomerRecords = asyncHandler(async (req: Request, res: Response) => {
  const records = await Booking.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "parkingslots",
        localField: "slotId",
        foreignField: "_id",
        as: "slot"
      }
    },
    { $unwind: "$slot" },
    {
      $lookup: {
        from: "parkinglots",
        localField: "slot.lotId",
        foreignField: "_id",
        as: "lot"
      }
    },
    { $unwind: "$lot" },
    {
      $lookup: {
        from: "payments",
        localField: "_id",
        foreignField: "bookingId",
        as: "payment"
      }
    },
    { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        durationMs: {
          $subtract: [
            { $ifNull: ["$endTime", new Date()] },
            "$startTime"
          ]
        }
      }
    },
    {
      $addFields: {
        durationHours: {
          $ceil: { $divide: ["$durationMs", 3600000] }
        }
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        vehicleNumber: 1,
        startTime: 1,
        endTime: 1,
        bookingStatus: 1,
        createdAt: 1,
        durationHours: 1,
        "user.fullName": 1,
        "user.email": 1,
        "user.phoneNo": 1,
        "slot.slotNumber": 1,
        "slot.floor": 1,
        "slot.pricePerHour": 1,
        "slot.type": 1,
        "lot.lotName": 1,
        "lot.address": 1,
        "payment.amount": 1,
        "payment.paymentMethod": 1,
        "payment.paymentStatus": 1,
        "payment.paidAt": 1,
      }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, records, "Customer records fetched successfully"));
});

const getAllPayments = asyncHandler(async (req: Request, res: Response) => {
  const payments = await Payment.aggregate([
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking"
      }
    },
    { $unwind: "$booking" },
    {
      $lookup: {
        from: "users",
        localField: "booking.userId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        amount: 1,
        paymentMethod: 1,
        paymentStatus: 1,
        razorpayPaymentId: 1,
        paidAt: 1,
        createdAt: 1,
        "user.fullName": 1,
        "user.email": 1
      }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, payments, "All payments fetched successfully"));
});

const getAllSlots = asyncHandler(async (req: Request, res: Response) => {
  const slots = await ParkingSlots.find({}).sort({ createdAt: -1 });
  return res
    .status(200)
    .json(new ApiResponse(200, slots, "All slots fetched successfully"));
});

export { getDashboardStats, getAllBookings, getAllCustomerRecords, getAllPayments, getAllSlots };
