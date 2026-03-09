import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Load your private key from the file system
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privateKeyPath = path.resolve(__dirname, '../../private_key.pem');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

// Define the exact structure of the data inside the token
interface LicensePayload {
    customerName: string;
    max_servers: number;
    exp: number; // Standard JWT claim for expiration (Unix Epoch in seconds)
}

/**
 * Generates a signed Root License Token.
 * @param customerName The name of the client
 * @param seats The maximum number of concurrent agents allowed
 * @param expiryDate A JavaScript Date object representing the exact cutoff time
 */
function generateLicense(customerName: string, seats: number, expiryDate: Date): string {
    // 1. Convert the exact JS Date to a Unix Epoch Timestamp (in seconds)
    const expEpochSeconds = Math.floor(expiryDate.getTime() / 1000);

    // 2. Build the exact payload
    const payload: LicensePayload = {
        customerName,
        max_servers: seats,
        exp: expEpochSeconds // Embed the epoch directly
    };

    // 3. Sign it with your Private Key
    // Note: We do NOT use the 'expiresIn' option here because we explicitly set 'exp' above.
    const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256'
    });

    console.log(`\n--- Root License for ${customerName} ---`);
    console.log(`Seats      : ${seats}`);
    console.log(`Expires At : ${expiryDate.toUTCString()}`);
    console.log(`Epoch (exp): ${expEpochSeconds}`);
    console.log(`\n${token}\n`);
    
    return token;
}

export default generateLicense;

// ==========================================
// EXAMPLE USAGE:
// ==========================================

// Define the exact expiration date (e.g., Midnight on December 31, 2026 UTC)
const contractEndDate = new Date('2026-12-31T23:59:59Z');
generateLicense("Acme Corp", 50, contractEndDate);