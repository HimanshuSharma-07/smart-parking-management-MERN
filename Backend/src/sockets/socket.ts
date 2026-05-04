import { Server } from "socket.io"
import { Server as HttpServer } from "http"
import jwt from "jsonwebtoken"

let io: Server

const initSocket = (server: HttpServer) => {

    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || "http://localhost:5173",
            credentials: true,
        }
    })

    // JWT auth middleware on handshake
    io.use((socket, next) => {
        try {
            // Token can come from auth header or cookie string
            const token =
                (socket.handshake.auth?.token as string | undefined) ||
                parseCookieToken(socket.handshake.headers.cookie)

            if (!token) {
                // Allow unauthenticated connections but mark them
                socket.data.user = null
                return next()
            }

            const secret = process.env.ACCESS_TOKEN_SECRET
            if (!secret) return next(new Error("Server misconfigured"))

            const decoded = jwt.verify(token, secret) as { _id: string; role?: string }
            socket.data.user = decoded
            next()
        } catch {
            // Still allow connection; restricted rooms will check later
            socket.data.user = null
            next()
        }
    })

    io.on("connection", (socket) => {

        // Join a specific parking lot room (any authenticated user)
        socket.on("joinLot", (lotId: string) => {
            if (!socket.data.user) return
            socket.join(`lot:${lotId}`)
            
        })

        // Join user-specific room
        if (socket.data.user?._id) {
            socket.join(`user:${socket.data.user._id}`)
            
        }

        // Leave a specific parking lot room
        socket.on("leaveLot", (lotId: string) => {
            socket.leave(`lot:${lotId}`)
        })

        // Join the admin room (only admins)
        socket.on("joinAdmin", () => {
            if (socket.data.user?.role === "admin") {
                socket.join("admin")
                
            }
        })

        socket.on("disconnect", () => {
           
        })
    })
}

/** Parse accessToken from raw cookie header string */
function parseCookieToken(cookieHeader?: string): string | undefined {
    if (!cookieHeader) return undefined
    const match = cookieHeader.match(/accessToken=([^;]+)/)
    return match ? match[1] : undefined
}

const getIO = (): Server => {
    if (!io) throw new Error("Socket not initialized")
    return io
}

/** Emit an event to all sockets watching a specific parking lot */
const emitToLot = (lotId: string, event: string, data?: unknown) => {
    if (!io) return
    io.to(`lot:${lotId}`).emit(event, data)
}

/** Emit an event to all sockets in the admin room */
const emitToAdmin = (event: string, data?: unknown) => {
    if (!io) return
    io.to("admin").emit(event, data)
}

/** Emit an event to a specific user */
const emitToUser = (userId: string, event: string, data?: unknown) => {
    if (!io) return
    io.to(`user:${userId}`).emit(event, data)
}

export {
    initSocket,
    getIO,
    emitToLot,
    emitToAdmin,
    emitToUser,
}