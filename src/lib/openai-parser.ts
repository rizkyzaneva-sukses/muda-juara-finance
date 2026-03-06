import OpenAI from 'openai'
import pdfParse from 'pdf-parse'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ParsedTransaction {
  tanggal: string
  keterangan: string
  debit: number
  kredit: number
  saldo: number
}

export async function parseBankStatementPDF(base64PDF: string): Promise<ParsedTransaction[]> {
  // Convert base64 to buffer and extract text locally first
  const buffer = Buffer.from(base64PDF, 'base64')
  let rawText = ''
  try {
    const data = await pdfParse(buffer)
    rawText = data.text
  } catch (err) {
    throw new Error('Gagal membaca text dari PDF')
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4000,
    messages: [
      {
        role: 'system',
        content: `Kamu adalah parser mutasi rekening bank Indonesia. 
Ekstrak SEMUA transaksi dari data teks mutasi rekening ini.
Return HANYA JSON array, tidak ada teks lain, markdown, atau pembukaan/penutup.
Setiap objek harus memiliki field:
- tanggal: string format "YYYY-MM-DD"
- keterangan: string (deskripsi transaksi)
- debit: number (0 jika tidak ada)
- kredit: number (0 jika tidak ada)  
- saldo: number

Contoh output:
[{"tanggal":"2026-02-06","keterangan":"TRF BATCH MYBB - PEMBAYARAN","debit":0,"kredit":1259124,"saldo":49923065}]`,
      },
      {
        role: 'user',
        content: `Parse semua transaksi dari teks mutasi rekening ini:\n\n${rawText}`,
      },
    ],
  })

  const content = response.choices[0].message.content || '[]'
  const clean = content.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    // Try to extract JSON array from response
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) {
      return JSON.parse(match[0])
    }
    return []
  }
}

export async function parseBankStatementImage(base64Image: string, mimeType: string): Promise<ParsedTransaction[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4000,
    messages: [
      {
        role: 'system',
        content: `Kamu adalah parser mutasi rekening bank Indonesia.
Ekstrak SEMUA transaksi dari screenshot mutasi rekening ini.
Return HANYA JSON array, tidak ada teks lain, tidak ada markdown.
Setiap objek harus memiliki field:
- tanggal: string format "YYYY-MM-DD" 
- keterangan: string
- debit: number (0 jika tidak ada)
- kredit: number (0 jika tidak ada)
- saldo: number`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  })

  const content = response.choices[0].message.content || '[]'
  const clean = content.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
    return []
  }
}
