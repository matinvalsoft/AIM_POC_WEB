// Complete width measurement and testing script
// Open browser developer tools and paste this script to test right panel width consistency

console.log('🚀 COMPREHENSIVE RIGHT PANEL WIDTH TEST');
console.log('=======================================');

// Mock data for testing
const mockData = {
    invoice: {
        id: 'test-invoice-001',
        invoiceNumber: 'INV-2024-VERY-LONG-NUMBER-001',
        vendorName: 'Very Long Vendor Name That Could Cause Width Issues Inc.',
        amount: 12345.67,
        invoiceDate: new Date(),
        status: 'New',
        lines: [
            { description: 'Service with extremely long description that might affect layout', amount: 10000 },
            { description: 'Another item', amount: 2345.67 }
        ],
        linkedIds: ['file-001', 'email-002']
    },
    file: {
        id: 'test-file-001', 
        name: 'Extremely_Long_File_Name_That_Should_Test_Width_Constraints.pdf',
        source: 'Email Upload',
        status: 'Needs attention',
        pages: 25,
        createdAt: new Date(),
        relatedInvoices: ['inv-001']
    },
    email: {
        id: 'test-email-001',
        subject: 'Very Long Email Subject That Could Potentially Cause Layout Issues When Displayed',
        fromName: 'John Smith from Long Company Name',
        fromEmail: 'john.smith@verylongcompanynamethatmightcauseissues.com',
        received: new Date(),
        processingAddress: 'invoices@ourverylongcompanyname.com',
        status: 'New',
        relatedFiles: ['file-001', 'file-002']
    }
};

function measureRightPanelWidths() {
    return new Promise((resolve) => {
        console.log('🔍 Starting width measurement...');
        
        const rightPanel = document.querySelector('.max-w-sm');
        if (!rightPanel) {
            console.log('❌ Right panel not found');
            resolve({ error: 'Right panel not found' });
            return;
        }
        
        // Find detail tabs (the inner tabs, not main document navigation)
        const allTabLists = Array.from(document.querySelectorAll('[role="tablist"]'));
        const detailTabList = allTabLists[1]; // Second tablist should be the detail tabs
        
        if (!detailTabList) {
            console.log('❌ Detail tabs not found');
            resolve({ error: 'Detail tabs not found' });
            return;
        }
        
        const tabButtons = Array.from(detailTabList.querySelectorAll('[role="tab"]'));
        
        if (tabButtons.length === 0) {
            console.log('❌ No tabs found');
            resolve({ error: 'No tabs found' });
            return;
        }
        
        console.log(`📋 Found ${tabButtons.length} tabs:`, tabButtons.map(tab => tab.textContent.trim()));
        
        const measurements = {};
        let completed = 0;
        
        function measureCurrentWidth() {
            const rect = rightPanel.getBoundingClientRect();
            return {
                width: Math.round(rect.width * 100) / 100, // Round to 2 decimal places
                clientWidth: rightPanel.clientWidth,
                offsetWidth: rightPanel.offsetWidth
            };
        }
        
        tabButtons.forEach((tab, index) => {
            setTimeout(() => {
                const tabName = tab.textContent.trim();
                
                // Click the tab
                tab.click();
                
                // Wait for content to render and measure
                setTimeout(() => {
                    const measurement = measureCurrentWidth();
                    measurements[tabName] = measurement;
                    console.log(`📏 ${tabName}: ${measurement.width}px`);
                    
                    completed++;
                    if (completed === tabButtons.length) {
                        setTimeout(() => resolve(measurements), 100);
                    }
                }, 300);
            }, index * 600);
        });
    });
}

async function runComprehensiveTest() {
    console.log('🎯 Running comprehensive width test...');
    
    // Test current page first
    const results = await measureRightPanelWidths();
    
    if (results.error) {
        console.log('❌ Test failed:', results.error);
        return;
    }
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('==================');
    
    const widths = Object.values(results).map(r => r.width);
    const minWidth = Math.min(...widths);
    const maxWidth = Math.max(...widths);
    const difference = Math.round((maxWidth - minWidth) * 100) / 100;
    
    Object.entries(results).forEach(([tab, measurement]) => {
        const diff = Math.round((measurement.width - minWidth) * 100) / 100;
        const indicator = diff === 0 ? '✅' : '❌';
        console.log(`${indicator} ${tab.padEnd(12)}: ${measurement.width}px ${diff > 0 ? `(+${diff}px)` : ''}`);
    });
    
    console.log('==================');
    console.log(`📈 Range: ${minWidth}px - ${maxWidth}px`);
    console.log(`📏 Difference: ${difference}px`);
    
    if (difference <= 1) {
        console.log('🎉 SUCCESS: All tabs have consistent width!');
    } else {
        console.log('⚠️  ISSUE: Width inconsistency detected');
        console.log('🔧 The raw/extracted tabs are likely causing the issue');
    }
    
    return { consistent: difference <= 1, difference, measurements: results };
}

// Auto-run the test
setTimeout(() => {
    runComprehensiveTest().then(result => {
        if (result.consistent) {
            console.log('\n🎊 WIDTH CONSISTENCY TEST PASSED!');
        } else {
            console.log('\n❌ WIDTH CONSISTENCY TEST FAILED');
            console.log('💡 Check the raw/extracted tab content for width issues');
        }
    });
}, 1500);

console.log('📋 Comprehensive width test loaded and will auto-run in 1.5 seconds');
console.log('💡 Manual run: runComprehensiveTest()');


