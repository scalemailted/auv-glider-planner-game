export function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
export function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
export function normalize(x,y){const mag=Math.hypot(x,y);return mag<=1e-9?[0,0]:[x/mag,y/mag];}
export function deepClone(obj){return JSON.parse(JSON.stringify(obj));}
