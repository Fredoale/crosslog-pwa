const API_KEY = 'AIzaSyD8UoubNuqWazSLcjh4bSq36EbFaXcvDB4';
const SPREADSHEET_ID = '1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI';
const SHEET_NAME = 'BASE';

async function testAPI() {
    const hdr = '708090';
    const range = `${SHEET_NAME}!A:K`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

    console.log('🔗 URL:', url);
    console.log('\n⏳ Consultando Google Sheets API...\n');

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const rows = data.values || [];

        if (rows.length === 0) {
            console.log('❌ No se encontraron datos en la hoja');
            return;
        }

        // Indices de columnas
        const numeroEntregaIndex = 0;  // Columna A
        const clienteIndex = 5;        // Columna F
        const hdrIndex = 10;           // Columna K

        console.log('📊 Total de filas en la hoja:', rows.length - 1); // -1 por header
        console.log('🔍 Buscando HDR:', hdr);
        console.log('─'.repeat(50));

        // Filtrar por HDR
        const matchingRows = rows.slice(1).filter(row => {
            const rowHDR = row[hdrIndex];
            return rowHDR && rowHDR.trim() === hdr;
        });

        if (matchingRows.length === 0) {
            console.log(`\n❌ HDR "${hdr}" no encontrado en la hoja\n`);
            return;
        }

        console.log(`\n✅ HDR "${hdr}" ENCONTRADO!\n`);
        console.log(`📦 Total de entregas: ${matchingRows.length}\n`);
        console.log('═'.repeat(50));
        console.log('ENTREGAS:\n');

        matchingRows.forEach((row, index) => {
            const numeroEntrega = row[numeroEntregaIndex] || 'N/A';
            const cliente = row[clienteIndex] || 'Sin cliente';

            console.log(`  ${index + 1}. Entrega N° ${numeroEntrega} → Cliente: ${cliente}`);
        });

        console.log('\n═'.repeat(50));
        console.log('\n✅ PRUEBA EXITOSA! La API funciona correctamente.\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nDetalles:', error);
    }
}

testAPI();
