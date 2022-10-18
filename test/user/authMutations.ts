import { gql } from 'apollo-server-express';

export const loginMutation = gql`
  mutation Mutation($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      accessToken
    }
  }
`;

export const logoutMutation = gql`
  mutation Mutation {
    logout {
      message
    }
  }
`;
