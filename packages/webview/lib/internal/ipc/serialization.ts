import { SerializationError } from '../../errors/serialization-error';

/**
 * JSON-encodes a value and reports failures as a WebviewJS serialization error.
 * @param value Value to encode.
 * @param context Description included in the error message.
 */
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

/**
 * Verifies that a value can make a JSON round trip.
 * @param value Value to validate.
 * @param context Description included in the error message.
 */
export function validateJsonValue(value: unknown, context: string): void {
  JSON.parse(serializeJson(value, context));
}
