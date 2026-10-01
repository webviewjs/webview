/** Error raised when a value cannot be encoded for WebviewJS IPC. */
export class SerializationError extends Error {
  /**
   * Creates an IPC serialization error with a contextual message.
   * @param message Description of the value that failed serialization.
   */
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}
