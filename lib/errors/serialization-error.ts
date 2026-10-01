export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}
