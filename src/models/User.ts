import mongoose, { Schema, Model } from "mongoose";
import { User } from "@/lib/mockData";

// Extends the User interface for Mongoose document properties if needed, 
// strictly we just need to match the Shape.

const UserSchema = new Schema<User>(
    {
        // We can use a custom ID or let Mongo generate _id, 
        // but the app expects a string `id`. We'll map _id to id in the actions.
        username: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        role: { type: String, enum: ["admin", "user"], default: "user" },
        password: { type: String, required: true }, // In production, hash this!
    },
    {
        timestamps: true,
    }
);

// Prevent overwriting model if already compiled (Next.js hot reload)
const UserModel: Model<User> = mongoose.models.User || mongoose.model<User>("User", UserSchema);

export default UserModel;
