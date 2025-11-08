import { Store } from './store.js'
import { downloadCsv } from './csv.js'

export function downloadSummary(){
  const { subjects, allotments } = Store.get()
  const counts = subjects.map(s => ({
    code: s.code,
    name: s.name,
    capacity: s.capacity,
    allocated: allotments.filter(a => a.subjectCode === s.code).length,
  })).map(r => ({ ...r, utilization: r.capacity ? Math.round((r.allocated / r.capacity) * 100) : 0 }))
  const headers = ['code','name','capacity','allocated','utilization']
  downloadCsv('summary.csv', headers, counts)
}

export function downloadUnassigned(){
  const { allotments } = Store.get()
  const rows = allotments.filter(a => a.status === 'UNASSIGNED').map(a => ({ roll: a.roll, reason: a.reason || '' }))
  downloadCsv('unassigned.csv', ['roll','reason'], rows)
}

export function downloadSubjectRoster(code){
  const { allotments } = Store.get()
  const rows = allotments.filter(a => a.subjectCode === code).map(a => ({ roll: a.roll }))
  downloadCsv(`${code}.csv`, ['roll'], rows)
}
