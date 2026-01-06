import mongoose, { Schema, Model } from "mongoose";

export interface Note {
    id: string;
    userId: string;
    content: string;
    updatedAt: Date;
}

const NoteSchema = new Schema<Note>(
    {
        userId: { type: String, required: true, unique: true }, // One note document per user for simplicity as requested ("Simple page... type notes")
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
