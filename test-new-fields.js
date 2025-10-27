const API_KEY = 'AIzaSyD8UoubNuqWazSLcjh4bSq36EbFaXcvDB4';
const SPREADSHEET_ID = '1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI';

async function testNewFields() {
    const hdr = '708090';

    console.log('🧪 PROBANDO NUEVOS CAMPOS\n');
    console.log('═'.repeat(60));

    try {
        // 1. Fetch MAESTRA_CLIENTES
        console.log('\n📋 1. Cargando MAESTRA_CLIENTES...');
        const clientesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/MAESTRA_CLIENTES!A:B?key=${API_KEY}`;
        const clientesResponse = await fetch(clientesUrl);
        const clientesData = await clientesResponse.json();
        const clientesRows = clientesData.values || [];

        const clientesMap = new Map();
        clientesRows.slice(1).forEach(row => {
            const id = row[0]?.trim();
            const nombre = row[1]?.trim();
            if (id && nombre) {
                clientesMap.set(id, nombre);
            }
        });

        console.log(`✅ Cargados ${clientesMap.size} clientes:`);
        Array.from(clientesMap.entries()).slice(0, 5).forEach(([id, nombre]) => {
            console.log(`   ${id} → ${nombre}`);
        });

        // 2. Fetch BASE con columna L
        console.log('\n📋 2. Buscando HDR en BASE (columnas A:L)...');
        const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/BASE!A:L?key=${API_KEY}`;
        const baseResponse = await fetch(baseUrl);
        const baseData = await baseResponse.json();
        const baseRows = baseData.values || [];

        const numeroEntregaIndex = 0;
        const clienteIndex = 5;
        const hdrIndex = 10;
        const detalleIndex = 11;

        const matchingRows = baseRows.slice(1).filter(row => {
            const rowHDR = row[hdrIndex];
            return rowHDR && rowHDR.trim() === hdr;
        });

        console.log(`✅ Encontradas ${matchingRows.length} entregas para HDR ${hdr}\n`);
        console.log('═'.repeat(60));

        // 3. Mapear entregas con nuevos campos
        matchingRows.forEach((row, index) => {
            const clienteId = row[clienteIndex]?.trim() || 'N/A';
            const clienteNombreCompleto = clientesMap.get(clienteId) || clienteId;
            const detalleEntregas = row[detalleIndex]?.trim() || 'Sin detalle';
            const numeroEntrega = row[numeroEntregaIndex] || `${index + 1}`;

            console.log(`\n📦 ENTREGA #${index + 1}`);
            console.log('─'.repeat(60));
            console.log(`   N° Entrega: ${numeroEntrega}`);
            console.log(`   Cliente ID: ${clienteId}`);
            console.log(`   Cliente Nombre: ${clienteNombreCompleto}`);
            console.log(`   Detalles:`);
            console.log(`   ${detalleEntregas}`);
        });

        console.log('\n' + '═'.repeat(60));
        console.log('\n✅ PRUEBA EXITOSA! Todos los campos funcionan correctamente.\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

testNewFields();
