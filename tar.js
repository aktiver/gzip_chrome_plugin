// tar.js — standalone browser-compatible TAR builder (no Node.js required)

class Tar {
  constructor(recordsPerBlock = 20) {
    this.recordSize = 512;
    this.blockSize = recordsPerBlock * this.recordSize;
    this.written = 0;
    this.out = this._clean(this.blockSize);
  }

  _clean(length) {
    return new Uint8Array(length);
  }

  _extend(orig, length, addLength, multipleOf) {
    const newSize = length + addLength;
    const buffer = this._clean((Math.floor(newSize / multipleOf) + 1) * multipleOf);
    buffer.set(orig);
    return buffer;
  }

  _pad(num, bytes, base = 8) {
    num = num.toString(base);
    return "000000000000".substr(num.length + 12 - bytes) + num;
  }

  _stringToUint8(str, out, offset = 0) {
    out = out || this._clean(str.length);
    for (let i = 0; i < str.length; i++) {
      out[offset++] = str.charCodeAt(i);
    }
    return out;
  }

  _formatHeader(data) {
    const headerFormat = [
      { field: 'fileName', length: 100 },
      { field: 'fileMode', length: 8 },
      { field: 'uid', length: 8 },
      { field: 'gid', length: 8 },
      { field: 'fileSize', length: 12 },
      { field: 'mtime', length: 12 },
      { field: 'checksum', length: 8 },
      { field: 'type', length: 1 },
      { field: 'linkName', length: 100 },
      { field: 'ustar', length: 8 },
      { field: 'owner', length: 32 },
      { field: 'group', length: 32 },
      { field: 'majorNumber', length: 8 },
      { field: 'minorNumber', length: 8 },
      { field: 'filenamePrefix', length: 155 },
      { field: 'padding', length: 12 }
    ];

    const buffer = this._clean(512);
    let offset = 0;

    headerFormat.forEach(({ field, length }) => {
      const str = data[field] || "";
      for (let i = 0; i < str.length; i++) {
        buffer[offset++] = str.charCodeAt(i);
      }
      offset += length - str.length;
    });

    return buffer;
  }

  append(filepath, input, opts = {}, callback = null) {
    if (typeof input === 'string') {
      input = this._stringToUint8(input);
    } else if (!(input instanceof Uint8Array)) {
      throw new Error('Input must be a string or Uint8Array');
    }

    const mode = opts.mode || parseInt('777', 8) & 0xfff;
    const mtime = opts.mtime || Math.floor(Date.now() / 1000);
    const uid = opts.uid || 0;
    const gid = opts.gid || 0;

    const headerData = {
      fileName: filepath,
      fileMode: this._pad(mode, 7),
      uid: this._pad(uid, 7),
      gid: this._pad(gid, 7),
      fileSize: this._pad(input.length, 11),
      mtime: this._pad(mtime, 11),
      checksum: '        ',
      type: '0',
      ustar: 'ustar  ',
      owner: opts.owner || '',
      group: opts.group || ''
    };

    let checksum = 0;
    const rawHeader = this._formatHeader(headerData);
    for (let i = 0; i < rawHeader.length; i++) {
      checksum += rawHeader[i];
    }

    const checksumStr = this._pad(checksum, 6) + '\0 ';
    this._stringToUint8(checksumStr, rawHeader, 148);

    // Extend buffer if needed
    if (this.written + rawHeader.length + input.length > this.out.length) {
      this.out = this._extend(this.out, this.written, rawHeader.length + input.length, this.blockSize);
    }

    this.out.set(rawHeader, this.written);
    this.written += rawHeader.length;

    this.out.set(input, this.written);
    this.written += input.length;

    const remainder = this.recordSize - (input.length % this.recordSize || this.recordSize);
    this.written += remainder;

    if (this.out.length - this.written < this.recordSize * 2) {
      this.out = this._extend(this.out, this.written, this.recordSize * 2, this.blockSize);
    }

    if (callback) callback(this.out);

    return this.out;
  }

  clear() {
    this.written = 0;
    this.out = this._clean(this.blockSize);
  }
}

window.Tar = Tar;
