import { useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './use-auth';
import toast from 'react-hot-toast';

export interface AIGenerationRequest {
  title: string;
  attributes?: Record<string, any>;
  language?: 'en' | 'id';
}

export interface AIGenerationResponse {
  description: string;
  keywords: string[];
  category: string;
  id: string;
  createdAt: string;
}

export const useAI = () => {
  const { token } = useAuth();
  const [generating, setGenerating] = useState(false);

  const generateContent = useCallback(async (data: AIGenerationRequest): Promise<AIGenerationResponse | null> => {
    if (!token) return null;

    setGenerating(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/generate`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      toast.success('AI content generated successfully');
      return response.data;
    } catch (err: any) {
      let errorMessage = 'Failed to generate AI content';

      if (err.response?.status === 429) {
        errorMessage = err.response.data.message || 'Rate limit exceeded. Please try again later.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      toast.error(errorMessage);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [token]);

  const generateContentForProduct = useCallback(async (productId: string, language: 'en' | 'id' = 'en'): Promise<AIGenerationResponse | null> => {
    if (!token) return null;

    setGenerating(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/generate/${productId}`,
        { language },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      toast.success('AI content generated for product');
      return response.data;
    } catch (err: any) {
      let errorMessage = 'Failed to generate AI content for product';

      if (err.response?.status === 429) {
        errorMessage = err.response.data.message || 'Rate limit exceeded. Please try again later.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      toast.error(errorMessage);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [token]);

  return {
    generating,
    generateContent,
    generateContentForProduct,
  };
};