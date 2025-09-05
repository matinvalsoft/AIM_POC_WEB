#!/usr/bin/env node

/**
 * Airtable Integration Test Script
 * Tests connection and fetches table schemas
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function testAirtableConnection() {
  console.log('🧪 Testing Airtable Integration');
  console.log('================================\n');

  // Check environment variables
  const pat = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!pat) {
    console.log('❌ AIRTABLE_PAT not found in .env.local');
    console.log('Please run: node setup-airtable-env.js');
    return;
  }

  if (!baseId) {
    console.log('⚠️  AIRTABLE_BASE_ID not set in .env.local');
    console.log('You can provide it via command line: node test-airtable.js <baseId>');
    return;
  }

  console.log('✅ Environment variables loaded');
  console.log(`   PAT: ${pat.substring(0, 20)}...`);
  console.log(`   Base ID: ${baseId}\n`);

  try {
    // Test basic connection
    console.log('🔌 Testing connection to Airtable...');
    
    const baseUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
    const response = await fetch(baseUrl, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Connection successful!\n');
    
    // Display table schemas
    console.log('📊 Table Schemas:');
    console.log('==================\n');
    
    if (!data.tables || data.tables.length === 0) {
      console.log('No tables found in this base.');
      return;
    }

    data.tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name} (ID: ${table.id})`);
      console.log(`   Primary Field: ${table.primaryFieldId}`);
      console.log(`   Fields (${table.fields.length}):`);
      
      table.fields.forEach((field, fieldIndex) => {
        const typeInfo = field.type === 'singleSelect' || field.type === 'multipleSelects' 
          ? ` (options: ${field.options?.choices?.length || 0})`
          : field.type === 'multipleRecordLinks'
          ? ` (links to: ${field.options?.linkedTableId || 'unknown'})`
          : '';
        
        console.log(`     ${fieldIndex + 1}. ${field.name} - ${field.type}${typeInfo}`);
      });
      console.log('');
    });

    // Test listing records from first table
    const firstTable = data.tables[0];
    console.log(`🔍 Testing record retrieval from "${firstTable.name}"...`);
    
    const recordsUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(firstTable.name)}?pageSize=3`;
    const recordsResponse = await fetch(recordsUrl, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
    });

    if (recordsResponse.ok) {
      const recordsData = await recordsResponse.json();
      console.log(`✅ Successfully retrieved ${recordsData.records.length} sample records`);
      
      if (recordsData.records.length > 0) {
        const sampleRecord = recordsData.records[0];
        console.log(`   Sample record fields:`, Object.keys(sampleRecord.fields).join(', '));
      }
    } else {
      console.log(`⚠️  Could not retrieve records: ${recordsResponse.status}`);
    }

    console.log('\n🎉 Integration test completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('1. Use the demo component: import { AirtableDemo } from "@/components/examples/airtable-demo"');
    console.log('2. Start building with: import { useAirtable, createAirtableClient } from "@/lib/airtable"');
    console.log('3. Available tables:', data.tables.map(t => t.name).join(', '));

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your PAT has the correct scopes (data.records:read, data.records:write)');
    console.log('2. Check that your PAT has access to this base');
    console.log('3. Ensure the Base ID is correct (format: appXXXXXXXXXXXXXX)');
    console.log('4. Try regenerating your PAT if it\'s old');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
  process.env.AIRTABLE_BASE_ID = args[0];
}

// Run the test
testAirtableConnection().catch(console.error);
