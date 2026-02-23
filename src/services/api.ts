import { Product, Category, Stats, CartItem } from '../types';

export const api = {
  async fetchProducts(): Promise<Product[]> {
    const res = await fetch('/api/products');
    return res.json();
  },

  async fetchCategories(): Promise<Category[]> {
    const res = await fetch('/api/categories');
    return res.json();
  },

  async fetchStats(): Promise<Stats> {
    const res = await fetch('/api/stats');
    return res.json();
  },

  async checkout(items: CartItem[], total: number): Promise<any> {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, total })
    });
    if (!res.ok) throw new Error('Checkout failed');
    return res.json();
  },

  async saveProduct(product: Partial<Product>): Promise<any> {
    const method = product.id ? 'PUT' : 'POST';
    const url = product.id ? `/api/products/${product.id}` : '/api/products';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (res.status === 409) {
      const data = await res.json();
      throw { type: 'conflict', data };
    }
    if (!res.ok) throw new Error('Save product failed');
    return res.json();
  },

  async deleteProduct(id: number): Promise<void> {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete product failed');
  },

  async saveCategory(category: Partial<Category>): Promise<any> {
    const method = category.id ? 'PUT' : 'POST';
    const url = category.id ? `/api/categories/${category.id}` : '/api/categories';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category)
    });
    if (res.status === 409) {
      const data = await res.json();
      throw { type: 'conflict', data };
    }
    if (!res.ok) throw new Error('Save category failed');
    return res.json();
  },

  async deleteCategory(id: number): Promise<void> {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete category failed');
    }
  },

  async fetchProductHistory(id: number): Promise<any[]> {
    const res = await fetch(`/api/products/${id}/history`);
    if (!res.ok) throw new Error('Fetch history failed');
    return res.json();
  }
};
