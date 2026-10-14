import type {ImportHabits} from './statements';
import {narrationDefaults} from './statements';
export function defaultImportHabits():ImportHabits{return {version:1,vendors:[],narrations:structuredClone(narrationDefaults),morningEnabled:true,morningStart:'08:45',morningEnd:'10:30',morningAutoPost:false,unusualMultiplier:3};}
