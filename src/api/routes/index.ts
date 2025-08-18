import { Router } from 'express';
import verifyRoutes from './verify';
import resultsRoutes from './results';
import feedbackRoutes from './feedback';

const router = Router();

// Mount route modules
router.use('/verify', verifyRoutes);
router.use('/results', resultsRoutes);
router.use('/feedback', feedbackRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'CertaintyAI API',
    version: '1.0.0',
    description: 'Enterprise AI hallucination detection system',
    endpoints: {
      verify: 'POST /api/v1/verify',
      batchVerify: 'POST /api/v1/verify/batch',
      results: 'GET /api/v1/results/:verificationId',
      feedback: 'POST /api/v1/feedback',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
