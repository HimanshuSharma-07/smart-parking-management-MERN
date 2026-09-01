import dotenv from "dotenv"
dotenv.config({
    path: './.env'
})
import connectDB from "./db/index"
import app from "./app"
import { ParkingSlots } from "./models/parkingSlots.model"
import http from "http"
import { initSocket } from "./sockets/socket"


const server = http.createServer(app)

initSocket(server)

connectDB()
.then(async () => {
    try {
        const result = await ParkingSlots.updateMany({ type: "regular" }, { $set: { type: "standard" } });
        if (result.modifiedCount > 0) {
            console.log(`🔧 Repaired ${result.modifiedCount} corrupted parking slots`);
        }
    } catch (e) {
        console.error("Failed to repair slots", e);
    }

    server.listen(process.env.PORT || 4000, () => {
        console.log(`⚙️   Server is listening at port ${process.env.PORT || 4000}`)
        
    })
})
.catch((err) => {
    console.log("MongoDB connection failed !!!", err)
})
