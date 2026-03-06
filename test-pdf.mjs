import fs from 'fs';

async function run() {
    try {
        const rawPdf = fs.readFileSync('H:/APP WEB/FIX/muda-juara-finance/TEMPLATE/BSI_Mutasi  01012026 sd 31012026.pdf');
        const base64 = rawPdf.toString('base64');

        // login to get token
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'mudajuara2026' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        console.log('Got token');

        const tsStart = Date.now();
        const res = await fetch('http://localhost:3000/api/mutasi/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                fileBase64: base64,
                mimeType: 'application/pdf',
                bank: 'BSI'
            })
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response body:', text.substring(0, 500));
    } catch (err) {
        console.error(err);
    }
}

run();
