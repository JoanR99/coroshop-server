type Input = {
  keyword?: string;
  category?: string;
  maxPriceLimit?: number;
  minPriceLimit?: number;
  minRating?: number;
};

function createProductsFilterQuery({
  keyword,
  category,
  maxPriceLimit,
  minPriceLimit,
  minRating,
}: Input) {
  const keywordRegex = keyword
    ? {
        name: {
          $regex: keyword,
          $options: 'i',
        },
      }
    : {};

  const categoryRegex = category
    ? {
        category: {
          $regex: category,
          $options: 'i',
        },
      }
    : {};

  const maxPriceLimitFilter = maxPriceLimit
    ? {
        price: {
          $lt: maxPriceLimit,
        },
      }
    : {};

  const minPriceLimitFilter = minPriceLimit
    ? {
        price: {
          $gt: minPriceLimit,
        },
      }
    : {};

  const minRatingFilter = minRating
    ? {
        rating: {
          $gt: minRating,
        },
      }
    : {};

  const filterRegex = {
    ...keywordRegex,
    ...categoryRegex,
    ...maxPriceLimitFilter,
    ...minPriceLimitFilter,
    ...minRatingFilter,
  };

  return filterRegex;
}

export default createProductsFilterQuery;
