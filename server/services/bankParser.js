import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseBankStatementPDF(base64PDF) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4000,
    messages: [{
      role: 'system',
      content: `You are a bank statement parser for Indonesian banks (BCA Syariah, BSI). 
Extract ALL transactions from the bank statement. 
Return ONLY a valid JSON array, no markdown, no explanation.
Each object must have exactly these fields:
{
  "tanggal": "YYYY-MM-DD",
  "keterangan": "description string",
  "debit": number (0 if not debit),
  "kredit": number (0 if not kredit),
  "saldo": number
}
If a date only shows day/month (like "06/02"), assume year 2026.
Parse every single row in the transaction table.`
    }, {
      role: 'user',
      content: [{
        type: 'text',
        text: 'Parse all transactions from this bank statement:'
      }, {
        type: 'image_url',
        image_url: {
          url: `data:application/pdf;base64,${base64PDF}`,
          detail: 'high'
        }
      }]
    }]
  });

  const text = response.choices[0].message.content;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function parseBankStatementImage(base64Image, mimeType = 'image/jpeg') {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4000,
    messages: [{
      role: 'system',
      content: `You are a bank statement parser for Indonesian banks. 
Extract ALL transactions from this screenshot.
Return ONLY a valid JSON array, no markdown, no explanation.
Each object: { "tanggal": "YYYY-MM-DD", "keterangan": "string", "debit": number, "kredit": number, "saldo": number }
If debit column is empty use 0. If kredit column is empty use 0.`
    }, {
      role: 'user',
      content: [{
        type: 'text',
        text: 'Parse all transactions:'
      }, {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'high' }
      }]
    }]
  });

  const text = response.choices[0].message.content;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// Process parsed rows: determine tipe, status, detect TRF BATCH MYBB
export function processBankRows(rows, sumber) {
  return rows.map(row => {
    const isMasuk = row.kredit > 0;
    const isTrfBatch = row.keterangan?.toUpperCase().includes('TRF BATCH MYBB');

    let status = 'cek_manual';
    if (isTrfBatch) status = 'valid'; // QRIS settlement - auto valid

    return {
      tanggal: row.tanggal,
      keterangan: row.keterangan,
      jumlah: isMasuk ? row.kredit : row.debit,
      tipe: isMasuk ? 'masuk' : 'keluar',
      sumber,
      status,
      is_trf_batch: isTrfBatch,
      raw_data: row
    };
  });
}
