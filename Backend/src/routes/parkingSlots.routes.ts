import { Router } from "express";
import { verifyAdmin, verifyJWT } from "../middlewares/auth.middleware";
import {
    createParkingSlot,
    createBulkParkingSlots,
    getAllParkingSlots,
    getParkingSlotById,
    getAvailableSlots,
    updateSlotStatus,
    updateParkingSlotDetails,
    deleteParkingSlot,
    deleteFloorSlots
} from "../controllers/parkingSlots.controller";

const router = Router()


router.post("/:lotId/slots", verifyJWT, verifyAdmin, createParkingSlot)
router.post("/:lotId/slots/bulk", verifyJWT, verifyAdmin, createBulkParkingSlots)

router.get("/:lotId/slots", verifyJWT, getAllParkingSlots)
router.get("/:lotId/slots/available", verifyJWT, getAvailableSlots)
router.get("/slots/:slotId", verifyJWT, getParkingSlotById)


router.patch("/slots/:slotId/status", verifyJWT, updateSlotStatus)
router.patch("/slots/:slotId", verifyJWT, verifyAdmin,updateParkingSlotDetails)

router.delete("/slots/:slotId", verifyJWT, verifyAdmin,  deleteParkingSlot)
router.delete("/:lotId/floors/:floor", verifyJWT, verifyAdmin, deleteFloorSlots)

export default router