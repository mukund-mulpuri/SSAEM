// Simple in-memory store with localStorage persistence
const KEY = 'ssaems-store-v1'

const initial = {
  students: [],        // [{roll,name,percentage,preferences:[...]}]
  subjects: [],        // [{code,name,capacity,eligibleBranches:[],minCgpa:0}]
  allotments: []       // [{roll,subjectCode,status,rankGiven,reason,updatedAt}]
}

function load(){
  try{
    const raw = localStorage.getItem(KEY)
    if(!raw) return {...initial}
    const parsed = JSON.parse(raw)
    return { ...initial, ...parsed }
  }catch(e){
    return {...initial}
  }
}

let state = load()

function save(){ localStorage.setItem(KEY, JSON.stringify(state)) }

export const Store = {
  get(){ return state },
  set(partial){ state = { ...state, ...partial }; save(); },
  reset(){ state = {...initial}; save(); }
}
