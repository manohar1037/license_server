import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { RootLicense, ActiveSeat } from '../models/License.js';
import generateLicense from '../vendor/generateRootKey.js';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
// Load YOUR public key to verify the Root License they upload
const publicKeyPath = path.resolve(__dirname, '../../public_key.pem');
const VENDOR_PUBLIC_KEY = fs.readFileSync(publicKeyPath, 'utf8');

// The Local Server needs its own secret to issue short-lived tokens to the Agents
const LOCAL_APP_SECRET = process.env.LOCAL_SECRET || "fallback_local_secret";

// --- 1. ADMIN ENDPOINT: Upload the Root License ---
router.post('/admin/upload-license', async (req: Request, res: Response): Promise<void> => {
    const { root_key } = req.body;

    if (!root_key) {
        res.status(400).json({ error: "root_key is required" });
        return;
    }

    try {
        // Verify the token was signed by YOUR private key
        const decoded = jwt.verify(root_key, VENDOR_PUBLIC_KEY, { algorithms: ['RS256'] }) as jwt.JwtPayload;



        // Clear old licenses and save the new one
        await RootLicense.deleteMany({});
        await ActiveSeat.deleteMany({});
        const newLicense = new RootLicense({
            rootKey: root_key,
            maxSeats: decoded.max_seats,
            expiresAt: new Date((decoded.exp as number) * 1000)
        });
        await newLicense.save();

        res.json({ message: `License installed successfully for ${decoded.max_seats} seats.` });
    } catch (err) {
        res.status(400).json({ error: "Invalid or expired Root License.", details: (err as Error).message });
    }
});

// --- 2. AGENT ENDPOINT: Checkout a Seat ---
router.post('/agent/checkout', async (req: Request, res: Response): Promise<void> => {
    const { hwid } = req.body;


    console.log("Checkout request received:", { hwid });

    if (!hwid) {
        res.status(400).json({ error: "Agent HWID is required" });
        return;
    }

    try {
        const license = await RootLicense.findOne();

        if (!license) {
            res.status(403).json({ error: "No root license installed on this server." });
            return;
        }

        if (new Date().getTime() > license.expiresAt) {
            res.status(403).json({ error: "The Root License has expired." });
            return;
        }

        let seat = await ActiveSeat.findOne({ hwid });

        console.log("Current active seat for HWID:", seat);
        // If it's a new machine, check seat limits
        if (!seat) {
            const currentSeats = await ActiveSeat.countDocuments();

            console.log(`Current active seats: ${currentSeats}, Max seats allowed: ${license.maxSeats}`);
            if (currentSeats >= license.maxSeats) {
                res.status(402).json({ error: "Maximum seat limit reached." });
                return;
            }
            seat = new ActiveSeat({ hwid });
        }

        seat.lastCheckout = new Date().getTime();
        await seat.save();
        console.log("Seat saved successfully in MongoDB");

        const agentToken = jwt.sign({ hwid, license: license.rootKey.trim() }, LOCAL_APP_SECRET, { expiresIn: '24h' });

        console.log("agent tokennn,", agentToken);

        res.json({
            message: "Seat granted.",
            token: agentToken.trim(),
        });
    } catch (err) {
        console.error("CRITICAL ERROR during checkout:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/generate-root-license', (req: Request, res: Response): void => {
    try {
        const { customerName, max_seats, expiryDate } = req.body;

        if (!customerName || !max_seats || !expiryDate) {
            res.status(400).json({
                error: "customerName, max_seats, and expiryDate are required"
            });
            return;
        }

        const expiry = new Date(expiryDate);

        const token = generateLicense(customerName, max_seats, expiry);

        res.json({
            message: "License generated",
            token
        });

    } catch (err) {
        res.status(500).json({
            error: "Failed to generate license"
        });
    }
});
export default router;