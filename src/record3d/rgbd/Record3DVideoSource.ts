import * as THREE from 'three';
import { md5 } from 'hash-wasm';
import { CacheStorage } from '../../utils/CacheStorage';
import { fetch, onProgressCallback } from '../../utils/fetch';

const cache = new CacheStorage('videos');

export class Record3DVideoSource {
  isVideoLoaded = false;
  intrMat: THREE.Matrix3;
  videoTag: HTMLVideoElement;

  onVideoChange?: () => void;

  #lastVideoSize = { width: 0, height: 0 };

  #hash?: string;

  constructor() {
    this.intrMat = new THREE.Matrix3();

    this.videoTag = document.createElement('video');
    // this.videoTag.autoplay = true;
    // this.videoTag.muted = true;
    this.videoTag.loop = true;
    this.videoTag.playsInline = true;
    this.videoTag.setAttribute('playsinline', '');
    this.videoTag.onloadeddata = () => {
      this.isVideoLoaded = true;
      this.#lastVideoSize = { width: this.videoTag.videoWidth, height: this.videoTag.videoHeight };
      this.onVideoChange?.();
    };
  }

  async loadURL(videoURL: string, onProgress?: onProgressCallback) {
    const file = await fetch(videoURL, { cache, onProgress });
    if (file) await this.loadFile(file);
  }

  loadFile(videoFile: Blob): Promise<void> {
    return new Promise((resolve) => {
      const dataURLReader = new FileReader();
      dataURLReader.onload = (e) => {
        this.videoTag.src = e.target?.result as string;
      };
      dataURLReader.readAsDataURL(videoFile);

      const binaryMetadataReader = new FileReader();
      binaryMetadataReader.onload = async (e) => {
        const fileContents = e.target?.result as string;

        // calculate md5 hash of the file (only calculate the first 1M for performance consideration)
        this.#hash = await md5(fileContents.slice(0, 1024 * 1024));

        let meta = fileContents.substr(fileContents.lastIndexOf('{"intrinsic'));
        meta = meta.substr(0, meta.length - 1);
        const metadata = JSON.parse(meta);
        this.intrMat.elements = metadata['intrinsicMatrix'];
        this.intrMat.transpose();
        resolve();
      };
      binaryMetadataReader.readAsBinaryString(videoFile);
    });
  }

  get hash() {
    return this.#hash;
  }

  get muted() {
    return this.videoTag.muted;
  }

  set muted(value: boolean) {
    this.videoTag.muted = value;
  }

  getVideoSize() {
    const { width, height } = this.#lastVideoSize;
    return { width: width / 2, height };
  }
}
