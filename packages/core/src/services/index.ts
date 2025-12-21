// CSV Parser
export {
  parseCsv,
  previewCsv,
  type CsvParseOptions,
  type CsvParseResult,
  type CsvParseError,
} from "./csv-parser.js";

// Data Normalizer
export {
  normalizeColumnName,
  detectColumnType,
  analyzeColumns,
  normalizeRows,
  type ColumnType,
  type ColumnAnalysis,
  type NormalizationResult,
} from "./data-normalizer.js";

// Data Validator
export {
  validateRow,
  validateRows,
  type ValidationRule,
  type RowError,
  type ValidationResult,
} from "./data-validator.js";

// Variable Engine
export {
  VariableEngine,
  type Filter,
  type ExtractedVariable,
  type SubstitutionWarning,
  type SubstitutionError,
  type SubstitutionResult,
  type ValidationResult as VariableValidationResult,
  type SubstitutionDetail,
  type PreviewResult,
  type FilterFunction,
} from "./variable-engine.js";

// Creative Linker
export {
  CreativeLinker,
  getCreativeLinker,
  resetCreativeLinker,
  type CreativeCondition,
  type CreativeSelectionRule,
  type CreativeMapping,
} from "./creative-linker.js";
