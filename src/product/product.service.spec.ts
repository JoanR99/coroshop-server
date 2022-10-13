import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { ProductService } from './product.service';
import { Product } from './product.model';
import { ADD_PRODUCT_INPUT } from '../../test/utils/constants';
import { Types } from 'mongoose';

describe('Product Service', () => {
  let productService: ProductService;
  let productModel: ReturnModelType<typeof Product>;

  const productDTO = {
    ...ADD_PRODUCT_INPUT,
    createdBy: 'user-id' as any,
    rating: 0,
    numReviews: 0,
  };

  const id = '63482cd0316e058ac32adfe8';

  const keywordRegex = {
    name: {
      $regex: 'productName',
      $options: 'i',
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [ProductService],
    })
      .useMocker((token) => {
        if (token === getModelToken(Product.name)) {
          return {
            findById: jest.fn().mockResolvedValue(productDTO),
            create: jest.fn().mockResolvedValue(productDTO),
            findByIdAndDelete: jest.fn().mockResolvedValue(productDTO),
            findByIdAndUpdate: jest.fn().mockResolvedValue(productDTO),
            countDocuments: jest.fn().mockResolvedValue(1),
            find: jest.fn().mockResolvedValue([]),
          };
        }
      })
      .compile();

    productService = moduleFixture.get<ProductService>(ProductService);
    productModel = moduleFixture.get<ReturnModelType<typeof Product>>(
      getModelToken(Product.name),
    );
  });

  it('should be defined', () => {
    expect(productService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const product = await productService.create(productDTO);
      expect(product).toMatchObject(productDTO);
      expect(productModel.create).toHaveBeenCalledWith(productDTO);
    });
  });

  describe('findById', () => {
    it('should find a product', async () => {
      const product = await productService.findById(id);
      expect(product).toMatchObject(productDTO);
      expect(productModel.findById).toHaveBeenCalledWith(
        new Types.ObjectId(id),
      );
    });
  });

  describe('deleteById', () => {
    it('should delete a product', async () => {
      await productService.deleteById(id);
      expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(
        new Types.ObjectId(id),
      );
    });
  });

  describe('findByIdAndUpdate', () => {
    it('should update a product', async () => {
      const product = await productService.findByIdAndUpdate(id, productDTO);
      expect(product).toMatchObject(productDTO);
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { ...productDTO },
        { new: true },
      );
    });
  });

  describe('countByRegex', () => {
    it('should count products by regex', async () => {
      const count = await productService.countByRegex(keywordRegex);
      expect(count).toBe(1);
      expect(productModel.countDocuments).toHaveBeenCalledWith({
        ...keywordRegex,
      });
    });
  });

  describe('findByRegex', () => {
    it('should find products by regex', async () => {
      const products = await productService.findByRegex(keywordRegex);
      expect(products).toMatchObject([]);
      expect(productModel.find).toHaveBeenCalledWith(keywordRegex);
    });
  });
});
