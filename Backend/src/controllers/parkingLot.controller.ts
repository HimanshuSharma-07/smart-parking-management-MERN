import { Request, Response } from "express"
import { asyncHandler } from "../utils/asyncHandler"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { uploadOnCloudinary } from "../utils/cloudinary"
import { ParkingLots } from "../models/parkingLot.model"
import { ParkingSlots } from "../models/parkingSlots.model"
import { emitToAdmin } from "../sockets/socket"

const createParkingLot = asyncHandler(async (req: Request, res: Response) => {
    
    const { lotName, address, totalFloors, slotsPerFloor, pricePerHour } = req.body

    if (!lotName || !address || !totalFloors || !slotsPerFloor || !pricePerHour) {
        throw new ApiError(400, "All fields are required")
    }

    const parkingLotImgLocalPath = req.file?.path

    if (!parkingLotImgLocalPath) {
        
        throw new ApiError(400, "Parking lot image is required")
    }

    const uploadedParkingLotImg = await uploadOnCloudinary(parkingLotImgLocalPath)

    if (!uploadedParkingLotImg?.url) {
        
        throw new ApiError(500, "Failed to upload parking lot image")
    }

    const tFloors = parseInt(totalFloors, 10);
    const sPFloor = parseInt(slotsPerFloor, 10);


    const parkingLot = await ParkingLots.create({
        lotName,
        address,
        parkingLotImg: uploadedParkingLotImg.url,
        totalSlots: tFloors * sPFloor,
        totalFloors: tFloors,
        slotsPerFloor: sPFloor,
        availableSlots: tFloors * sPFloor,
        pricePerHour: Number(pricePerHour)
    })

    // Automatically create slots for the parking lot
    const slots = []
    const hourlyPrice = Number(pricePerHour)
    const defaultType = "standard"

    for (let floor = 1; floor <= tFloors; floor++) {
        for (let slot = 1; slot <= sPFloor; slot++) {
            slots.push({
                slotNumber: `F${floor}-S${slot}`,
                floor,
                type: defaultType,
                status: "available",
                pricePerHour: hourlyPrice,
                lotId: parkingLot._id
            })
        }
    }


    await ParkingSlots.insertMany(slots)

    const createdparkingLot = await ParkingLots.findById(parkingLot._id)

    if (!createdparkingLot) {
        throw new ApiError(500, "Failed to create Parking lot")
    }

    // Real-time: broadcast to all connected clients
    emitToAdmin("lot:created", { lot: createdparkingLot })

    return res
        .status(201)
        .json(new ApiResponse(201, createdparkingLot, "Parking lot created successfully"))
})

const getAllParkingLots = asyncHandler(async (req: Request, res: Response) => {
    const parkingLots = await ParkingLots.find().sort({ createdAt: -1 })

    const lotsWithRealtimeCounts = await Promise.all(
        parkingLots.map(async (lot) => {
            const total = await ParkingSlots.countDocuments({ lotId: lot._id });
            const available = await ParkingSlots.countDocuments({ lotId: lot._id, status: "available" });
            const lotObj = lot.toObject();
            return {
                ...lotObj,
                totalSlots: total > 0 ? total : (lot.totalSlots || 0),
                availableSlots: Math.max(0, available),
            };
        })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, lotsWithRealtimeCounts, "Parking lots fetched Successfully"))
})

const getParkingLotById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const parkingLot = await ParkingLots.findById(id)

    if (!parkingLot) {
        throw new ApiError(404, "Parking lot not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, parkingLot, "Parking lot fetched successfully"))
})

const updateParkingLotDetails = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { lotName, address, totalFloors, slotsPerFloor, pricePerHour } = req.body

    const updatePayload: any = {}

    if (lotName) updatePayload.lotName = lotName
    if (address) updatePayload.address = address
    if (totalFloors !== undefined) {
        updatePayload.totalFloors = Number(totalFloors)
    }
    if (slotsPerFloor !== undefined) {
        updatePayload.slotsPerFloor = Number(slotsPerFloor)
    }
    if (pricePerHour !== undefined) {
        updatePayload.pricePerHour = Number(pricePerHour)
    }

    if (updatePayload.totalFloors !== undefined || updatePayload.slotsPerFloor !== undefined) {
        const lot = await ParkingLots.findById(id);
        const tf = updatePayload.totalFloors !== undefined ? updatePayload.totalFloors : lot?.totalFloors || 0;
        const sf = updatePayload.slotsPerFloor !== undefined ? updatePayload.slotsPerFloor : lot?.slotsPerFloor || 0;
        updatePayload.totalSlots = tf * sf;
    }

    if (Object.keys(updatePayload).length === 0) {
        throw new ApiError(400, "At least one field is required to update")
    }

    const updatedParkingLot = await ParkingLots.findByIdAndUpdate(
        id,
        { $set: updatePayload },
        { new: true, runValidators: true }
    )

    if (!updatedParkingLot) {
        throw new ApiError(404, "Parking lot not found")
    }

    // Real-time: broadcast updated lot to admin and users
    emitToAdmin("lot:updated", { lot: updatedParkingLot })

    return res
        .status(200)
        .json(new ApiResponse(200, updatedParkingLot, "Parking lot details updated successfully"))
})

const updateParkingLotImage = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const parkingLotImgLocalPath = req.file?.path

    if (!parkingLotImgLocalPath) {
        throw new ApiError(400, "Parking lot image is required")
    }

    const uploadedImage = await uploadOnCloudinary(parkingLotImgLocalPath)

    if (!uploadedImage?.url) {
        throw new ApiError(500, "Failed to upload parking lot image")
    }

    const updatedParkingLot = await ParkingLots.findByIdAndUpdate(
        id,
        { $set: { parkingLotImg: uploadedImage.url } },
        { new: true, runValidators: true }
    )

    if (!updatedParkingLot) {
        throw new ApiError(404, "Parking lot not found")
    }

    // Real-time: broadcast updated lot
    emitToAdmin("lot:updated", { lot: updatedParkingLot })

    return res
        .status(200)
        .json(new ApiResponse(200, updatedParkingLot, "Parking lot image updated successfully"))
})

const deleteParkingLot = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const deletedParkingLot = await ParkingLots.findByIdAndDelete(id)

    if (!deletedParkingLot) {
        throw new ApiError(404, "Parking lot not found")
    }

    // Real-time: broadcast deletion
    emitToAdmin("lot:deleted", { lotId: id })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Parking lot deleted successfully"))
})


export {
    createParkingLot,
    getAllParkingLots,
    getParkingLotById,
    updateParkingLotDetails,
    updateParkingLotImage,
    deleteParkingLot,
}
