'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProducts, Product, ProductFormData } from '@/hooks/use-products';
import { useAI } from '@/hooks/use-ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { ProductGridSkeleton } from '@/components/ui/loading-skeleton';
import ProtectedRoute from '@/components/protected-route';
import { Plus, Edit, Trash2, Sparkles, Download, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.number().positive('Price must be positive'),
  attributes: z.any().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  category: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

const ProductCard = ({
  product,
  onEdit,
  onDelete,
  onGenerateAI
}: {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onGenerateAI: (product: Product) => void;
}) => {
  const latestAI = product.aiContents?.[0];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
            <CardDescription className="mt-1">
              ${product.price.toFixed(2)}
              {product.category && ` • ${product.category}`}
            </CardDescription>
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(product)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(product.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {latestAI && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">AI Generated Content:</p>
              <p className="line-clamp-3 text-xs">{latestAI.description}</p>
              {latestAI.keywords && (
                <p className="text-xs mt-1 text-blue-600">
                  Keywords: {JSON.parse(latestAI.keywords).join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onGenerateAI(product)}
            className="flex-1"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Generate AI
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const { products, loading, createProduct, updateProduct, deleteProduct } = useProducts();
  const { generating, generateContentForProduct } = useAI();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [aiContent, setAiContent] = useState({
    description: '',
    keywords: '',
    category: '',
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  const handleCreateProduct = async (data: ProductForm) => {
    try {
      await createProduct({
        ...data,
        attributes: data.attributes || {},
        imageUrl: data.imageUrl || undefined,
        category: data.category || undefined,
      });
      setIsCreateModalOpen(false);
      reset();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleEditProduct = async (data: ProductForm) => {
    if (!editingProduct) return;

    try {
      await updateProduct(editingProduct.id, {
        ...data,
        attributes: data.attributes || {},
        imageUrl: data.imageUrl || undefined,
        category: data.category || undefined,
      });
      setEditingProduct(null);
      reset();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  const handleGenerateAI = async (product: Product) => {
    setSelectedProduct(product);
    setIsAIModalOpen(true);

    try {
      const result = await generateContentForProduct(product.id, 'en');
      if (result) {
        setAiContent({
          description: result.description,
          keywords: result.keywords.join(', '),
          category: result.category,
        });
      }
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleSaveAIContent = async () => {
    if (!selectedProduct) return;

    try {
      await updateProduct(selectedProduct.id, {
        category: aiContent.category || selectedProduct.category,
      });
      setIsAIModalOpen(false);
      setSelectedProduct(null);
      setAiContent({ description: '', keywords: '', category: '' });
      toast.success('AI content saved successfully');
    } catch (error) {
      toast.error('Failed to save AI content');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/export/products.csv`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setValue('title', product.title);
    setValue('price', product.price);
    setValue('attributes', product.attributes || {});
    setValue('imageUrl', product.imageUrl || '');
    setValue('category', product.category || '');
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Welcome back, {user?.email}
                </p>
              </div>
              <div className="flex gap-4">
                <Button onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
                <Button onClick={logout} variant="outline">
                  Sign out
                </Button>
              </div>
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <ProductGridSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={openEditModal}
                    onDelete={handleDeleteProduct}
                    onGenerateAI={handleGenerateAI}
                  />
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No products found</p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first product
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Create Product Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            reset();
          }}
          title="Create New Product"
        >
          <form onSubmit={handleSubmit(handleCreateProduct)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input {...register('title')} placeholder="Product title" />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <Input
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Input {...register('category')} placeholder="Product category" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <Input {...register('imageUrl')} placeholder="https://..." />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Product Modal */}
        <Modal
          isOpen={!!editingProduct}
          onClose={() => {
            setEditingProduct(null);
            reset();
          }}
          title="Edit Product"
        >
          <form onSubmit={handleSubmit(handleEditProduct)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input {...register('title')} placeholder="Product title" />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <Input
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Input {...register('category')} placeholder="Product category" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <Input {...register('imageUrl')} placeholder="https://..." />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingProduct(null);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Product'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* AI Content Modal */}
        <Modal
          isOpen={isAIModalOpen}
          onClose={() => {
            setIsAIModalOpen(false);
            setSelectedProduct(null);
            setAiContent({ description: '', keywords: '', category: '' });
          }}
          title="AI Generated Content"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full p-3 border rounded-md resize-none"
                rows={6}
                value={aiContent.description}
                onChange={(e) => setAiContent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="AI-generated description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Keywords</label>
              <Input
                value={aiContent.keywords}
                onChange={(e) => setAiContent(prev => ({ ...prev, keywords: e.target.value }))}
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Input
                value={aiContent.category}
                onChange={(e) => setAiContent(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Product category"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAIModalOpen(false);
                  setSelectedProduct(null);
                  setAiContent({ description: '', keywords: '', category: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveAIContent} disabled={generating}>
                {generating ? 'Generating...' : 'Save Content'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}