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
    downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json');
  }

  downloadText(filename, text, mimeType = 'text/plain') {
    downloadBlob(filename, text, mimeType);
  }

  destroy() {
    this.input.remove();
  }
}

export async function readJsonFile(file) {
  return JSON.parse(await file.text());
}

export function downloadJson(filename, data) {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json');
}

export function downloadText(filename, text, mimeType = 'text/plain') {
  downloadBlob(filename, text, mimeType);
}

function downloadBlob(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
