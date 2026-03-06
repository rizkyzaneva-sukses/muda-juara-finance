// Parse 3-digit code from QRIS amount
export function parseQRISCode(amount) {
  const lastThree = amount % 1000;
  const ministryDigit = Math.floor(lastThree / 100);
  const txCode = lastThree % 100;

  const ministryCode = String(ministryDigit).padStart(2, '0');
  const transactionCode = String(txCode).padStart(2, '0');

  const validMinistry = ['01','02','03','04','05','06','07','08','09'];
  const validTx = ['10','11','12','13','15','16','17','96','97'];

  if (validMinistry.includes(ministryCode) && validTx.includes(transactionCode)) {
    return { ministryCode, transactionCode, status: 'valid' };
  }
  return { ministryCode: null, transactionCode: null, status: 'cek_manual' };
}

// Parse QRIS Excel file rows
export function parseQRISRows(rows) {
  return rows.map(row => {
    const amount = parseInt(row['AMOUNT'] || row['amount'] || 0);
    const parsed = parseQRISCode(amount);
    return {
      created_date: row['CREATED_DATE'] || row['created_date'],
      merchant_name: row['MERCHANT_NAME'] || row['merchant_name'] || 'Muda Juara',
      merchant_id: row['MERCHANT_ID'] || row['merchant_id'],
      tid: row['TID'] || row['tid'],
      amount,
      ministryCode: parsed.ministryCode,
      transactionCode: parsed.transactionCode,
      status: parsed.status
    };
  });
}
