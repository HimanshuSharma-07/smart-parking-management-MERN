import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { createBooking, getUserBooking, cancelBooking, completeBooking, markVehicleEntry, searchBookingByVehicle } from "../controllers/booking.controller";


const router =  Router()

router.route("/parking-slots/:slotId/booking").post(verifyJWT, createBooking)
router.route("/my-bookings").get(verifyJWT, getUserBooking)
router.route("/vehicle/:vehicleNumber").get(verifyJWT, searchBookingByVehicle)
router.route("/:bookingId/entry").patch(verifyJWT, markVehicleEntry)
router.route("/:bookingId/complete").patch(verifyJWT, completeBooking)
router.route("/:bookingId/cancel").patch(verifyJWT, cancelBooking)


export default router