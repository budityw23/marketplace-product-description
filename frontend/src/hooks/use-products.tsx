import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './use-auth';
import toast from 'react-hot-toast';

export interface Product {
  id: string;
  title: string;
  price: number;
  attributes: Record<string, any>;
  imageUrl?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  aiContents: AIContent[];
}

export interface AIContent {
  id: string;
  description?: string;
  keywords?: string;
  category?: string;
  model: string;
  language: string;
  createdAt: string;
}

export interface ProductFormData {
  title: string;
  price: number;
  attributes: Record<string, any>;
  imageUrl?: string;
  category?: string;
}

export const useProducts = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (search?: string, page = 1, limit = 10) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/products?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProducts(response.data.items);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch products';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createProduct = useCallback(async (data: ProductFormData): Promise<Product | null> => {
    if (!token) return null;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/products`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const newProduct = response.data;
      setProducts(prev => [newProduct, ...prev]);
      toast.success('Product created successfully');
      return newProduct;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create product';
      toast.error(errorMessage);
      throw err;
    }
  }, [token]);

  const updateProduct = useCallback(async (id: string, data: Partial<ProductFormData>): Promise<Product | null> => {
    if (!token) return null;

    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/products/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const updatedProduct = response.data;
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
      toast.success('Product updated successfully');
      return updatedProduct;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update product';
      toast.error(errorMessage);
      throw err;
    }
  }, [token]);

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    if (!token) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/products/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete product';
      toast.error(errorMessage);
      throw err;
    }
  }, [token]);

  const getProduct = useCallback(async (id: string): Promise<Product | null> => {
    if (!token) return null;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/products/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch product';
      toast.error(errorMessage);
      throw err;
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token, fetchProducts]);

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProduct,
  };
};