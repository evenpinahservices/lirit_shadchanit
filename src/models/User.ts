import mongoose, { Schema, Model } from "mongoose";
import { User } from "@/lib/mockData";

// Extends the User interface for Mongoose document properties if needed, 
// strictly we just need to match the Shape.

const UserSchema = new Schema<User>(
    {
        username: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        role: { type: String, enum: ["admin", "user"], default: "user" },
        password: { type: String, required: true },
        dbName: { type: String },
        email: { type: String, sparse: true },
        phone: { type: String },
        profilePhotoUrl: { type: String },
    },
    {
        timestamps: true,
    }
);

// Prevent overwriting model if already compiled (Next.js hot reload)
const UserModel: Model<User> = mongoose.models.User || mongoose.model<User>("User", UserSchema);

export default UserModel;
