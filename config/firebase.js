// config/firebase.js
// Firebase Admin SDK – initialized once and reused across the app
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let firebaseApp = null;

export function initFirebase() {
    if (admin.apps.length > 0) {
        firebaseApp = admin.apps[0];
        return; // already initialized
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountPath) {
        console.warn(
            "⚠️  FIREBASE_SERVICE_ACCOUNT not set in .env — push notifications disabled"
        );
        return;
    }

    try {
        const absolutePath = resolve(__dirname, "..", serviceAccountPath);
        const serviceAccount = JSON.parse(readFileSync(absolutePath, "utf8"));

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        console.log("🔥 Firebase Admin SDK initialized successfully");
    } catch (err) {
        console.error("❌ Firebase initialization failed:", err.message);
    }
}

/**
 * Send a DATA-ONLY FCM push notification to one or more device tokens.
 *
 * WHY data-only (no "notification" key)?
 * → Android FCM auto-displays a "notification" message but cannot add action
 *   buttons. By sending data-only, Flutter intercepts the message in both
 *   foreground AND background/killed state and renders a local notification
 *   that DOES support "Mark as Done" / "Extend 30 Minutes" action buttons.
 *
 * @param {string[]} tokens     FCM device tokens
 * @param {string}   title      Notification title (sent in data payload)
 * @param {string}   body       Notification body  (sent in data payload)
 * @param {object}   extraData  Extra key-value pairs for the Flutter handler
 */
export async function sendPushNotification(tokens, title, body, extraData = {}) {
    if (!firebaseApp || tokens.length === 0) return { success: 0, failed: 0 };

    const messaging = admin.messaging();
    let success = 0;
    let failed = 0;
    const invalidTokens = [];

    for (const token of tokens) {
        try {
            await messaging.send({
                token,
                // ── DATA-ONLY: no "notification" key ──────────────────────────────
                // Flutter's onMessage / onBackgroundMessage receives this and renders
                // a local notification with custom action buttons.
                data: {
                    title,
                    body,
                    ...Object.fromEntries(
                        Object.entries(extraData).map(([k, v]) => [k, String(v)])
                    ),
                },
                android: {
                    priority: "high",          // Wake device even in Doze mode
                    directBootOk: true,
                },
                apns: {
                    headers: {
                        "apns-priority": "10",   // High priority on iOS
                    },
                    payload: {
                        aps: {
                            "content-available": 1, // iOS background delivery
                        },
                    },
                },
            });
            success++;
        } catch (err) {
            failed++;
            const code = err.code || "";
            if (
                code === "messaging/registration-token-not-registered" ||
                code === "messaging/invalid-registration-token"
            ) {
                invalidTokens.push(token);
            }
            console.error(`❌ FCM failed for …${token.slice(-8)}: ${err.message}`);
        }
    }

    return { success, failed, invalidTokens };
}

export default admin;
