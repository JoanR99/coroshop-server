# Coroshop Backend

Coroshop is a tech e-commerce with administrator options to add, edit or delete products, allowing users to write reviews and pay through PayPal or Stripe.

&nbsp;

## Links

- [Repo](https://github.com/JoanR99/coroshop-server 'Coroshop Backend repo')
- [Frontend](https://github.com/JoanR99/coroshop-client 'Coroshop Frontend repo')
- [Live Demo](https://coroshop-client.vercel.app/ 'Live View')

&nbsp;

## Screenshots

![Home Page](/screenshots/coroshop.png 'Home Page')

![Login Page](/screenshots/cs-2.png 'Login Page')

![Products Page](/screenshots/cs-3.png 'Products Page')

![Product Page](/screenshots/cs-5.png 'Product Page')

&nbsp;

## Stack

![Node] ![Typescript] ![Nest] ![GraphQL] ![MongoDb]

Coroshop was developed with Node.js, Typescript and Nest.js framework, using Mongoose as ODM for a MongoDB database. I choose Nest as the framework because it works by default with TypeScript, allowing the creation of more scalable, testable, and maintainable APIs, and promoting a structure with a good separation of responsibilities. Also, I choose to work with GraphQL instead of a REST API because it is composed of a typed query language that complements very well with TypeScript and generates the API documentation automatically. Finally, I use MongoDB as the database because of its flexibility in defining models and because it's perfect for handling large amounts of data as it scales more cheaply than a relational database.

&nbsp;

## How to install and run

### Prerequisites

1. You need to have Node.js installed in your machine.
2. MongoDB database.
3. PayPal client ID.
4. Stripe secret key.

### Installation

1. Clone the repo

   ```sh
   git clone https://github.com/JoanR99/coroshop-server.git
   ```

2. Go to file

   ```sh
   cd coroshop-server
   ```

3. Install dependencies

   ```sh
   npm install
   ```

4. Add a .env file in the root directory with variables "MONGO_URI_DEV" with the MongoDB URL you want to use, "PAYPAL_CLIENT_ID" with your PayPal client id, "STRIPE_SECRET_KEY" with your Stripe secret key and "ACCESS_TOKEN_SECRET" and "REFRESH_TOKEN_SECRET" with random strings.

5. Build app.

   ```sh
   npm run build
   ```

6. Start server.

   ```sh
   npm run start:prod
   ```

&nbsp;

## Author

**Joan Romero**

- [Profile](https://github.com/JoanR99 'Github Joan Romero')
- [Email](mailto:romerojoan1999@gmail.com?subject=Hi 'Hi!')
- [Linkedin](https://www.linkedin.com/in/joanr99/ 'Linkedin Joan Romero')
- [Portfolio](https://portfolio-joan-romero.vercel.app/ 'Portfolio Joan Romero')

[node]: https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white
[typescript]: https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white
[nest]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[graphql]: https://img.shields.io/badge/-GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white
[mongodb]: https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white
