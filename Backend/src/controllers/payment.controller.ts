import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Booking } from "../models/booking.model";
import { Payment } from "../models/payment.model";
import { ParkingSlots } from "../models/parkingSlots.model";
import razorpay from "../utils/razorpay";
import crypto from "crypto";
import { User } from "../models/user.model";
import { ParkingLots } from "../models/parkingLot.model";
import { sendInvoiceEmail } from "../utils/email.service";
import { emitToAdmin, emitToLot, emitToUser } from "../sockets/socket";

const createOrder = asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.body;

    if (!bookingId) {
        throw new ApiError(400, "Booking ID is required");
    }

    const booking = await Booking.findById(bookingId).populate("slotId");
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }
    if (booking.bookingStatus === "completed" || booking.bookingStatus === "cancelled") {
        throw new ApiError(400, "Cannot create payment order for closed booking");
    }

    const parkingSlot: any = booking.slotId;
    if (!parkingSlot) {
        throw new ApiError(404, "Parking slot not found for this booking");
    }

    const existingPayment = await Payment.findOne({ bookingId: booking._id });
    if (existingPayment?.paymentStatus === "paid") {
        throw new ApiError(400, "Booking is already paid");
    }

    // Price against the booked window to avoid runaway amount for long-running active records.
    const endTime = booking.endTime || new Date();
    const durationMs = endTime.getTime() - booking.startTime.getTime();
    const hours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const amount = hours * (parkingSlot.pricePerHour || 0);

    if (amount <= 0) {
        throw new ApiError(400, "Invalid payment amount");
    }

    const options = {
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency: "INR",
        receipt: `receipt_${bookingId}`,
    };

    try {
        const order = await razorpay.orders.create(options);

        // Update or create payment record
        await Payment.findOneAndUpdate(
            { bookingId: booking._id },
            {
                bookingId: booking._id,
                amount: amount,
                paymentMethod: "online",
                paymentStatus: "pending",
                razorpayOrderId: order.id,
            },
            { upsert: true, new: true }
        );

        return res.status(200).json(
            new ApiResponse(200, {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID
            }, "Razorpay order created successfully")
        );
    } catch (error: any) {
        console.error("Razorpay Order Error:", error);
        throw new ApiError(500, error.message || "Error creating Razorpay order");
    }
});

const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bookingId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError(400, "Payment details are required");
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(sign.toString())
        .digest("hex");

    if (razorpay_signature !== expectedSign) {
        throw new ApiError(400, "Invalid payment signature");
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
        throw new ApiError(404, "Payment record not found");
    }

    payment.paymentStatus = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.paidAt = new Date();
    await payment.save();

    const booking = await Booking.findById(payment.bookingId).populate("slotId");
    if (booking && booking.bookingStatus === "reserved") {
        booking.bookingStatus = "confirmed";
        await booking.save();

        // Keep slot reserved after successful payment until gate entry is marked.
        const slot: any = booking.slotId;
        if (slot && slot.status !== "reserved") {
            slot.status = "reserved";
            await slot.save();

            const lotId = slot.lotId?.toString();
            if (lotId) {
                emitToLot(lotId, "slot:statusUpdate", {
                    slotId: slot._id.toString(),
                    status: "reserved",
                    lotId,
                });
            }
        }

        // Send Invoice Email - only if not already sent
        const user = await User.findById(booking.userId);
        const lot = await ParkingLots.findById(slot.lotId);

        if (user && user.email && !payment.invoiceSent) {
            await sendInvoiceEmail(user.email, {
                vehicleNumber: booking.vehicleNumber,
                slotNumber: slot.slotNumber,
                lotName: lot?.lotName || "Parking Lot",
                startTime: booking.startTime,
                endTime: booking.endTime,
                amount: payment.amount
            });
            payment.invoiceSent = true;
            await payment.save();
        }
    } else if (booking && booking.bookingStatus === "confirmed" && !payment.invoiceSent) {
        // Case where webhook might have finished first, but email wasn't sent or we want to be sure
        const user = await User.findById(booking.userId);
        const slot: any = booking.slotId;
        const lot = await ParkingLots.findById(slot?.lotId);

        if (user && user.email) {
            await sendInvoiceEmail(user.email, {
                vehicleNumber: booking.vehicleNumber,
                slotNumber: slot?.slotNumber,
                lotName: lot?.lotName || "Parking Lot",
                startTime: booking.startTime,
                endTime: booking.endTime,
                amount: payment.amount
            });
            payment.invoiceSent = true;
            await payment.save();
        }
    }

    // Emit real-time updates
    if (booking) {
        emitToAdmin("payment:updated", {
            bookingId: payment.bookingId.toString(),
            paymentStatus: "paid",
            amount: payment.amount
        });
        if (booking.userId) {
            emitToUser(booking.userId.toString(), "booking:updated", {
                bookingId: payment.bookingId.toString(),
                status: booking.bookingStatus,
                paymentStatus: "paid"
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, payment, "Payment verified and record updated successfully")
    );
});

const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

    if (signature !== expectedSignature) {
        throw new ApiError(400, "Invalid webhook signature");
    }

    const { event, payload } = req.body;

    if (event === "payment.captured") {
        const orderId = payload.payment.entity.order_id;
        const paymentId = payload.payment.entity.id;

        const payment = await Payment.findOne({ razorpayOrderId: orderId });
        if (payment && payment.paymentStatus !== "paid") {
            payment.paymentStatus = "paid";
            payment.razorpayPaymentId = paymentId;
            payment.paidAt = new Date();
            await payment.save();

            const booking = await Booking.findById(payment.bookingId).populate("slotId");
            if (booking && booking.bookingStatus === "reserved") {
                booking.bookingStatus = "confirmed";
                await booking.save();

                // Keep slot reserved after successful payment until gate entry is marked.
                const slot: any = booking.slotId;
                if (slot && slot.status !== "reserved") {
                    slot.status = "reserved";
                    await slot.save();

                    const lotId = slot.lotId?.toString();
                    if (lotId) {
                        emitToLot(lotId, "slot:statusUpdate", {
                            slotId: slot._id.toString(),
                            status: "reserved",
                            lotId,
                        });
                    }
                }

                const user = await User.findById(booking.userId);
                const lot = await ParkingLots.findById(slot.lotId);

                if (user && user.email && !payment.invoiceSent) {
                    await sendInvoiceEmail(user.email, {
                        vehicleNumber: booking.vehicleNumber,
                        slotNumber: slot.slotNumber,
                        lotName: lot?.lotName || "Parking Lot",
                        startTime: booking.startTime,
                        endTime: booking.endTime,
                        amount: payment.amount
                    });
                    payment.invoiceSent = true;
                    await payment.save();
                }
            } else if (booking && booking.bookingStatus === "confirmed" && !payment.invoiceSent) {
                const user = await User.findById(booking.userId);
                const slot: any = booking.slotId;
                const lot = await ParkingLots.findById(slot?.lotId);

                if (user && user.email) {
                    await sendInvoiceEmail(user.email, {
                        vehicleNumber: booking.vehicleNumber,
                        slotNumber: slot?.slotNumber,
                        lotName: lot?.lotName || "Parking Lot",
                        startTime: booking.startTime,
                        endTime: booking.endTime,
                        amount: payment.amount
                    });
                    payment.invoiceSent = true;
                    await payment.save();
                }
            }
        }
    }

    return res.status(200).json({ status: "ok" });
});

export {
    createOrder,
    verifyPayment,
    handleWebhook
};