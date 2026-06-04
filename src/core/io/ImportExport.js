export async function loadJSON(url){const response=await fetch(url);if(!response.ok)throw new Error(`Failed to load ${url}: ${response.status}`);return response.json();}
export async function readJSONFile(file){const text=await file.text();return JSON.parse(text);}
export function downloadJSON(filename,data){downloadText(filename,JSON.stringify(data,null,2),'application/json');}
export function downloadText(filename,text,mimeType='text/plain'){const blob=new Blob([text],{type:mimeType});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
