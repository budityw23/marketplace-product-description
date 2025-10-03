import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GenerateContentRequest {
  title: string;
  attributes?: Record<string, any>;
  language: 'en' | 'id';
}

export interface GenerateContentResponse {
  description: string;
  keywords: string[];
  category: string;
}

export async function generateProductContent({
  title,
  attributes = {},
  language = 'en'
}: GenerateContentRequest): Promise<GenerateContentResponse> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Build attributes string
  const attributesStr = Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  // Create prompt based on language
  const prompt = language === 'id'
    ? `Buat deskripsi produk yang menarik dan SEO-friendly untuk produk berikut:

Judul: ${title}
Atribut: ${attributesStr || 'Tidak ada atribut spesifik'}

Tolong berikan:
1. Deskripsi produk yang detail dan persuasif (200-300 kata)
2. 5-8 kata kunci SEO yang relevan
3. Kategori produk yang tepat

Format respons sebagai JSON:
{
  "description": "deskripsi lengkap di sini",
  "keywords": ["kata kunci 1", "kata kunci 2", ...],
  "category": "kategori produk"
}`
    : `Create an attractive and SEO-friendly product description for the following product:

Title: ${title}
Attributes: ${attributesStr || 'No specific attributes'}

Please provide:
1. A detailed and persuasive product description (200-300 words)
2. 5-8 relevant SEO keywords
3. An appropriate product category

Format response as JSON:
{
  "description": "full description here",
  "keywords": ["keyword 1", "keyword 2", ...],
  "category": "product category"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (!parsed.description || !Array.isArray(parsed.keywords) || !parsed.category) {
      throw new Error('Invalid response structure');
    }

    return {
      description: parsed.description.trim(),
      keywords: parsed.keywords.map((k: string) => k.trim()),
      category: parsed.category.trim(),
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate content with AI');
  }
}