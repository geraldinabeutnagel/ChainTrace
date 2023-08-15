import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  manufacturer_id: number;
  blockchain_address?: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface ProductCreate {
  name: string;
  description: string;
  category: string;
  manufacturer_id: number;
  blockchain_address?: string;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}

export class ProductModel {
  private static tableName = 'products';

  static async create(productData: ProductCreate): Promise<Product> {
    try {
      const [product] = await db(this.tableName)
        .insert({
          ...productData,
          created_at: new Date(),
          updated_at: new Date(),
          is_active: true,
        })
        .returning('*');
      
      logger.info(`Product created with ID: ${product.id}`);
      return product;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  static async findById(id: number): Promise<Product | null> {
    try {
      const product = await db(this.tableName)
        .where({ id, is_active: true })
        .first();
      
      return product || null;
    } catch (error) {
      logger.error('Error finding product by ID:', error);
      throw error;
    }
  }

  static async findByManufacturer(manufacturerId: number): Promise<Product[]> {
    try {
      const products = await db(this.tableName)
        .where({ manufacturer_id: manufacturerId, is_active: true })
        .orderBy('created_at', 'desc');
      
      return products;
    } catch (error) {
      logger.error('Error finding products by manufacturer:', error);
      throw error;
    }
  }

  static async findByCategory(category: string): Promise<Product[]> {
    try {
      const products = await db(this.tableName)
        .where({ category, is_active: true })
        .orderBy('created_at', 'desc');
      
      return products;
    } catch (error) {
      logger.error('Error finding products by category:', error);
      throw error;
    }
  }

  static async findAll(limit: number = 50, offset: number = 0): Promise<Product[]> {
    try {
      const products = await db(this.tableName)
        .where({ is_active: true })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);
      
      return products;
    } catch (error) {
      logger.error('Error finding all products:', error);
      throw error;
    }
  }

  static async update(id: number, updateData: ProductUpdate): Promise<Product | null> {
    try {
      const [product] = await db(this.tableName)
        .where({ id })
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning('*');
      
      if (product) {
        logger.info(`Product updated with ID: ${id}`);
      }
      
      return product || null;
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  static async delete(id: number): Promise<boolean> {
    try {
      const result = await db(this.tableName)
        .where({ id })
        .update({ is_active: false, updated_at: new Date() });
      
      logger.info(`Product soft deleted with ID: ${id}`);
      return result > 0;
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  static async search(query: string, limit: number = 50): Promise<Product[]> {
    try {
      const products = await db(this.tableName)
        .where({ is_active: true })
        .andWhere(function() {
          this.where('name', 'ilike', `%${query}%`)
            .orWhere('description', 'ilike', `%${query}%`)
            .orWhere('category', 'ilike', `%${query}%`);
        })
        .orderBy('created_at', 'desc')
        .limit(limit);
      
      return products;
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  static async getStats(): Promise<{
    total: number;
    active: number;
    byCategory: Array<{ category: string; count: number }>;
  }> {
    try {
      const [totalResult] = await db(this.tableName).count('* as count');
      const [activeResult] = await db(this.tableName)
        .where({ is_active: true })
        .count('* as count');
      
      const byCategory = await db(this.tableName)
        .select('category')
        .count('* as count')
        .where({ is_active: true })
        .groupBy('category')
        .orderBy('count', 'desc');
      
      return {
        total: parseInt(totalResult.count as string),
        active: parseInt(activeResult.count as string),
        byCategory: byCategory.map(item => ({
          category: item.category,
          count: parseInt(item.count as string)
        }))
      };
    } catch (error) {
      logger.error('Error getting product stats:', error);
      throw error;
    }
  }

  static async getWithBatches(id: number): Promise<Product & { batches: any[] } | null> {
    try {
      const product = await this.findById(id);
      if (!product) return null;

      const batches = await db('batches')
        .where({ product_id: id, is_active: true })
        .orderBy('created_at', 'desc');

      return { ...product, batches };
    } catch (error) {
      logger.error('Error getting product with batches:', error);
      throw error;
    }
  }
}
