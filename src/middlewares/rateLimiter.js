const rateLimit = require("express-rate-limit");

/**
 * Rate limiter untuk endpoint kirim pesan ke AI chatbot.
 *
 * Limit: 20 pesan per 30 menit per session.
 *
 * Strategi key per-session (bukan per-IP) karena:
 * - Satu user bisa buka banyak session paralel
 * - Konsisten dengan model data chat_sessions
 * - Lebih granular dan fair untuk user
 *
 * Storage: in-memory (default).
 * - Cukup untuk single-instance Railway
 * - Counter akan reset saat container restart (acceptable untuk skala TA)
 * - Kalau scale ke multi-instance, ganti store ke Redis (rate-limit-redis)
 */
const chatMessageLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 menit
    max: 80,                  // max 20 request per window per session
    standardHeaders: true,    // kirim header RateLimit-* (RFC standard)
    legacyHeaders: false,     // matikan X-RateLimit-* (legacy)

    // Key per session dari URL param /api/chat/sessions/:id/messages
    keyGenerator: (req) => {
        return `chat-session-${req.params.id}`;
    },

    // Custom response saat limit terlampaui
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Terlalu banyak pesan dikirim ke AI dalam waktu singkat. Silakan tunggu beberapa menit sebelum mencoba lagi.",
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
            limit: req.rateLimit.limit,
            remaining: req.rateLimit.remaining,
        });
    },

    skipFailedRequests: false,
    skipSuccessfulRequests: false,
});

module.exports = {
    chatMessageLimiter,
};