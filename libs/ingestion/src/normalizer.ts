export const SUPPORTED_TEST_FRAMEWORKS = [
  'junit',
  'jest',
  'pytest',
  'playwright',
  'mocha',
  'vitest',
] as const;

export type SupportedTestFramework = (typeof SUPPORTED_TEST_FRAMEWORKS)[number];
export type CanonicalTestFramework = SupportedTestFramework | 'unknown';
export type CanonicalTestStatus = 'pass' | 'fail' | 'skip' | 'error' | 'unknown';

export type ParsedTestCaseRecord = Record<string, unknown>;

export interface NormalizationWarning {
  code:
    | 'MALFORMED_RECORD'
    | 'UNSUPPORTED_FRAMEWORK'
    | 'MISSING_FIELD'
    | 'INVALID_FIELD'
    | 'UNKNOWN_STATUS';
  message: string;
  sourceIndex?: number;
  field?: string;
}

export interface TestCaseProvenance {
  /** Framework named by the report producer, retained even when unsupported. */
  sourceFramework: string;
  /** Canonical framework classification used by the normalizer. */
  framework: CanonicalTestFramework;
  /** Stable position in the parsed input array. */
  sourceIndex: number;
  /** The unmodified parsed record (or malformed value wrapper). */
  raw: unknown;
}

export interface CanonicalTestCase {
  path: string;
  name: string;
  status: CanonicalTestStatus;
  durationMs?: number;
  startedAt?: string;
  failureDetails?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  /** Raw source data is intentionally retained alongside canonical facts. */
  raw: unknown;
  provenance: TestCaseProvenance;
}

export interface NormalizationResult {
  testCases: CanonicalTestCase[];
  warnings: NormalizationWarning[];
}

const STATUS_FIELDS = ['status', 'outcome', 'state', 'testStatus'] as const;
const PATH_FIELDS = ['path', 'file', 'filePath', 'filepath', 'testFile', 'filename'] as const;
const NAME_FIELDS = ['name', 'title', 'fullName', 'fullTitle', 'testName', 'nodeid'] as const;

function isRecord(value: unknown): value is ParsedTestCaseRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readString(record: ParsedTestCaseRecord, fields: readonly string[]): string | undefined {
  for (const field of fields) {
    const value = nonEmptyString(record[field]);
    if (value) return value;
  }
  return undefined;
}

function readNestedString(record: ParsedTestCaseRecord, key: string): string | undefined {
  const nested = record[key];
  if (!isRecord(nested)) return undefined;
  return readString(nested, ['status', 'state', 'outcome', 'message']);
}

function statusFromValue(value: unknown): CanonicalTestStatus | undefined {
  const status = nonEmptyString(value)
    ?.toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (!status) return undefined;

  if (['pass', 'passed', 'success', 'successful', 'succeeded', 'ok', 'green'].includes(status)) {
    return 'pass';
  }
  if (['fail', 'failed', 'failure', 'failing', 'red'].includes(status)) return 'fail';
  if (
    ['skip', 'skipped', 'pending', 'todo', 'disabled', 'ignored', 'notrun', 'notexecuted'].includes(
      status
    )
  ) {
    return 'skip';
  }
  if (
    ['error', 'errored', 'exception', 'timedout', 'timeout', 'crashed', 'broken'].includes(status)
  ) {
    return 'error';
  }
  return 'unknown';
}

function normalizeFramework(framework: string): {
  sourceFramework: string;
  framework: CanonicalTestFramework;
} {
  const sourceFramework = typeof framework === 'string' ? framework : String(framework);
  const normalized = sourceFramework.trim().toLowerCase() as SupportedTestFramework;
  return {
    sourceFramework,
    framework: (SUPPORTED_TEST_FRAMEWORKS as readonly string[]).includes(normalized)
      ? normalized
      : 'unknown',
  };
}

function stableDetails(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value)) {
    const strings = value.filter(
      (item): item is string => typeof item === 'string' && item.length > 0
    );
    if (strings.length > 0) return strings.join('\n\n');
  }
  if (isRecord(value)) {
    const details = [value.message, value.stack, value.longrepr, value['#text']]
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .join('\n\n');
    if (details) return details;
  }
  return undefined;
}

function canonicalStartedAt(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function canonicalDurationMs(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : undefined;
}

function readDurationMs(record: ParsedTestCaseRecord): { value?: number; supplied: boolean } {
  if (Object.prototype.hasOwnProperty.call(record, 'durationMs')) {
    return { value: canonicalDurationMs(record.durationMs), supplied: true };
  }
  if (typeof record.duration === 'number')
    return { value: canonicalDurationMs(record.duration), supplied: true };
  return { supplied: false };
}

function readStartedAt(record: ParsedTestCaseRecord): unknown {
  return record.startedAt ?? record.startTime ?? record.start ?? record.timestamp;
}

function readStatus(record: ParsedTestCaseRecord): unknown {
  for (const field of STATUS_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(record, field)) return record[field];
  }
  if (typeof record.result === 'string') return record.result;
  return readNestedString(record, 'result') ?? readNestedString(record, 'test');
}

function inferStatus(record: ParsedTestCaseRecord): CanonicalTestStatus {
  if ('error' in record || 'errors' in record || 'exception' in record) return 'error';
  if ('failure' in record || 'failures' in record || 'failureDetails' in record) return 'fail';
  if ('skipped' in record || 'pending' in record || 'todo' in record || 'disabled' in record)
    return 'skip';
  return 'unknown';
}

function rawRecordFor(value: unknown): unknown {
  // Do not coerce or discard source data. The reference is exposed only as provenance.
  return value;
}

function warning(
  code: NormalizationWarning['code'],
  message: string,
  sourceIndex: number,
  field?: string
): NormalizationWarning {
  return { code, message, sourceIndex, ...(field ? { field } : {}) };
}

/** Normalize one parsed case while retaining every source field in provenance.raw. */
export function normalizeTestCase(
  framework: string,
  input: unknown,
  sourceIndex = 0
): { testCase: CanonicalTestCase; warnings: NormalizationWarning[] } {
  const source = normalizeFramework(framework);
  const warnings: NormalizationWarning[] = [];

  if (!isRecord(input)) {
    warnings.push(
      warning(
        'MALFORMED_RECORD',
        `Parsed test case at index ${sourceIndex} is not an object; retained as unknown.`,
        sourceIndex
      )
    );
    const raw = rawRecordFor(input);
    return {
      testCase: {
        path: 'unknown',
        name: 'unknown',
        status: 'unknown',
        raw,
        provenance: { ...source, sourceIndex, raw },
      },
      warnings,
    };
  }

  const pathValue = readString(input, PATH_FIELDS);
  const nameValue = readString(input, NAME_FIELDS);
  const path = pathValue ?? 'unknown';
  const name = nameValue ?? 'unknown';
  if (pathValue === undefined)
    warnings.push(warning('MISSING_FIELD', 'Test case path is missing.', sourceIndex, 'path'));
  if (nameValue === undefined)
    warnings.push(warning('MISSING_FIELD', 'Test case name is missing.', sourceIndex, 'name'));

  const suppliedStatus = readStatus(input);
  const mappedStatus = statusFromValue(suppliedStatus);
  const status = mappedStatus ?? inferStatus(input);
  if (status === 'unknown') {
    warnings.push(
      warning(
        suppliedStatus === undefined ? 'MISSING_FIELD' : 'UNKNOWN_STATUS',
        suppliedStatus === undefined
          ? 'Test case status is missing; classified as unknown.'
          : `Test case status "${String(suppliedStatus)}" is unsupported; classified as unknown.`,
        sourceIndex,
        'status'
      )
    );
  }

  const duration = readDurationMs(input);
  if (duration.supplied && duration.value === undefined) {
    warnings.push(
      warning(
        'INVALID_FIELD',
        'Test case duration is not a finite non-negative number.',
        sourceIndex,
        'durationMs'
      )
    );
  }

  const startedAtValue = readStartedAt(input);
  const startedAt = canonicalStartedAt(startedAtValue);
  if (startedAtValue !== undefined && startedAt === undefined) {
    warnings.push(
      warning('INVALID_FIELD', 'Test case start time is invalid.', sourceIndex, 'startedAt')
    );
  }

  const detailsValue = input.failureDetails ?? input.failure ?? input.error ?? input.exception;
  const failureDetails = stableDetails(detailsValue);
  if (detailsValue !== undefined && failureDetails === undefined) {
    warnings.push(
      warning(
        'INVALID_FIELD',
        'Test case failure details could not be represented as text.',
        sourceIndex,
        'failureDetails'
      )
    );
  }

  const tagsValue = input.tags;
  let tags: string[] | undefined;
  if (tagsValue !== undefined) {
    if (!Array.isArray(tagsValue)) {
      warnings.push(
        warning('INVALID_FIELD', 'Test case tags must be an array of strings.', sourceIndex, 'tags')
      );
    } else {
      const invalidTags = tagsValue.some((tag) => typeof tag !== 'string');
      if (invalidTags)
        warnings.push(
          warning('INVALID_FIELD', 'Non-string test case tags were omitted.', sourceIndex, 'tags')
        );
      tags = tagsValue.filter((tag): tag is string => typeof tag === 'string');
      if (tags.length === 0) tags = undefined;
    }
  }

  const metadata = isRecord(input.metadata) ? input.metadata : undefined;
  if (input.metadata !== undefined && metadata === undefined) {
    warnings.push(
      warning('INVALID_FIELD', 'Test case metadata must be an object.', sourceIndex, 'metadata')
    );
  }

  const raw = rawRecordFor(input);
  const testCase: CanonicalTestCase = {
    path,
    name,
    status,
    ...(duration.value !== undefined ? { durationMs: duration.value } : {}),
    ...(startedAt !== undefined ? { startedAt } : {}),
    ...(failureDetails !== undefined ? { failureDetails } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
    raw,
    provenance: { ...source, sourceIndex, raw },
  };

  return { testCase, warnings };
}

/**
 * Normalize parsed cases from one of the supported report frameworks.
 * No input record is dropped: malformed entries become deterministic unknown cases with warnings.
 */
export function normalizeTestCases(
  framework: string,
  parsedTestCases: readonly unknown[]
): NormalizationResult {
  const source = normalizeFramework(framework);
  const warnings: NormalizationWarning[] = [];
  if (source.framework === 'unknown') {
    warnings.push({
      code: 'UNSUPPORTED_FRAMEWORK',
      message: `Framework "${source.sourceFramework}" is unsupported; cases use unknown framework provenance.`,
    });
  }

  const testCases: CanonicalTestCase[] = [];
  parsedTestCases.forEach((input, index) => {
    const result = normalizeTestCase(framework, input, index);
    testCases.push(result.testCase);
    warnings.push(...result.warnings);
  });
  return { testCases, warnings };
}

/** Alias useful to callers that name parser output "parsed cases". */
export const normalizeParsedTestCases = normalizeTestCases;
