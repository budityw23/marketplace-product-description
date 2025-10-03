import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createProductSchema = z.object({
  title: z.string().min(1),
  price: z.number().positive(),
  attributes: z.any().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial();

const querySchema = z.object({
  page: z.string().transform(Number).refine(n => n > 0).optional(),
  limit: z.string().transform(Number).refine(n => n > 0 && n <= 100).optional(),
  search: z.string().optional(),
});

// GET /products - List user's products with pagination and search
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10, search } = querySchema.parse(req.query);
    const userId = req.user!.userId;

    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { category: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          aiContents: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Latest AI content
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      items: products,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.issues });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /products - Create new product
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = createProductSchema.parse(req.body);
    const userId = req.user!.userId;

    const product = await prisma.product.create({
      data: {
        ...data,
        userId,
        attributes: data.attributes as any,
      },
      include: {
        aiContents: true,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /products/:id - Get single product
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const product = await prisma.product.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        aiContents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /products/:id - Update product
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateProductSchema.parse(req.body);
    const userId = req.user!.userId;

    const product = await prisma.product.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        attributes: data.attributes as any,
      },
      include: {
        aiContents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.json(updatedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /products/:id - Delete product
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const product = await prisma.product.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;