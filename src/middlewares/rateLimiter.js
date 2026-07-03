const rateLimit = require("express-rate-limit");

// rate limiter untuk endpoint chat messages, limit per session (per session id)
const chatMessageLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 menit
    max: 80,                  // max 80 request per window per session
    standardHeaders: true,    // kirim header RateLimit-* (RFC standard)
    legacyHeaders: false,     // matikan X-RateLimit-* (legacy)

    // key per session dari URL param /api/chat/sessions/:id/messages
    keyGenerator: (req) => {
        return `chat-session-${req.params.id}`;
    },

    // custom response saat limit terlampaui
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