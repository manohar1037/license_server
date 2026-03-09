import mongoose, { Document, Schema } from 'mongoose';

// 1. The Root License (Uploaded by the Admin)
export interface IRootLicense extends Document {
    rootKey: string;
    maxSeats: number;
    expiresAt: number;
    uploadedAt: Date;
}

const RootLicenseSchema: Schema = new Schema({
    rootKey: { type: String, required: true, unique: true },
    maxSeats: { type: Number, required: true },
    expiresAt: { type: Number, required: true }, 
    uploadedAt: { type: Date, default: Date.now }
});

// 2. The Active Seats (Claimed by the Rust Agents)
export interface IActiveSeat extends Document {
    hwid: string;
    lastCheckout: number;
}

const ActiveSeatSchema: Schema = new Schema({
    hwid: { type: String, required: true },
    lastCheckout: { type: Number, default: Date.now }
});

// Composite unique index on licenseId + hwid to allow same hwid on different licenses
// ActiveSeatSchema.index({ licenseId: 1, hwid: 1 }, { unique: true });

export const RootLicense = mongoose.model<IRootLicense>('RootLicense', RootLicenseSchema);
export const ActiveSeat = mongoose.model<IActiveSeat>('ActiveSeat', ActiveSeatSchema);