/**
 * Fetch Airtable schema and save to latest_schema.json
 * Run with: node scripts/fetch-airtable-schema.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const BASE_ID = process.env.AIRTABLE_BASE_ID;
const PAT = process.env.AIRTABLE_PAT;

if (!BASE_ID) {
  console.error('❌ Error: AIRTABLE_BASE_ID not found in environment variables');
  process.exit(1);
}

if (!PAT) {
  console.error('❌ Error: AIRTABLE_PAT not found in environment variables');
  process.exit(1);
}

async function fetchSchema() {
  console.log('🔍 Fetching Airtable schema...');
  console.log(`   Base ID: ${BASE_ID}`);
  
  try {
    const url = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Save to latest_schema.json
    const schemaPath = path.join(__dirname, '..', 'latest_schema.json');
    fs.writeFileSync(schemaPath, JSON.stringify(data, null, 2));
    
    console.log('✅ Schema fetched successfully!');
    console.log(`   Tables found: ${data.tables.length}`);
    console.log(`   Saved to: latest_schema.json`);
    console.log('\nTables:');
    data.tables.forEach(table => {
      console.log(`   - ${table.name} (${table.fields.length} fields)`);
    });
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching schema:', error.message);
    process.exit(1);
  }
}

fetchSchema();




