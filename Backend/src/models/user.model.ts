import {Schema, model, Document} from "mongoose";
import jwt  from "jsonwebtoken"
import bcrypt from "bcrypt"



export interface IUser extends Document {
    fullName: string;
    email: string;
    password?: string;
    phoneNo?: string;
    profileImg?: string;
    role: "user" | "admin";
    googleId?: string;
    refreshToken?: string;
    isPasswordCorrect(password: string): boolean;
    generateAccessToken(): string;
    generateRefreshToken(): string;

}

const userSchema = new Schema<IUser>  ( 
    {
        fullName: {
            type: String,
            required: true,
            trim: true   
        },
        email: {
            type: String,
            required:true,
            unique: true,
            lowercase: true,
            trim: true
        },
        phoneNo: {
            type: String,
            required: false
        },
        password: {
            type: String,
            required: false
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true
        },
        profileImg: {
            type: String,
            
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },
        refreshToken: {
            type: String,
        }

    }, {timestamps: true}
)

userSchema.pre("save", async function () {
    if(!this.isModified("password") || !this.password) return

    this.password = await bcrypt.hash(this.password, 10);
})

userSchema.methods.isPasswordCorrect = async function (password: string) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password) 
};

userSchema.methods.generateAccessToken = function (): string {
  return jwt.sign(
    { 
      _id: this._id,
      email: this.email,
      role: this.role
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: "1d",
    }
  )
}

userSchema.methods.generateRefreshToken = function(): string {
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET as string,
        {
            expiresIn: "10d",
        }
    )
}

export const User = model<IUser>("User", userSchema)



