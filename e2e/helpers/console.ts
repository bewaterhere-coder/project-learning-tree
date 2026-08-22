/**
 * Console-error allowlist for browser acceptance tests.
 *
 * Fail closed: unexpected console.error, pageerror, and uncaught exceptions
 * fail the test. console.warn is ignored unless promoted here later.
 *
 * Add entries only for a specific, unavoidable third-party message.
 * Do not ignore all ResizeObserver messages, all React errors, or all
 * console.error output.
 */
export const ALLOWED_CONSOLE_ERRORS: readonly string[] = [
  // Empty on purpose. Confirm XYFlow / React noise during first runs and
  // add the exact message substring here only if it is a console.error
  // we cannot suppress without a production change.
];

export function isAllowedConsoleError(text: string): boolean {
  return ALLOWED_CONSOLE_ERRORS.some((allowed) => text.includes(allowed));
}
