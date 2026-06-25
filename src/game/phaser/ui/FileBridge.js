import { downloadJSON as canonicalDownloadJSON, downloadText as canonicalDownloadText, readJSONFile } from '../../../core/io/ImportExport.js';

export class FileBridge {
  constructor({ accept = 'application/json', onFile, onLoad, onError } = {}) {
    this.onFile = onFile;
    this.onLoad = onLoad;
    this.onError = onError;
    this.input = document.createElement('input');
    this.input.type = 'file';
    this.input.accept = accept;
    this.input.hidden = true;
    this.input.className = 'phaser-hidden-file-input';
    document.body.appendChild(this.input);
    this.input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (file) await this.handleFile(file);
      this.input.value = '';
    };
  }

  open() {
    this.input.click();
  }

  chooseJsonFile({ accept = 'application/json', onLoad, onError } = {}) {
    this.input.accept = accept;
    this.onLoad = onLoad ?? this.onLoad;
    this.onError = onError ?? this.onError;
    this.open();
  }

  async handleFile(file) {
    try {
      if (this.onFile) await this.onFile(file);
      if (this.onLoad) this.onLoad(await readJsonFile(file), file);
    } catch (error) {
      this.onError?.(error, file);
    }
  }

  downloadJson(filename, data) {
    downloadJson(filename, data);
  }

  downloadText(filename, text, mimeType = 'text/plain') {
    downloadText(filename, text, mimeType);
  }

  destroy() {
    this.input.remove();
  }
}

export async function readJsonFile(file) {
  return readJSONFile(file);
}

export function downloadJson(filename, data) {
  canonicalDownloadJSON(filename, data);
}

export function downloadText(filename, text, mimeType = 'text/plain') {
  canonicalDownloadText(filename, text, mimeType);
}