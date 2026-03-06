import { QrisCode } from '@/types'

export const MDR_RATE = 0.007;

const VALID_MINISTRY_CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '09']
const VALID_TRANSACTION_CODES = ['10', '11', '12', '13', '15', '16', '17', '96', '97']

export function parseQrisCode(amount: number): QrisCode {
  const lastThree = amount % 1000
  const ministryDigit = Math.floor(lastThree / 100)
  const transactionCode = lastThree % 100

  const ministryCode = String(ministryDigit).padStart(2, '0')
  const txCode = String(transactionCode).padStart(2, '0')

  if (
    VALID_MINISTRY_CODES.includes(ministryCode) &&
    VALID_TRANSACTION_CODES.includes(txCode)
  ) {
    return { ministryCode, transactionCode: txCode, status: 'valid' }
  }

  return { ministryCode: '', transactionCode: '', status: 'cek_manual' }
}

export function isTrfBatchMybb(keterangan: string): boolean {
  return keterangan?.toUpperCase().includes('TRF BATCH MYBB') ||
    keterangan?.toUpperCase().includes('PEMBAYARAN MERCHANT') ||
    keterangan?.toUpperCase().includes('PEMBAYARAN TRX')
}

export function isAutoSkipMybb(teks: string): boolean {
  return teks?.toUpperCase().includes('TRF BATCH MYBB') || false;
}

export function formatRupiah(amount: number): string {
  if (!amount && amount !== 0) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatRupiahShort(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}jt`
  }
  if (Math.abs(amount) >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}rb`
  }
  return formatRupiah(amount)
}

export function parseRupiah(str: string): number {
  if (!str) return 0
  return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0
}
