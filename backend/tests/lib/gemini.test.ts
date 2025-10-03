// Mock the entire @google/generative-ai module
const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        }),
      };
    }),
  };
});

import { generateProductContent, GenerateContentRequest } from '../../src/lib/gemini';

describe('generateProductContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate content successfully for English', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify({
          description: 'This is a great product description.',
          keywords: ['keyword1', 'keyword2', 'keyword3'],
          category: 'Electronics'
        })
      }
    };

    mockGenerateContent.mockResolvedValue(mockResponse);

    const request: GenerateContentRequest = {
      title: 'Test Product',
      attributes: { brand: 'TestBrand', color: 'Blue' },
      language: 'en'
    };

    const result = await generateProductContent(request);

    expect(result).toEqual({
      description: 'This is a great product description.',
      keywords: ['keyword1', 'keyword2', 'keyword3'],
      category: 'Electronics'
    });

    expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('Create an attractive and SEO-friendly product description'));
  });

  it('should generate content successfully for Indonesian', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify({
          description: 'Ini adalah deskripsi produk yang hebat.',
          keywords: ['kata kunci1', 'kata kunci2'],
          category: 'Elektronik'
        })
      }
    };

    mockGenerateContent.mockResolvedValue(mockResponse);

    const request: GenerateContentRequest = {
      title: 'Produk Test',
      attributes: { merek: 'TestMerek' },
      language: 'id'
    };

    const result = await generateProductContent(request);

    expect(result).toEqual({
      description: 'Ini adalah deskripsi produk yang hebat.',
      keywords: ['kata kunci1', 'kata kunci2'],
      category: 'Elektronik'
    });

    expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('Buat deskripsi produk yang menarik dan SEO-friendly'));
  });

  it('should handle empty attributes', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify({
          description: 'Product description without attributes.',
          keywords: ['test'],
          category: 'General'
        })
      }
    };

    mockGenerateContent.mockResolvedValue(mockResponse);

    const request: GenerateContentRequest = {
      title: 'Test Product',
      language: 'en'
    };

    const result = await generateProductContent(request);

    expect(result.description).toBe('Product description without attributes.');
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('No specific attributes'));
  });

  it('should throw error for invalid JSON response', async () => {
    const mockResponse = {
      response: {
        text: () => 'Invalid JSON response'
      }
    };

    mockGenerateContent.mockResolvedValue(mockResponse);

    const request: GenerateContentRequest = {
      title: 'Test Product',
      language: 'en'
    };

    await expect(generateProductContent(request)).rejects.toThrow('Failed to generate content with AI');
  });

  it('should throw error for missing required fields in JSON', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify({
          description: 'Missing keywords and category'
        })
      }
    };

    mockGenerateContent.mockResolvedValue(mockResponse);

    const request: GenerateContentRequest = {
      title: 'Test Product',
      language: 'en'
    };

    await expect(generateProductContent(request)).rejects.toThrow('Failed to generate content with AI');
  });

  it('should throw error when Gemini API fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Error'));

    const request: GenerateContentRequest = {
      title: 'Test Product',
      language: 'en'
    };

    await expect(generateProductContent(request)).rejects.toThrow('Failed to generate content with AI');
  });

  it('should trim whitespace from response fields', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify({
          description: '  Description with spaces  ',
          keywords: ['  keyword1  ', ' keyword2 '],
          category: ' Category '
        })
      }
    };

    mockGenerateContent.mockResolvedValue(mockResponse);

    const request: GenerateContentRequest = {
      title: 'Test Product',
      language: 'en'
    };

    const result = await generateProductContent(request);

    expect(result).toEqual({
      description: 'Description with spaces',
      keywords: ['keyword1', 'keyword2'],
      category: 'Category'
    });
  });
});