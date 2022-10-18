import { gql } from 'apollo-server-express';

export const addUserMutation = gql`
  mutation AddUser($addUserInput: AddUserInput!) {
    addUser(addUserInput: $addUserInput) {
      id
      name
      email
      isAdmin
    }
  }
`;

export const updateUserProfileMutation = gql`
  mutation UpdateUserProfile($updateBody: UpdateUserProfileInput!) {
    updateUserProfile(updateBody: $updateBody) {
      id
      name
      email
      isAdmin
    }
  }
`;

export const deleteUserMutation = gql`
  mutation DeleteUser($userId: String!) {
    deleteUser(userId: $userId) {
      message
    }
  }
`;

export const updateUserMutation = gql`
  mutation UpdateUser($updateBody: UpdateUserInput!, $userId: String!) {
    updateUser(updateBody: $updateBody, userId: $userId) {
      id
      name
      email
      isAdmin
    }
  }
`;
