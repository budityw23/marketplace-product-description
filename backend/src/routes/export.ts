import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as fastCsv from 'fast-csv';

const router = Router();
const prisma = new PrismaClient();

// Validation schema for query parameters
const exportQuerySchema = z.object({
  search: z.string().optional(),
});

interface ExportRow {
  title: string;
  price: string;
  category: string;
  attributes: string;
  description: string;
  keywords: string;
}

// GET /export/products.csv - Export user's products with AI content as CSV
router.get('/products.csv', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { search } = exportQuerySchema.parse(req.query);

    // Query products with AI content
    const products = await prisma.product.findMany({
      where: {
        userId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { category: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      },
      include: {
        aiContents: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get the latest AI content
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Handle empty results
    if (products.length === 0) {
      return res.status(200).json({
        message: 'No products found to export',
        count: 0
      });
    }

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');

    // Transform products data to CSV rows
    const csvData: ExportRow[] = products.map(product => {
      const latestAIContent = product.aiContents[0]; // Latest AI content

      return {
        title: product.title,
        price: product.price.toString(),
        category: product.category || '',
        attributes: product.attributes ? JSON.stringify(product.attributes) : '',
        description: latestAIContent?.description || '',
        keywords: latestAIContent?.keywords || '',
      };
    });

    // Create CSV stream
    const csvStream = fastCsv.write(csvData, {
      headers: ['title', 'price', 'category', 'attributes', 'description', 'keywords']
    });

    // Pipe CSV stream to response
    csvStream.pipe(res);

    // Handle stream errors
    csvStream.on('error', (error) => {
      console.error('CSV stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate CSV' });
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.issues });
    }
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export products' });
  }
});

export default router;