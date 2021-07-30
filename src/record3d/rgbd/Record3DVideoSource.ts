import * as THREE from 'three';

export class Record3DVideoSource {
  isVideoLoaded = false;
  intrMat: THREE.Matrix3;
  videoTag: HTMLVideoElement;

  onVideoChange: () => void;

  #lastVideoSize = { width: 0, height: 0 };

  constructor() {
    this.intrMat = new THREE.Matrix3();

    this.videoTag = document.createElement('video');
    // this.videoTag.autoplay = true;
    this.videoTag.muted = true;
    this.videoTag.loop = true;
    this.videoTag.playsInline = true;
    this.videoTag.setAttribute('playsinline', '');
    this.videoTag.onloadeddata = () => {
      this.isVideoLoaded = true;
      this.#lastVideoSize = { width: this.videoTag.videoWidth, height: this.videoTag.videoHeight };
      this.onVideoChange();
    };
  }

  async loadURL(videoURL: string) {
    const response = await fetch(videoURL);
    const file = await response.blob();
    this.loadFile(file);
  }

  loadFile(videoFile: Blob) {
    const dataURLReader = new FileReader();
    dataURLReader.onload = (e) => {
      this.videoTag.src = e.target.result as string;
    };
    dataURLReader.readAsDataURL(videoFile);

    const binaryMetadataReader = new FileReader();
    binaryMetadataReader.onload = (e) => {
      const fileContents = e.target.result as string;
      let meta = fileContents.substr(fileContents.lastIndexOf('{"intrinsic'));
      meta = meta.substr(0, meta.length - 1);
      const metadata = JSON.parse(meta);
      this.intrMat.elements = metadata['intrinsicMatrix'];
      this.intrMat.transpose();
    };
    binaryMetadataReader.readAsBinaryString(videoFile);
  }

  toggle(value = undefined) {
    switch (value) {
      case undefined: {
        if (this.videoTag.paused) this.videoTag.play();
        else this.videoTag.pause();
        break;
      }

      case true:
        this.videoTag.play();
        break;
      case false:
        this.videoTag.pause();
        break;

      default:
        break;
    }
  }

  toggleAudio() {
    this.videoTag.muted = !this.videoTag.muted;
  }

  getVideoSize() {
    const { width, height } = this.#lastVideoSize;
    return { width: width / 2, height };
  }
}
