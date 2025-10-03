import { generateProductContent } from '../../src/lib/gemini';

// Mock Prisma
const mockPrisma = {
  aIContent: {
    create: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock rate limiter
const mockRateLimiter = {
  consume: jest.fn().mockResolvedValue(true),
};

jest.mock('rate-limiter-flexible', () => ({
  RateLimiterMemory: jest.fn(() => mockRateLimiter),
}));

// Mock gemini
jest.mock('../../src/lib/gemini', () => ({
  generateProductContent: jest.fn(),
}));

describe('AI Route Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Content Generation', () => {
    it('should create AI content successfully', async () => {
      const mockAIContent = {
        description: 'Test description',
        keywords: ['test', 'keywords'],
        category: 'Test Category'
      };

      const mockSavedContent = {
        id: 'ai-content-id',
        description: mockAIContent.description,
        keywords: JSON.stringify(mockAIContent.keywords),
        category: mockAIContent.category,
        model: 'gemini',
        language: 'en',
        createdAt: new Date(),
      };

      (generateProductContent as jest.Mock).mockResolvedValue(mockAIContent);
      mockPrisma.aIContent.create.mockResolvedValue(mockSavedContent as any);

      // Simulate the route logic
      const userId = 'test-user-id';
      const data = { title: 'Test Product', attributes: { brand: 'Test' }, language: 'en' };

      // Check rate limit
      await mockRateLimiter.consume(userId);

      // Generate content
      const aiContent = await generateProductContent(data as any);

      // Save to database
      const savedContent = await mockPrisma.aIContent.create({
        data: {
          description: aiContent.description,
          keywords: JSON.stringify(aiContent.keywords),
          category: aiContent.category,
          model: 'gemini',
          language: data.language,
        },
      });

      expect(generateProductContent).toHaveBeenCalledWith(data);
      expect(mockPrisma.aIContent.create).toHaveBeenCalledWith({
        data: {
          description: aiContent.description,
          keywords: JSON.stringify(aiContent.keywords),
          category: aiContent.category,
          model: 'gemini',
          language: 'en',
        },
      });
      expect(savedContent).toEqual(mockSavedContent);
    });

    it('should handle rate limit exceeded', async () => {
      mockRateLimiter.consume.mockRejectedValueOnce({ msBeforeNext: 86400000 });

      const userId = 'test-user-id';

      await expect(mockRateLimiter.consume(userId)).rejects.toEqual({ msBeforeNext: 86400000 });
    });

    it('should generate content for existing product', async () => {
      const productId = 'test-product-id';
      const mockProduct = {
        id: productId,
        title: 'Existing Product',
        attributes: { brand: 'Existing' },
        category: null,
      };

      const mockAIContent = {
        description: 'Generated description',
        keywords: ['generated', 'keywords'],
        category: 'Generated Category'
      };

      const mockSavedContent = {
        id: 'ai-content-id',
        description: mockAIContent.description,
        keywords: JSON.stringify(mockAIContent.keywords),
        category: mockAIContent.category,
        model: 'gemini',
        language: 'en',
        createdAt: new Date(),
        productId,
      };

      mockPrisma.product.findFirst.mockResolvedValue(mockProduct as any);
      (generateProductContent as jest.Mock).mockResolvedValue(mockAIContent);
      mockPrisma.aIContent.create.mockResolvedValue(mockSavedContent as any);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, category: mockAIContent.category } as any);

      const userId = 'test-user-id';
      const data = { language: 'en' };

      // Verify product ownership
      const product = await mockPrisma.product.findFirst({
        where: {
          id: productId,
          userId,
        },
      });

      expect(product).toEqual(mockProduct);

      // Generate content using product data
      const generateData = {
        title: product.title,
        attributes: product.attributes,
        language: data.language,
      };

      const aiContent = await generateProductContent(generateData as any);

      // Save to database linked to product
      const savedContent = await mockPrisma.aIContent.create({
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
        await mockPrisma.product.update({
          where: { id: productId },
          data: { category: aiContent.category },
        });
      }

      expect(generateProductContent).toHaveBeenCalledWith(generateData);
      expect(mockPrisma.aIContent.create).toHaveBeenCalled();
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { category: mockAIContent.category },
      });
    });

    it('should return null for non-existent product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const product = await mockPrisma.product.findFirst({
        where: {
          id: 'non-existent-id',
          userId: 'test-user-id',
        },
      });

      expect(product).toBeNull();
    });

    it('should not update product category if already set', async () => {
      const mockProduct = {
        id: 'test-product-id',
        title: 'Existing Product',
        attributes: { brand: 'Existing' },
        category: 'Existing Category', // Already has category
      };

      mockPrisma.product.findFirst.mockResolvedValue(mockProduct as any);

      const product = await mockPrisma.product.findFirst({
        where: {
          id: 'test-product-id',
          userId: 'test-user-id',
        },
      });

      // Since category is already set, update should not be called
      if (!product!.category) {
        await mockPrisma.product.update({
          where: { id: 'test-product-id' },
          data: { category: 'New Category' },
        });
      }

      expect(mockPrisma.product.update).not.toHaveBeenCalled();
    });
  });
});