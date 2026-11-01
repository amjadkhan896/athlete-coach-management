import { registerDecorator, ValidationOptions } from 'class-validator';

/** Validates an IANA time zone name such as "Asia/Dubai". */
export function IsTimeZone(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isTimeZone',
      target: target.constructor,
      propertyName: propertyName as string,
      options: { message: '$property must be a valid IANA time zone, e.g. Asia/Dubai', ...options },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          try {
            new Intl.DateTimeFormat('en', { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
      },
    });
}
