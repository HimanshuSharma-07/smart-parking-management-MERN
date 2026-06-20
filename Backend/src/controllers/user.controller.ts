import { Request, Response } from "express"
import { asyncHandler } from "../utils/asyncHandler"
import { ApiError } from "../utils/ApiError"
import { User } from "../models/user.model"
import { uploadOnCloudinary } from "../utils/cloudinary"
import { ApiResponse } from "../utils/ApiResponse"
import { Types } from "mongoose"
import jwt, { JwtPayload } from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

declare global {
    namespace Express {
        interface Request {
            user?: any
        }
    }
}



const generateAccessAndRefreshToken = async (userId: string | Types.ObjectId) => {
    try {
        const user = await User.findById(userId)

        if (!user) {
            throw new ApiError(404, "User not found")
        }

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {
            accessToken,
            refreshToken
        }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler ( async (req: Request, res: Response) => {
    
    const {fullName, email, password, phoneNo} = req.body
    

    if (
        [fullName, email, password, phoneNo].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({email})

    if (existedUser) {
        throw new ApiError(409, "User with email is already existed")
    }

    
    const files = req.files as {
            profileImg?: Express.Multer.File[]
        }


        const profileImgLocalPath = files?.profileImg?.[0].path
        
        if (!profileImgLocalPath) {
            throw new ApiError(400, "Profile Image is required")
        }
        

    const profileImg = await uploadOnCloudinary(profileImgLocalPath)
    
    const user = await User.create({
        fullName,
        profileImg: profileImg?.url || "",
        email,
        password,
        phoneNo,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while regestering user")
    }

    

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered  Successfully")
    )
    

})

const loginUser = asyncHandler ( async (req: Request, res: Response) => {

    const {email, password} = req.body

    if (!email || !password) {
        throw new ApiError(400, "Email and password is requred")
    }
    
     const user = await User.findOne({email})

     if (!user) {
        throw new ApiError(401, "Invalid user credentials")
     }

     const isPasswordValid = await user.isPasswordCorrect(password)
        
     if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
     }

     const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

     const options = {
        httpOnly: true,
        secure: true
     }
     
     return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", refreshToken, options)
     .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User loggedIn Successfully"
        )
     )
    
})

const logoutUser = asyncHandler (async ( req: Request, res: Response) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }

    )

    const options = {
        httpOnly: true,
        secure: true
     }

     return res
     .status(200)
     .clearCookie("accessToken", options)
     .clearCookie("refreshToken", options)
     .json(new ApiResponse(200, {}, "User logged Out Successfully"))

})

const refreshAccessToken = asyncHandler ( async (req: Request, res: Response) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthroized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET as string
    
        ) as JwtPayload & { _id: string }
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        
        if (incomingRefreshToken !== user?.refreshToken ) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
        
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken},
                "Access token refreshed Successfully"
            )
        )
    } catch (error) {
        const message = (error instanceof Error && error.message) ? error.message : "Invalid refresh token";
        throw new ApiError(401, message);
    }

})

const changeCurrentPassword = asyncHandler ( async (req: Request, res: Response) => {
    
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed succefully"))

})

const getCurrentUser = asyncHandler( async (req: Request, res: Response) => {
    return res.status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched Succesfully"))
})

const updateAccountDetails = asyncHandler ( async (req: Request, res: Response) => {
    const {fullName, email, phoneNo} =  req.body

    if (!fullName && !email && !phoneNo) {
        throw new ApiError(400, "At least one field is required to update")
    }

    const updateFields: any = {}
    if (fullName) updateFields.fullName = fullName
    if (email) updateFields.email = email
    if (phoneNo) updateFields.phoneNo = phoneNo

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: updateFields
        },
        {new: true}
    ).select("-password")

    if (!user) {
        throw new ApiError(404, "user not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated Successfully"))
})

const updateUserProfileImg = asyncHandler ( async (req: Request, res: Response) => {
    const profileImgLocalPath = req.file?.path

    if (!profileImgLocalPath) {
        throw new ApiError(400, "ProfileImg file is missing")
    }

    const profileImg = await uploadOnCloudinary(profileImgLocalPath)

    if (!profileImg?.url) {
        throw new ApiError(400, "Error while uploading on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                profileImg: profileImg.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Profile image updated Successfully"

    ))

})

const googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { credential } = req.body

    if (!credential) {
        throw new ApiError(400, "Google credential is required")
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        })

        const payload = ticket.getPayload()
        if (!payload) {
            throw new ApiError(400, "Invalid Google token payload")
        }

        const { sub: googleId, email, name: fullName, picture: profileImg } = payload

        if (!email) {
            throw new ApiError(400, "Email not found in Google account")
        }

        let user = await User.findOne({ email })

        if (user) {
            // If user exists but doesn't have googleId, update it
            if (!user.googleId) {
                user.googleId = googleId
                if (profileImg && !user.profileImg) {
                    user.profileImg = profileImg
                }
                await user.save({ validateBeforeSave: false })
            }
        } else {
            // Create new user
            user = await User.create({
                fullName: fullName || "Google User",
                email,
                googleId,
                profileImg: profileImg || "",
                role: "user"
            })
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user: loggedInUser, accessToken, refreshToken
                    },
                    "User logged in with Google successfully"
                )
            )
    } catch (error: any) {
        throw new ApiError(401, error.message || "Google authentication failed")
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserProfileImg,
    googleLogin,

}