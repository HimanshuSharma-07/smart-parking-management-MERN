import { Router } from "express";
import { createOrder, verifyPayment, handleWebhook } from "../controllers/payment.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

router.route("/create-order").post(verifyJWT, createOrder);
router.route("/verify-payment").post(verifyJWT, verifyPayment);
router.route("/webhook").post(handleWebhook);

export default router;