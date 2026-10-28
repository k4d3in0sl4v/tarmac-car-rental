/** Inline error under a form field. Renders nothing when there is no message. */
export default function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p className="field__error" id={id}>{message}</p>;
}

/** Props for an input that may have an error: marks it invalid and links the message. */
export const invalidProps = (id: string, message?: string) =>
  message ? { 'aria-invalid': true as const, 'aria-describedby': id } : {};
