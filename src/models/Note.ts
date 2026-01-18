import mongoose, { Schema, Model } from "mongoose";

export interface Note {
    id: string;
    userId: string;
    title: string;
    content: string;
    updatedAt: Date;
    createdAt: Date;
}

const NoteSchema = new Schema<Note>(
    {
        userId: { type: String, required: true },
        title: { type: String, required: true, default: "Untitled Note" },
        content: { type: String, default: "" },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

NoteSchema.virtual('id').get(function (this: any) {
    return this._id.toHexString();
});

const NoteModel: Model<Note> = mongoose.models.Note || mongoose.model<Note>("Note", NoteSchema);

export default NoteModel;
