"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Main application entry point
const dotenv_1 = require("dotenv");
const server_1 = __importDefault(require("./api/gateway/server"));
// Load environment variables
(0, dotenv_1.config)();
const PORT = process.env.PORT || 3000;
// Create Express application
const app = (0, server_1.default)();
// Start server
const server = app.listen(PORT, () => {
    console.log(`CertaintyAI server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`API documentation at http://localhost:${PORT}/api/v1`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=index.js.map