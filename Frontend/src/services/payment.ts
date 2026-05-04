import api from "./api";

export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
}

export const createRazorpayOrder = async (bookingId: string): Promise<RazorpayOrder> => {
  const response = await api.post("/payment/create-order", { bookingId });
  return response.data.data;
};

export const verifyRazorpayPayment = async (data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId: string;
}) => {
  const response = await api.post("/payment/verify-payment", data);
  return response.data;
};
