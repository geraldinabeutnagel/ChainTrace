import express from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { requireManufacturer } from '../middleware/auth';
import { ProductModel } from '../models/Product';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation middleware
const validateProduct = [
  body('name').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('category').notEmpty().trim(),
];

// Get all products
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, search } = req.query;
  
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  let products;
  if (search) {
    products = await ProductModel.search(search as string, parseInt(limit as string));
  } else if (category) {
    products = await ProductModel.findByCategory(category as string);
  } else {
    products = await ProductModel.findAll(parseInt(limit as string), offset);
  }

  const stats = await ProductModel.getStats();

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: stats.total,
        pages: Math.ceil(stats.total / parseInt(limit as string))
      }
    }
  });
}));

// Get product by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const product = await ProductModel.getWithBatches(parseInt(id));
  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Product not found'
      }
    });
  }

  res.json({
    success: true,
    data: product
  });
}));

// Create new product
router.post('/', requireManufacturer, validateProduct, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      }
    });
  }

  const { name, description, category, blockchain_address } = req.body;
  const manufacturer_id = (req as any).user.id;

  const product = await ProductModel.create({
    name,
    description,
    category,
    manufacturer_id,
    blockchain_address
  });

  logger.info(`Product created: ${product.name} by user ${manufacturer_id}`);

  res.status(201).json({
    success: true,
    data: product
  });
}));

// Update product
router.put('/:id', requireManufacturer, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, category, is_active } = req.body;
  const user_id = (req as any).user.id;

  // Check if product exists and user owns it
  const existingProduct = await ProductModel.findById(parseInt(id));
  if (!existingProduct) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Product not found'
      }
    });
  }

  if (existingProduct.manufacturer_id !== user_id) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'You can only update your own products'
      }
    });
  }

  const updatedProduct = await ProductModel.update(parseInt(id), {
    name,
    description,
    category,
    is_active
  });

  logger.info(`Product updated: ${id} by user ${user_id}`);

  res.json({
    success: true,
    data: updatedProduct
  });
}));

// Delete product
router.delete('/:id', requireManufacturer, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user_id = (req as any).user.id;

  // Check if product exists and user owns it
  const existingProduct = await ProductModel.findById(parseInt(id));
  if (!existingProduct) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Product not found'
      }
    });
  }

  if (existingProduct.manufacturer_id !== user_id) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'You can only delete your own products'
      }
    });
  }

  const success = await ProductModel.delete(parseInt(id));
  if (!success) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete product'
      }
    });
  }

  logger.info(`Product deleted: ${id} by user ${user_id}`);

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
}));

// Get product statistics
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const stats = await ProductModel.getStats();

  res.json({
    success: true,
    data: stats
  });
}));

export default router;
