import { ParkingLots } from "../models/parkingLot.model";
import { ParkingSlots } from "../models/parkingSlots.model";
import { Booking } from "../models/booking.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { emitToLot, emitToAdmin } from "../sockets/socket";

const createParkingSlot = asyncHandler ( async (req: Request, res: Response) => {

    const lotId = req.params.lotId as string
    const { slotNumber, floor, type, pricePerHour } = req.body


    const parkingLot = await ParkingLots.findById(lotId)

    if (!parkingLot) {
        throw new ApiError(404, "Parking Lot not found")
    }

    if(!slotNumber || !floor || !type ){
        throw new ApiError(400, "All fields are required")
    } 

    if (pricePerHour && pricePerHour < 0) {
        throw new ApiError(400, "Price per hour must be positive")
    }

    const existingSlot = await ParkingSlots.findOne({
        slotNumber,
        lotId
    })

    if (existingSlot) {
        throw new ApiError(409, "Slot number already exists in this parking lot")
    }
    
    const createdParkingSlot = await ParkingSlots.create({
        slotNumber,
        floor,
        type,
        status: "available",
        pricePerHour,
        lotId
    })

    // Increment aggregate counts in ParkingLot
    await ParkingLots.findByIdAndUpdate(lotId, {
        $inc: { totalSlots: 1, availableSlots: 1 }
    })

    // Real-time: notify users viewing this lot
    emitToLot(lotId as string, "slot:created", { slot: createdParkingSlot, lotId })
    
    return res
    .status(201)
    .json(
        new ApiResponse(201, createdParkingSlot, "Parking Slot created Successfully")
    )
})

const createBulkParkingSlots = asyncHandler(async (req: Request, res: Response) => {

    const lotId = req.params.lotId as string
    const { floors, startFloor, slotsPerFloor, type, pricePerHour } = req.body

    const parkingLot = await ParkingLots.findById(lotId)

    if (!parkingLot) {
        throw new ApiError(404, "Parking lot not found")
    }

    if (!floors || !slotsPerFloor) {
        throw new ApiError(400, "Floors and slotsPerFloor are required")
    }

    if (floors <= 0 || slotsPerFloor <= 0) {
        throw new ApiError(400, "Floors and slotsPerFloor must be greater than 0")
    }

    if (pricePerHour && pricePerHour < 0) {
        throw new ApiError(400, "Price per hour must be positive")
    }

    const sFloor = Number(startFloor) || 1
    const nFloors = Number(floors)
    const nSlotsPerFloor = Number(slotsPerFloor)

    const slots = []

    for (let currentFloor = sFloor; currentFloor < sFloor + nFloors; currentFloor++) {
        const existingSlotsOnFloor = await ParkingSlots.countDocuments({ lotId, floor: currentFloor })
        
        for (let sIndex = 1; sIndex <= nSlotsPerFloor; sIndex++) {
            const slotNumberIndex = existingSlotsOnFloor + sIndex
            slots.push({
                slotNumber: `F${currentFloor}-S${slotNumberIndex}`,
                floor: currentFloor,
                type,
                status: "available",
                pricePerHour,
                lotId
            })
        }
    }

    const createdSlots = await ParkingSlots.insertMany(slots)

    // Increment aggregate counts in ParkingLot
    await ParkingLots.findByIdAndUpdate(lotId, {
        $inc: { totalSlots: createdSlots.length, availableSlots: createdSlots.length }
    })

    // Real-time: notify users viewing this lot
    emitToLot(lotId as string, "slot:created", { slots: createdSlots, lotId, bulk: true })

    return res.status(201).json(
        new ApiResponse(201, createdSlots, "Parking slots created successfully")
    )
})

const getAllParkingSlots = asyncHandler( async (req: Request, res: Response) => {
    
    const { lotId } = req.params

    const parkingSlots = await ParkingSlots
        .find({ lotId })
        .sort({ createdAt: -1 })

    return res
    .status(200)
    .json(
        new ApiResponse(200, parkingSlots, "Parking slots fetched Succesfully")
    )
})

const getParkingSlotById = asyncHandler( async (req: Request, res: Response) => {
    
    const { slotId } = req.params

    const parkingSlot = await ParkingSlots.findById(slotId)

    if (!parkingSlot) {
        throw new ApiError(404, 'Parking slot not found')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, parkingSlot, "Parking slot fetched Successfully")
    )
})

const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {

    const { lotId } = req.params

    const parkingLot = await ParkingLots.findById(lotId)

    if (!parkingLot) {
        throw new ApiError(404, "Parking lot not found")
    }

    const parkingSlots = await ParkingSlots.find({
        lotId,
        status: "available"
    }).sort({ slotNumber : 1})

    return res.status(200).json(
        new ApiResponse(200, parkingSlots, "Available slots fetched")
    )
})

const updateSlotStatus = asyncHandler(async (req: Request, res: Response) => {

    const { slotId } = req.params
    const { status } = req.body

    const allowedStatus = ["available", "occupied", "reserved", "maintenance"]

    if (!allowedStatus.includes(status)) {
        throw new ApiError(400, "Invalid slot status")
    }

    const parkingSlot = await ParkingSlots.findById(slotId)

    if (!parkingSlot) {
        throw new ApiError(404, "Parking slot not found")
    }

    if (parkingSlot.status === status) {
        return res.status(200).json(
            new ApiResponse(200, parkingSlot, "Slot already in this status")
        )
    }

    const previousStatus = parkingSlot.status
    

    parkingSlot.status = status
    await parkingSlot.save()

    if (previousStatus === "available" && status !== "available") {
        await ParkingLots.findByIdAndUpdate(parkingSlot.lotId, {
            $inc: { availableSlots: -1 }
        })
    }

    if (previousStatus !== "available" && status === "available") {
        await ParkingLots.findByIdAndUpdate(parkingSlot.lotId, {
            $inc: { availableSlots: 1 }
        })
    }

    // Real-time: push status change to lot room
    const lotId = parkingSlot.lotId?.toString()
    if (lotId) {
        emitToLot(lotId, "slot:statusUpdate", {
            slotId: parkingSlot._id.toString(),
            status,
            lotId,
        })
    }

    return res.status(200).json(
        new ApiResponse(200, parkingSlot, "Slot status updated successfully")
    )
})

const updateParkingSlotDetails = asyncHandler( async (req: Request, res: Response) => {
    
    const { slotId } = req.params
    const {slotNumber, floor, type, pricePerHour} = req.body

    if (!slotNumber && !floor && !type && !pricePerHour) {
        throw new ApiError(400, " At least one field is required to update")
    }

    const updatedParkingSlot = await ParkingSlots.findByIdAndUpdate(
            slotId,
            {
                $set:{
                    slotNumber,
                    floor,
                    type,
                    pricePerHour
                }
            },
            {new: true}
    )
    
    if (!updatedParkingSlot) {
        throw new ApiError(404, "Parking slot not found")
    }

    // Real-time: push detail update to lot room
    const lotId = updatedParkingSlot.lotId?.toString()
    if (lotId) {
        emitToLot(lotId, "slot:updated", { slot: updatedParkingSlot, lotId })
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedParkingSlot, "Parking slot details updated Successfully")
    )

})

const deleteParkingSlot = asyncHandler ( async (req: Request, res: Response) => {
    
    const { slotId } = req.params

    const deletedParkingSlot = await ParkingSlots.findByIdAndDelete(slotId)

    if (!deletedParkingSlot) {
        throw new ApiError(404, "Parking slot not found")
    }

    // Decrement aggregate counts in ParkingLot
    const updateQuery: any = { $inc: { totalSlots: -1 } }
    if (deletedParkingSlot.status === "available") {
        updateQuery.$inc.availableSlots = -1
    }

    await ParkingLots.findByIdAndUpdate(deletedParkingSlot.lotId, updateQuery)

    // Real-time: push deletion to lot room
    const lotId = deletedParkingSlot.lotId?.toString()
    if (lotId) {
        emitToLot(lotId, "slot:deleted", { slotId, lotId })
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Parking slot deleted Successfully")
    )
})

const deleteFloorSlots = asyncHandler(async (req: Request, res: Response) => {
    const lotId = req.params.lotId as string;
    const floor = req.params.floor;
    const floorNum = Number(floor);

    const parkingLot = await ParkingLots.findById(lotId);
    if (!parkingLot) {
        throw new ApiError(404, "Parking lot not found");
    }

    // Identify all slots on this floor
    const slotsOnFloor = await ParkingSlots.find({ lotId, floor: floorNum });
    if (slotsOnFloor.length === 0) {
        throw new ApiError(404, "No slots found on this floor");
    }

    const slotIds = slotsOnFloor.map(s => s._id);

    // Safety Check: Check for active or reserved bookings on these slots
    const activeBookingsCount = await Booking.countDocuments({
        slotId: { $in: slotIds },
        bookingStatus: { $in: ["active", "reserved"] }
    });

    if (activeBookingsCount > 0) {
        throw new ApiError(400, "Cannot delete floor: active or reserved bookings exist on this floor.");
    }

    // Perform deletion
    const availableSlotsOnFloor = slotsOnFloor.filter(s => s.status === "available").length;
    await ParkingSlots.deleteMany({ _id: { $in: slotIds } });

    // Update aggregate counts in ParkingLot
    await ParkingLots.findByIdAndUpdate(lotId, {
        $inc: { 
            totalSlots: -slotsOnFloor.length, 
            availableSlots: -availableSlotsOnFloor 
        }
    });

    // Real-time: notify users
    emitToLot(lotId, "slot:deleted", { floor: floorNum, lotId, bulk: true });

    return res.status(200).json(
        new ApiResponse(200, {}, `All ${slotsOnFloor.length} slots on Floor ${floorNum} deleted successfully`)
    );
});

export {
    createParkingSlot,
    createBulkParkingSlots,
    getAllParkingSlots,
    getParkingSlotById,
    getAvailableSlots,
    updateSlotStatus,
    updateParkingSlotDetails,
    deleteParkingSlot,
    deleteFloorSlots
}