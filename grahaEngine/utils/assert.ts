export function assertNonNull<T>(
  value: T | null | undefined,
  message = "Value is null or undefined"
): T {
  if (value == null) {
    throw new Error(message);
  }
  return value;
}
