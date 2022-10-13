import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { ADD_PRODUCT_INPUT } from '../../test/utils/constants';
import { ProductResolver } from './product.resolver';
import { UserService } from '../user/user.service';
import { AuthService } from '../user/auth.service';

describe('Product Service', () => {
  let productResolver: ProductResolver;
  let productService: ProductService;
  let userService: UserService;

  const productDTO = {
    ...ADD_PRODUCT_INPUT,
    createdBy: 'user-id' as any,
    rating: 0,
    numReviews: 0,
  };

  const id = '63482cd0316e058ac32adfe8';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [ProductResolver],
    })
      .useMocker((token) => {
        if (token === ProductService) {
          return {
            findById: jest
              .fn()
              .mockImplementation((productId) =>
                productId === id ? productDTO : null,
              ),
            deleteById: jest.fn(),
            create: jest.fn().mockResolvedValue(productDTO),
            findByIdAndUpdate: jest
              .fn()
              .mockImplementation((productId) =>
                productId === id ? productDTO : null,
              ),
            countByRegex: jest.fn().mockResolvedValue(3),
            findByRegex: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            skip: jest
              .fn()
              .mockResolvedValue(['product1', 'product1', 'product1']),
          };
        }
        if (token === UserService) {
          return {
            findById: jest.fn().mockResolvedValue({ id }),
          };
        }
        if (token === AuthService) {
          return {};
        }
      })
      .compile();
    productResolver = moduleFixture.get<ProductResolver>(ProductResolver);
    productService = moduleFixture.get<ProductService>(ProductService);
    userService = moduleFixture.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(productResolver).toBeDefined();
  });

  describe('getProducts', () => {
    it('should get products with pagination data', async () => {
      const getProductsData = await productResolver.getProducts({
        pageNumber: 1,
        pageSize: 1,
        keyword: '',
      });

      expect(getProductsData).toMatchObject({
        products: ['product1', 'product1', 'product1'],
        page: 1,
        pages: 3,
      });
      expect(productService.countByRegex).toHaveBeenCalledWith({});
      expect(productService.findByRegex).toHaveBeenCalledWith({});
    });
  });

  describe('getProduct', () => {
    it('should get product', async () => {
      const product = await productResolver.getProduct(id);
      expect(product).toMatchObject(productDTO);
      expect(productService.findById).toHaveBeenCalledWith(id);
    });

    it('should throw error if product not not found', async () => {
      await expect(
        productResolver.getProduct('63482cd0316e058ac32adfe2'),
      ).rejects.toThrowError();
    });
  });

  describe('addProduct', () => {
    it('should add a product', async () => {
      const product = await productResolver.addProduct(productDTO, id);
      expect(product).toMatchObject(productDTO);
      expect(productService.create).toHaveBeenCalledWith({
        ...productDTO,
        createdBy: id,
      });
      expect(userService.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      const response = await productResolver.deleteProduct(id);
      expect(response).toMatchObject({
        message: 'Product deleted',
      });
      expect(productService.findById).toHaveBeenCalledWith(id);
      expect(productService.deleteById).toHaveBeenCalledWith(id);
    });

    it('should throw error if product not not found', async () => {
      await expect(
        productResolver.deleteProduct('63482cd0316e058ac32adfe2'),
      ).rejects.toThrowError();
    });
  });

  describe('updateProduct', () => {
    it('should update a product', async () => {
      const product = await productResolver.updateProduct(productDTO, id);
      expect(product).toMatchObject(productDTO);
      expect(productService.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        productDTO,
      );
    });
    it('should throw error if product not not found', async () => {
      await expect(
        productResolver.updateProduct(productDTO, '63482cd0316e058ac32adfe2'),
      ).rejects.toThrowError();
    });
  });
});
