// Main application entry point
import { config } from 'dotenv';
import createApp from './api/gateway/server';

// Load environment variables
config();

const PORT = process.env.PORT || 3000;

// Create Express application
const app = createApp();

// Start server
const server = app.listen(PORT, () => {
  console.log(`CertaintyAI server running on port ${PORT}`);
  console.log(
    `Health check available at http://localhost:${PORT}/health`
  );
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

export default app;
