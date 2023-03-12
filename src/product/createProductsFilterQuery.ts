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

  const priceLimitFilter =
    minPriceLimit && maxPriceLimit
      ? {
          price: {
            $gte: minPriceLimit,
            $lte: maxPriceLimit,
          },
        }
      : minPriceLimit
      ? {
          price: {
            $gte: minPriceLimit,
          },
        }
      : maxPriceLimit
      ? {
          price: {
            $lte: maxPriceLimit,
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
    ...priceLimitFilter,
    ...minRatingFilter,
  };

  return filterRegex;
}

export default createProductsFilterQuery;
