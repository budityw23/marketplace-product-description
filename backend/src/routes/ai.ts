import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateProductContent, GenerateContentRequest } from '../lib/gemini';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const router = Router();
const prisma = new PrismaClient();

// Rate limiter: 5 requests per day per user
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'ai_generation',
  points: 5, // Number of requests
  duration: 24 * 60 * 60, // Per 24 hours
});

// Validation schemas
const generateSchema = z.object({
  title: z.string().min(1),
  attributes: z.any().optional(),
  language: z.enum(['en', 'id']).default('en'),
});

const generateWithProductSchema = z.object({
  language: z.enum(['en', 'id']).default('en'),
});

// POST /ai/generate - Generate content from scratch
router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Check rate limit
    try {
      await rateLimiter.consume(userId);
    } catch (rejRes: any) {
      const msBeforeNext = Math.round(rejRes.msBeforeNext / 1000) || 1;
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many AI generations. Try again in ${Math.ceil(msBeforeNext / 3600)} hours.`,
        retryAfter: msBeforeNext,
      });
    }

    const data = generateSchema.parse(req.body);

    // Generate content with Gemini
    const aiContent = await generateProductContent(data);

    // Save to database
    const savedContent = await prisma.aIContent.create({
      data: {
        description: aiContent.description,
        keywords: JSON.stringify(aiContent.keywords),
        category: aiContent.category,
        model: 'gemini',
        language: data.language,
      },
    });

    console.log(`AI generation completed for user ${userId}: ${savedContent.id}`);

    res.json({
      ...aiContent,
      id: savedContent.id,
      createdAt: savedContent.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate AI content' });
  }
});

// POST /ai/generate/:productId - Generate content for existing product
router.post('/generate/:productId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user!.userId;

    // Check rate limit
    try {
      await rateLimiter.consume(userId);
    } catch (rejRes: any) {
      const msBeforeNext = Math.round(rejRes.msBeforeNext / 1000) || 1;
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many AI generations. Try again in ${Math.ceil(msBeforeNext / 3600)} hours.`,
        retryAfter: msBeforeNext,
      });
    }

    const data = generateWithProductSchema.parse(req.body);

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    // Generate content using product data
    const generateData: GenerateContentRequest = {
      title: product.title,
      attributes: product.attributes as Record<string, any> || {},
      language: data.language,
    };

    const aiContent = await generateProductContent(generateData);

    // Save to database linked to product
    const savedContent = await prisma.aIContent.create({
      data: {
        description: aiContent.description,
        keywords: JSON.stringify(aiContent.keywords),
        category: aiContent.category,
        model: 'gemini',
        language: data.language,
        productId,
      },
    });

    // Update product category if not set
    if (!product.category && aiContent.category) {
      await prisma.product.update({
        where: { id: productId },
        data: { category: aiContent.category },
      });
    }

    console.log(`AI generation completed for product ${productId} by user ${userId}: ${savedContent.id}`);

    res.json({
      ...aiContent,
      id: savedContent.id,
      createdAt: savedContent.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate AI content' });
  }
});

export default router;