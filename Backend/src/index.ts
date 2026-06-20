import dotenv from "dotenv"
dotenv.config({
    path: './.env'
})
import connectDB from "./db/index"
import app from "./app"
import http from "http"
import { initSocket } from "./sockets/socket"
import { cleanupExpiredBookings } from "./controllers/booking.controller"

const server = http.createServer(app)

initSocket(server)

connectDB()
.then(() => {
    server.listen(process.env.PORT || 4000, () => {
        console.log(`⚙️   Server is listening at port ${process.env.PORT || 4000}`)
        
        // Start background cleanup task (every 5 minutes)
        setInterval(() => {
            cleanupExpiredBookings();
        }, 5 * 60 * 1000);
        console.log("🕒  Background cleanup task scheduled.");
    })
})
.catch((err) => {
    console.log("MongoDB connection failed !!!", err)
})
