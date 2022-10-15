import { registerDecorator, ValidationOptions } from 'class-validator';

export function isValidPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPassword',
      target: object.constructor,
      propertyName: propertyName,
      constraints: ['password'],
      options: validationOptions,
      validator: {
        validate(password: any) {
          const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%])/;
          return passwordRegex.test(password);
        },
      },
    });
  };
}
