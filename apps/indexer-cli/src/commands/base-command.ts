/**
 * @file Base command class for reducing duplication across CLI commands
 * @description Provides common output handling, error handling, and format negotiation
 * @reference improvements-roadmap.md §4C.3 (command base class)
 * @reference cli_spec.md §8 (output format contracts)
 * @reference testing_specification.md §3.6.1 (class-based command pattern)
 */

import { OutputHandler, type JsonOutput, type OutputFormat } from '@repo/indexer-utils';

/**
 * Base class for all CLI commands.
 * Provides:
 * - Output format negotiation
 * - Consistent error handling
 * - Template method for execute()
 *
 * @reference cli_spec.md §8 (output contracts)
 * @reference testing_specification.md §4.2 (integration test patterns)
 */
export abstract class BaseCommand {
  protected outputHandler: OutputHandler;

  constructor(format: OutputFormat = 'text') {
    this.outputHandler = new OutputHandler(format);
  }

  /**
   * Output result in negotiated format (text + JSON)
   * @param textOutput Plain text representation
   * @param jsonOutput Structured JSON output
   * @reference cli_spec.md §8 (output contracts)
   */
  protected output(textOutput: string, jsonOutput: JsonOutput): void {
    this.outputHandler.output(textOutput, jsonOutput);
  }

  /**
   * Handle errors consistently across all commands
   * Logs error message and exits with provided code
   * @param message User-facing error message
   * @param code Exit code (default: 1 for config/validation errors)
   * @reference cli_spec.md §6 (exit codes)
   */
  protected error(message: string, code: number = 1): never {
    console.error(`Error: ${message}`);
    process.exit(code);
  }

  /**
   * Abstract method to be implemented by subclasses
   * @returns Promise<number> for exit code, or number synchronously
   */
  abstract execute(): Promise<number> | number;
}
