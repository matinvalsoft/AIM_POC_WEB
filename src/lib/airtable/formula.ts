/**
 * Safe helpers to build Airtable filterByFormula strings
 * Prevents formula injection and provides type-safe filtering
 */

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty';

export type LogicalOperator = 'AND' | 'OR' | 'NOT';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: any;
}

export interface LogicalFilter {
  operator: LogicalOperator;
  conditions: (FilterCondition | LogicalFilter)[];
}

/**
 * Escape field names for Airtable formulas
 */
export function escapeFieldName(fieldName: string): string {
  // Wrap field names in curly braces and escape any special characters
  return `{${fieldName.replace(/[{}]/g, '')}}`;
}

/**
 * Escape string values for Airtable formulas
 */
export function escapeStringValue(value: string): string {
  // Escape quotes and wrap in double quotes
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Format value based on type for Airtable formulas
 */
export function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'BLANK()';
  }

  if (typeof value === 'string') {
    return escapeStringValue(value);
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE()' : 'FALSE()';
  }

  if (value instanceof Date) {
    return escapeStringValue(value.toISOString());
  }

  if (Array.isArray(value)) {
    // For multi-select fields, we need to check if any of the values match
    const formattedValues = value.map(v => formatValue(v));
    return `[${formattedValues.join(', ')}]`;
  }

  // Default to string representation
  return escapeStringValue(String(value));
}

/**
 * Build a single filter condition
 */
export function buildCondition(condition: FilterCondition): string {
  const field = escapeFieldName(condition.field);
  
  switch (condition.operator) {
    case 'equals':
      return `${field} = ${formatValue(condition.value)}`;
    
    case 'not_equals':
      return `${field} != ${formatValue(condition.value)}`;
    
    case 'contains':
      return `SEARCH(${formatValue(condition.value)}, ${field})`;
    
    case 'not_contains':
      return `NOT(SEARCH(${formatValue(condition.value)}, ${field}))`;
    
    case 'starts_with':
      return `LEFT(${field}, LEN(${formatValue(condition.value)})) = ${formatValue(condition.value)}`;
    
    case 'ends_with':
      return `RIGHT(${field}, LEN(${formatValue(condition.value)})) = ${formatValue(condition.value)}`;
    
    case 'greater_than':
      return `${field} > ${formatValue(condition.value)}`;
    
    case 'greater_than_or_equal':
      return `${field} >= ${formatValue(condition.value)}`;
    
    case 'less_than':
      return `${field} < ${formatValue(condition.value)}`;
    
    case 'less_than_or_equal':
      return `${field} <= ${formatValue(condition.value)}`;
    
    case 'is_empty':
      return `${field} = BLANK()`;
    
    case 'is_not_empty':
      return `${field} != BLANK()`;
    
    default:
      throw new Error(`Unsupported operator: ${condition.operator}`);
  }
}

/**
 * Build logical filter (AND, OR, NOT)
 */
export function buildLogicalFilter(filter: LogicalFilter): string {
  const conditions = filter.conditions.map(condition => {
    if ('operator' in condition && (condition.operator === 'AND' || condition.operator === 'OR' || condition.operator === 'NOT')) {
      return `(${buildLogicalFilter(condition)})`;
    } else {
      return buildCondition(condition as FilterCondition);
    }
  });

  switch (filter.operator) {
    case 'AND':
      return `AND(${conditions.join(', ')})`;
    
    case 'OR':
      return `OR(${conditions.join(', ')})`;
    
    case 'NOT':
      if (conditions.length !== 1) {
        throw new Error('NOT operator requires exactly one condition');
      }
      return `NOT(${conditions[0]})`;
    
    default:
      throw new Error(`Unsupported logical operator: ${filter.operator}`);
  }
}

/**
 * Build a complete filter formula
 */
export function buildFilter(filter: FilterCondition | LogicalFilter): string {
  if ('operator' in filter && (filter.operator === 'AND' || filter.operator === 'OR' || filter.operator === 'NOT')) {
    return buildLogicalFilter(filter);
  } else {
    return buildCondition(filter as FilterCondition);
  }
}

/**
 * Convenience functions for common filters
 */
export const filters = {
  /**
   * Field equals value
   */
  equals: (field: string, value: any): FilterCondition => ({
    field,
    operator: 'equals',
    value,
  }),

  /**
   * Field does not equal value
   */
  notEquals: (field: string, value: any): FilterCondition => ({
    field,
    operator: 'not_equals',
    value,
  }),

  /**
   * Field contains value (for text fields)
   */
  contains: (field: string, value: string): FilterCondition => ({
    field,
    operator: 'contains',
    value,
  }),

  /**
   * Field is empty
   */
  isEmpty: (field: string): FilterCondition => ({
    field,
    operator: 'is_empty',
  }),

  /**
   * Field is not empty
   */
  isNotEmpty: (field: string): FilterCondition => ({
    field,
    operator: 'is_not_empty',
  }),

  /**
   * Combine multiple conditions with AND
   */
  and: (...conditions: (FilterCondition | LogicalFilter)[]): LogicalFilter => ({
    operator: 'AND',
    conditions,
  }),

  /**
   * Combine multiple conditions with OR
   */
  or: (...conditions: (FilterCondition | LogicalFilter)[]): LogicalFilter => ({
    operator: 'OR',
    conditions,
  }),

  /**
   * Negate a condition
   */
  not: (condition: FilterCondition | LogicalFilter): LogicalFilter => ({
    operator: 'NOT',
    conditions: [condition],
  }),
};

/**
 * Validate field names against an allowlist to prevent injection
 */
export function validateFieldNames(filter: FilterCondition | LogicalFilter, allowedFields: string[]): boolean {
  const allowedSet = new Set(allowedFields);

  function validateCondition(condition: FilterCondition | LogicalFilter): boolean {
    if ('field' in condition) {
      return allowedSet.has(condition.field);
    } else {
      return condition.conditions.every(validateCondition);
    }
  }

  return validateCondition(filter);
}

/**
 * Example usage and utilities
 */
export const examples = {
  /**
   * Find records where Status is "Active" and Amount > 1000
   */
  activeHighValue: filters.and(
    filters.equals('Status', 'Active'),
    { field: 'Amount', operator: 'greater_than', value: 1000 }
  ),

  /**
   * Find records where Name contains "John" or Email contains "@company.com"
   */
  nameOrEmail: filters.or(
    filters.contains('Name', 'John'),
    filters.contains('Email', '@company.com')
  ),

  /**
   * Find incomplete records (missing required fields)
   */
  incomplete: filters.or(
    filters.isEmpty('Name'),
    filters.isEmpty('Email'),
    filters.isEmpty('Status')
  ),
};
