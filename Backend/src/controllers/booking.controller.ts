import { Booking } from "../models/booking.model";
import { ParkingLots } from "../models/parkingLot.model";
import { ParkingSlots } from "../models/parkingSlots.model";
import { Payment } from "../models/payment.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { emitToAdmin, emitToLot, emitToUser } from "../sockets/socket";
import razorpay from "../utils/razorpay";
import { User } from "../models/user.model";
import { sendInvoiceEmail } from "../utils/email.service";


const createBooking = asyncHandler( async (req: Request, res: Response) => {
        
    const { slotId } = req.params
    const userId = req.user?._id
    const { vehicleNumber, startTime, endTime} = req.body

    if (!vehicleNumber || !startTime || !endTime) {
        throw new ApiError(400, "All fields are required")
    }

    const parkingSlot = await ParkingSlots.findById(slotId)
    if (!parkingSlot) {
        throw new ApiError(404, "Parking slot not found")
    }

    if (parkingSlot.status !== "available") {
        throw new ApiError(400, "Parking slot is not available")
    }

    const existingBooking = await Booking.findOne({
        slotId: parkingSlot._id,
        bookingStatus: { $in: ["active", "reserved", "confirmed"] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
    })
    
    if (existingBooking) {
         throw new ApiError(409, "Parking slot already booked for this time")
    }

    // Calculate Amount
    const start = new Date(startTime)
    const end = new Date(endTime)
    const durationMs = end.getTime() - start.getTime()
    const hours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)))
    const amount = hours * (parkingSlot.pricePerHour || 0)

    // Create Razorpay Order
    const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `rcpt_${Date.now()}`
    })

    const booking = await Booking.create({
        userId,
        slotId,
        vehicleNumber,
        startTime,
        endTime,
        bookingStatus: "reserved" // This acts as "Locked" while waiting for payment
    })

    // Create Payment record (Pending)
    await Payment.create({
        bookingId: booking._id,
        amount,
        paymentMethod: "online",
        paymentStatus: "pending",
        razorpayOrderId: razorpayOrder.id
    })

    parkingSlot.status = "reserved"
    await parkingSlot.save()

    const lotId = parkingSlot.lotId?.toString()
    if (lotId) {
        await ParkingLots.findByIdAndUpdate(lotId, {
            $inc: { availableSlots: -1 }
        })
        emitToLot(lotId, "slot:statusUpdate", {
            slotId: parkingSlot._id.toString(),
            status: "reserved",
            lotId,
        })
    }
    emitToAdmin("booking:new", { booking, slotId: parkingSlot._id.toString(), lotId })

    return res
    .status(200)
    .json(
        new ApiResponse(201, { booking, razorpayOrder, key: process.env.RAZORPAY_KEY_ID }, "Booking initiated. Please complete payment to confirm.")
    )

})

const getUserBooking = asyncHandler( async (req: Request, res: Response) => {

    const userId = req.user?._id;

    const userBookings = await Booking.aggregate([
        { $match: { userId: userId } },
        {
            $lookup: {
                from: "parkingslots",
                localField: "slotId",
                foreignField: "_id",
                as: "slotId"
            }
        },
        { $unwind: { path: "$slotId", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "parkinglots",
                localField: "slotId.lotId",
                foreignField: "_id",
                as: "slotId.lotId"
            }
        },
        { $unwind: { path: "$slotId.lotId", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "payments",
                localField: "_id",
                foreignField: "bookingId",
                as: "payment"
            }
        },
        { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } }
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(200, userBookings, "User Booking fetched Successfully")
    )
})

const completeBooking = asyncHandler(async (req: Request, res: Response) => {
    
    const { bookingId } = req.params

    const userBooking = await Booking.findById(bookingId)

    if (!userBooking) {
        throw new ApiError(404, "Booking not found")
    }

    if (userBooking.bookingStatus === "completed") {
        throw new ApiError(400, "Booking already completed")
    }

    const parkingSlot = await ParkingSlots.findById(userBooking.slotId)

    if (!parkingSlot) {
        throw new ApiError(404, "Parking slot not found")
    }

    const endTime = new Date()
    
    // Calculate duration from the moment they actually entered (startTime)
    const { paymentMethod = "online" } = req.body

    const durationMs = endTime.getTime() - userBooking.startTime.getTime()
    const hours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)))
    const totalPrice = hours * (parkingSlot.pricePerHour || 0)

    userBooking.endTime = endTime
    userBooking.bookingStatus = "completed"
    await userBooking.save()

    // Handle Payment recording for Cash
    if (paymentMethod === "cash") {
        await Payment.create({
            bookingId: userBooking._id,
            amount: totalPrice,
            paymentMethod: "cash",
            paymentStatus: "paid",
            paidAt: new Date()
        })
    }

    parkingSlot.status = "available"
    await parkingSlot.save()

    // Increment available slots in ParkingLot
    await ParkingLots.findByIdAndUpdate(parkingSlot.lotId, {
        $inc: { availableSlots: 1 }
    })

    // Emit real-time events
    const lotId = parkingSlot.lotId?.toString()
    if (lotId) {
        emitToLot(lotId, "slot:statusUpdate", {
            slotId: parkingSlot._id.toString(),
            status: "available",
            lotId,
        })
    }
    emitToAdmin("booking:completed", { bookingId, lotId, slotId: parkingSlot._id.toString() })
    
    emitToAdmin("payment:created", { 
        bookingId, 
        amount: totalPrice, 
        method: paymentMethod,
        status: paymentMethod === "cash" ? "paid" : "pending" 
    })
    
    // Notification for the user
    if (userBooking.userId) {
        emitToUser(userBooking.userId.toString(), "booking:updated", { 
            bookingId, 
            status: "completed",
            lotId,
            slotId: parkingSlot._id.toString(),
            totalPrice,
            paymentMethod
        })

        // Send Final Bill Email
        const user = await User.findById(userBooking.userId);
        const lot = await ParkingLots.findById(parkingSlot.lotId);
        
        if (user && user.email) {
            await sendInvoiceEmail(user.email, {
                vehicleNumber: userBooking.vehicleNumber,
                slotNumber: parkingSlot.slotNumber,
                lotName: lot?.lotName || "Parking Lot",
                startTime: userBooking.startTime,
                endTime: userBooking.endTime,
                amount: totalPrice
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { hours, totalPrice, paymentMethod }, "Vehicle Exit Processed. Booking completed successfully")
    )
})

const markVehicleEntry = asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params

    const booking = await Booking.findById(bookingId)
    if (!booking) {
        throw new ApiError(404, "Booking not found")
    }

    if (booking.bookingStatus !== "reserved" && booking.bookingStatus !== "confirmed") {
        throw new ApiError(400, `Cannot mark entry for booking with status: ${booking.bookingStatus}`)
    }

    const parkingSlot = await ParkingSlots.findById(booking.slotId)
    if (!parkingSlot) {
        throw new ApiError(404, "Parking slot not found")
    }

    // Update booking status and actual start time
    booking.bookingStatus = "active"
    booking.startTime = new Date() 
    await booking.save()

    // Update slot status to occupied
    parkingSlot.status = "occupied"
    await parkingSlot.save()

    // Real-time: push status change to lot room
    const lotId = parkingSlot.lotId?.toString()
    if (lotId) {
        emitToLot(lotId, "slot:statusUpdate", {
            slotId: parkingSlot._id.toString(),
            status: "occupied",
            lotId,
        })
    }
    emitToAdmin("booking:entry", { bookingId, lotId, slotId: parkingSlot._id.toString() })

    return res.status(200).json(
        new ApiResponse(200, booking, "Vehicle Entry Marked successfully. Slot is now occupied.")
    )
})

const cancelBooking = asyncHandler( async (req: Request, res: Response) => {

    const { bookingId } = req.params

    const userBooking = await Booking.findById(bookingId)

    if (!userBooking) {
        throw new ApiError(404, "User Booking not found")
    }

    userBooking.bookingStatus = "cancelled"
    await userBooking.save()

    const updatedParkingSlot = await ParkingSlots.findByIdAndUpdate(
        userBooking.slotId,
        {
            status: "available"
        },
        { new: true }
    )

    // Increment available slots in ParkingLot when a booking is cancelled
    const lotId = updatedParkingSlot?.lotId?.toString()
    if (lotId) {
        await ParkingLots.findByIdAndUpdate(lotId, {
            $inc: { availableSlots: 1 }
        })
    }

    // Emit real-time events
    if (lotId) {
        emitToLot(lotId, "slot:statusUpdate", {
            slotId: userBooking.slotId?.toString(),
            status: "available",
            lotId,
        })
    }
    emitToAdmin("booking:cancelled", { bookingId, lotId, slotId: userBooking.slotId?.toString() })

    // Notification for the user
    if (userBooking.userId) {
        emitToUser(userBooking.userId.toString(), "booking:updated", { 
            bookingId, 
            status: "cancelled",
            lotId,
            slotId: userBooking.slotId?.toString()
        })
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedParkingSlot, "User Booking Cancelled")
    )
    
})

const searchBookingByVehicle = asyncHandler(async (req: Request, res: Response) => {
    const { vehicleNumber } = req.params;

    if (!vehicleNumber) {
        throw new ApiError(400, "Vehicle number is required");
    }

    // Find the most recent active, reserved, or confirmed booking for this vehicle
    const booking = await Booking.findOne({
        vehicleNumber: { $regex: new RegExp(`^${vehicleNumber}$`, "i") },
        bookingStatus: { $in: ["active", "reserved", "confirmed"] }
    })
    .populate({
        path: "slotId",
        populate: { path: "lotId", model: "ParkingLots" }
    })
    .sort({ createdAt: -1 });

    if (!booking) {
        throw new ApiError(404, "No active or reserved booking found for this vehicle");
    }

    return res.status(200).json(
        new ApiResponse(200, booking, "Booking found")
    );
});

const cleanupExpiredBookings = async () => {
    try {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        // Find bookings that are 'reserved' and older than 15 minutes
        const expiredBookings = await Booking.find({
            bookingStatus: "reserved",
            createdAt: { $lt: fifteenMinutesAgo }
        });

        if (expiredBookings.length === 0) return;

        console.log(`[Cleanup] Found ${expiredBookings.length} expired reservations. Cleaning up...`);

        for (const booking of expiredBookings) {
            // Update booking status to cancelled
            booking.bookingStatus = "cancelled";
            await booking.save();

            // Update slot status to available
            const slot = await ParkingSlots.findById(booking.slotId);
            if (slot) {
                if (slot.status === "reserved" || slot.status === "occupied") {
                    slot.status = "available";
                    await slot.save();

                    // Increment available slots in ParkingLot
                    await ParkingLots.findByIdAndUpdate(slot.lotId, {
                        $inc: { availableSlots: 1 }
                    });

                    // Emit real-time update
                    const lotId = slot.lotId?.toString();
                    if (lotId) {
                        emitToLot(lotId, "slot:statusUpdate", {
                            slotId: slot._id.toString(),
                            status: "available",
                            lotId,
                        });
                    }
                }
            }
        }
        console.log(`[Cleanup] Successfully cleaned up ${expiredBookings.length} bookings.`);
    } catch (error) {
        console.error("[Cleanup] Error during expired bookings cleanup:", error);
    }
};

export {
    createBooking,
    getUserBooking,
    completeBooking,
    cancelBooking,
    markVehicleEntry,
    searchBookingByVehicle,
    cleanupExpiredBookings
}