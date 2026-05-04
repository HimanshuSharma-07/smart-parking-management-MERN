import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

app.use((req, res, next) => {
    next();
});


//routes import
import userRouter from "./routes/user.routes"
import parkingLotRouter from "./routes/parkingLot.routes"
import parkingSlotRouter from "./routes/parkingSlots.routes"
import bookingRouter from "./routes/booking.routes"
import vehicleRouter from "./routes/vehicle.route"
import paymentRouter from "./routes/payment.routes"
import adminRouter from "./routes/admin.routes"

//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/parking-lots", parkingLotRouter)
app.use("/api/v1/parking-slots", parkingSlotRouter)
app.use("/api/v1/bookings", bookingRouter)
app.use("/api/v1/vehicle", vehicleRouter)
app.use("/api/v1/payment", paymentRouter)
app.use("/api/v1/admin", adminRouter)



app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.stack) console.log(err.stack);

    const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
    const message = err.message || "Something went wrong";
    
    // Very simple response
    res.status(statusCode).json({
        success: false,
        message,
        error: String(err)
    });
});

export default app