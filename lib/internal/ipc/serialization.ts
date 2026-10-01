import { SerializationError } from '../../errors/serialization-error';

export function serializeJson(value: unknown, context: string): string {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) {
      throw new TypeError('JSON.stringify returned undefined');
    }
    return json;
  } catch {
    throw new SerializationError(context + ' is not JSON-serialisable');
  }
}

export function validateJsonValue(value: unknown, context: string): void {
  JSON.parse(serializeJson(value, context));
}
