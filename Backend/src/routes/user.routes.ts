import { Router } from "express";
import { registerUser, loginUser, googleLogin, logoutUser, refreshAccessToken, updateAccountDetails, getCurrentUser, updateUserProfileImg } from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";
import { verifyJWT } from "../middlewares/auth.middleware";


const router = Router()


router.route("/register").post(
    upload.fields([
        {
            name: "profileImg",
            maxCount: 1,
        },
    ]),
    registerUser
)

router.route("/login").post(loginUser)
router.route("/google-login").post(googleLogin)

//secured routes
router.route("/logout").post(verifyJWT ,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-details").patch(verifyJWT, updateAccountDetails)
router.route("/update-profile-img").patch(verifyJWT, upload.single("profileImg"), updateUserProfileImg)





export default router