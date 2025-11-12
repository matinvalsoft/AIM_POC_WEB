const testRawText = `GLOBAL MANUFACTURING CORP — INV-GLOB-001

GLOBAL MANUFACTURING CORP

AP DEPARTMENT • TAX ID: TAX-GLOB-002

REMIT TO: GLOBAL MFG - AP DEPARTMENT

INVOICE #: INV-GLOB-001

DATE: 11/22/2025

TERMS: 2/10NET30

CURRENCY: USD

VENDOR ID: GLOB002

BILL TO:

LM COMPANY

Purchasing Dept

PURCHASE ORDER: PO-GLOB-002

SHIPMENT NO.: GLOB-SHIP-002  RECEIVED: 11/19/2025

------------------------------------------------------------

LINE | ITEM NO. | DESCRIPTION | QTY | UOM | PRICE | AMOUNT

------------------------------------------------------------

0001 | ITEM-GLOB-200 | ALUMINUM SHEETS 4x8 | 50 | EA | 85.00 | 4,250.00

0002 | ITEM-GLOB-300 | STEEL PLATES 1/4 THICK | 25 | EA | 130.00 | 3,250.00  **SEE NOTE**

0003 | ITEM-GLOB-400 | WELDING WIRE ER70S-6 | 100 | LB | 5.25 | 525.00

------------------------------------------------------------

TOTAL (EXCL. TAX): 8,025.00

FREIGHT: 0.00

MISC: 0.00

GRAND TOTAL: $8,025.00

NOTE: Price variance detected vs. PO (expected 125.00 on ITEM-GLOB-300).`;

async function testParser3Real() {
  try {
    console.log('🧪 Testing parser3 API with real File record...\n');
    
    const fileRecordId = 'recjU6CziTupqKJeH';
    
    console.log('📄 File Record ID:', fileRecordId);
    console.log('📝 Sending raw text to parser...\n');

    const response = await fetch('http://localhost:3000/api/parser3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recordID: fileRecordId,
        rawText: testRawText
      })
    });

    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('\n=== API Response ===');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ Test successful!');
      console.log('\n📄 File Record ID:', data.fileRecordId);
      console.log('📋 Invoice Record ID:', data.invoiceRecordId);
      console.log('\n📊 Parsed Fields:');
      console.log('  Invoice Number:', data.parsedData['Invoice-Number']);
      console.log('  Vendor Name:', data.parsedData['Vendor-Name']);
      console.log('  Amount:', data.parsedData['Amount']);
      console.log('  Date:', data.parsedData['Date']);
      console.log('  Freight Charge:', data.parsedData['Freight-Charge']);
      console.log('  Surcharge:', data.parsedData['Surcharge']);
      console.log('  Misc Charge:', data.parsedData['Misc-Charge']);
      console.log('  Discount Amount:', data.parsedData['Discount-Amount']);
      console.log('  Discount Date:', data.parsedData['Discount-Date']);
      console.log('\n✨ Actions completed:');
      console.log('  1. ✅ Parsed invoice with OpenAI');
      console.log('  2. ✅ Created Invoice record in Airtable');
      console.log('  3. ✅ Linked Invoice to File record');
      console.log('  4. ✅ Updated File status to "Processed"');
      console.log('\n🔗 Check Airtable to verify:');
      console.log(`  - File record ${fileRecordId} should have status "Processed"`);
      console.log(`  - Invoice record ${data.invoiceRecordId} should be created and linked`);
    } else {
      console.log('\n❌ Test failed!');
      console.log('Error:', data.error);
      if (data.details) {
        console.log('Details:', data.details);
      }
    }
  } catch (error) {
    console.error('❌ Error testing parser3:', error);
  }
}

testParser3Real();

