import { gql } from 'apollo-server-express';

export const getReviewsQuery = gql`
  query GetReviews($productId: String!) {
    getReviews(productId: $productId) {
      id
      comment
      rating
      author
      authorName
    }
  }
`;
