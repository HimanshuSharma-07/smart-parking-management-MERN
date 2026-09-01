import Razorpay from "razorpay";
import { asyncHandler } from "./asyncHandler";
import { Request, Response } from "express";

const razorpay = new Razorpay({
    key_id: process.env.RAZERPAY_KEY_ID,
    key_secret: process.env.RAZERPAY_SECRET
})

const createOrder = asyncHandler( async (req: Request, res: Response) => {
    const { amount } = req.body;

    const options = {
        amount: amount * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json(order);
});

export { createOrder };