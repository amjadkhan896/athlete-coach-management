import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

const snake = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/** Maps camelCase properties to the snake_case columns used in migrations. */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  columnName(propertyName: string, customName: string | undefined, prefixes: string[]): string {
    return customName ?? snake([...prefixes, propertyName].join('_'));
  }
}
