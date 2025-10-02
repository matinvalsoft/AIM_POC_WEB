/**
 * Generate TypeScript schema types from latest_schema.json
 * Run with: node scripts/generate-schema-types.js
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'latest_schema.json');
const outputPath = path.join(__dirname, '..', 'src', 'lib', 'airtable', 'schema-types.ts');

if (!fs.existsSync(schemaPath)) {
  console.error('❌ Error: latest_schema.json not found. Run fetch-airtable-schema.js first.');
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Helper to convert field name to camelCase
function toCamelCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
}

// Helper to get TypeScript type from Airtable field type
function getTypeScriptType(field) {
  const typeMap = {
    'singleLineText': 'string',
    'multilineText': 'string',
    'email': 'string',
    'url': 'string',
    'number': 'number',
    'currency': 'number',
    'percent': 'number',
    'autoNumber': 'number',
    'singleSelect': 'string',
    'multipleSelects': 'string[]',
    'checkbox': 'boolean',
    'date': 'string',
    'dateTime': 'string',
    'createdTime': 'string',
    'lastModifiedTime': 'string',
    'multipleRecordLinks': 'string[]',
    'multipleAttachments': 'AirtableAttachment[]',
    'multipleLookupValues': 'any',
    'formula': 'any',
    'rollup': 'any',
    'count': 'number',
    'lookup': 'any',
  };
  
  return typeMap[field.type] || 'any';
}

// Generate FIELD_IDS constants
let fieldIdsOutput = '// Auto-generated field IDs from Airtable schema\n\n';
fieldIdsOutput += 'export const FIELD_IDS = {\n';

schema.tables.forEach(table => {
  const tableName = table.name.toUpperCase().replace(/\s+/g, '_');
  fieldIdsOutput += `  ${tableName}: {\n`;
  
  table.fields.forEach(field => {
    const fieldName = field.name.toUpperCase().replace(/\s+/g, '_');
    fieldIdsOutput += `    ${fieldName}: '${field.id}',\n`;
  });
  
  fieldIdsOutput += '  },\n';
});

fieldIdsOutput += '} as const;\n\n';

// Generate TABLE_NAMES constants
let tableNamesOutput = '// Table names\n';
tableNamesOutput += 'export const TABLE_NAMES = {\n';

schema.tables.forEach(table => {
  const tableName = table.name.toUpperCase().replace(/\s+/g, '_');
  tableNamesOutput += `  ${tableName}: '${table.name}',\n`;
});

tableNamesOutput += '} as const;\n\n';

// Generate TypeScript interfaces
let interfacesOutput = '// Airtable attachment type\n';
interfacesOutput += 'export interface AirtableAttachment {\n';
interfacesOutput += '  id: string;\n';
interfacesOutput += '  url: string;\n';
interfacesOutput += '  filename: string;\n';
interfacesOutput += '  size?: number;\n';
interfacesOutput += '  type?: string;\n';
interfacesOutput += '  thumbnails?: {\n';
interfacesOutput += '    small?: { url: string; width: number; height: number };\n';
interfacesOutput += '    large?: { url: string; width: number; height: number };\n';
interfacesOutput += '    full?: { url: string; width: number; height: number };\n';
interfacesOutput += '  };\n';
interfacesOutput += '}\n\n';

schema.tables.forEach(table => {
  const interfaceName = table.name.replace(/\s+/g, '') + 'Fields';
  interfacesOutput += `export interface ${interfaceName} {\n`;
  
  table.fields.forEach(field => {
    const camelName = toCamelCase(field.name);
    const tsType = getTypeScriptType(field);
    const optional = field.type !== 'autoNumber' && field.type !== 'createdTime' ? '?' : '';
    interfacesOutput += `  ${camelName}${optional}: ${tsType};\n`;
  });
  
  interfacesOutput += '}\n\n';
});

// Generate Record interfaces (simplified field names)
schema.tables.forEach(table => {
  const interfaceName = table.name.replace(/\s+/g, '') + 'Record';
  interfacesOutput += `export interface ${interfaceName} {\n`;
  
  table.fields.forEach(field => {
    const camelName = toCamelCase(field.name);
    const tsType = getTypeScriptType(field);
    const optional = field.type !== 'autoNumber' && field.type !== 'createdTime' ? '?' : '';
    interfacesOutput += `  ${camelName}${optional}: ${tsType};\n`;
  });
  
  interfacesOutput += '}\n\n';
});

// Combine all output
const fullOutput = `/**
 * Auto-generated Airtable schema types
 * Generated from latest_schema.json
 * DO NOT EDIT MANUALLY - Run 'node scripts/generate-schema-types.js' to regenerate
 */

${fieldIdsOutput}${tableNamesOutput}${interfacesOutput}`;

// Write to file
fs.writeFileSync(outputPath, fullOutput);

console.log('✅ Schema types generated successfully!');
console.log(`   Output: ${outputPath}`);
console.log(`   Tables: ${schema.tables.length}`);
schema.tables.forEach(table => {
  console.log(`   - ${table.name} (${table.fields.length} fields)`);
});




