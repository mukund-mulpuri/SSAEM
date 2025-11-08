// Very light CSV parser: assumes no quoted commas inside fields.
export async function readCsvFile(file){
  const text = await file.text()
  return parseCsv(text)
}

export function parseCsv(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(l => l.trim().length)
  if(lines.length === 0) return { headers:[], rows:[] }
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',')
    const obj = {}
    headers.forEach((h, i) => obj[h] = (cols[i]||'').trim())
    return obj
  })
  return { headers, rows }
}

export function toCsv(headers, rows){
  const head = headers.join(',')
  const body = rows.map(r => headers.map(h => String(r[h] ?? '')).join(',')).join('\n')
  return head + '\n' + body
}

export function downloadCsv(filename, headers, rows){
  const blob = new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
