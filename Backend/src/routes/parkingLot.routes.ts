import { Router } from "express"
import { createParkingLot, getParkingLotById, updateParkingLotDetails, updateParkingLotImage, getAllParkingLots, deleteParkingLot } from "../controllers/parkingLot.controller"
import { verifyAdmin, verifyJWT } from "../middlewares/auth.middleware"
import { upload } from "../middlewares/multer.middleware"

const router = Router()

router.route("/create-parking-lot").post(
    verifyJWT,
    verifyAdmin,
    upload.single("parkingLotImg"),
    createParkingLot
)

router.route("/all-parking-lots").get(verifyJWT, getAllParkingLots)
router.route("/parking-lots/:id").get(verifyJWT, getParkingLotById)

router.route("/parking-lots/:id/details").patch(verifyJWT, updateParkingLotDetails)
router.route("/parking-lots/:id/image").patch(
    verifyJWT,
    verifyAdmin,
    upload.single("parkingLotImg"),
    updateParkingLotImage
)

router.route("/delete-parking-lot/:id").delete(verifyJWT, verifyAdmin,deleteParkingLot)

export default router