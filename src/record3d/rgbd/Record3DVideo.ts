import * as THREE from 'three';
import { getPointCloudShaderMaterial } from './pointcloud-material';
import { Record3DVideoSource } from './Record3DVideoSource';

export class Record3DVideo extends THREE.Group {
  #videoObject: THREE.Group;
  #videoMaterial: THREE.ShaderMaterial;
  #videoSource?: Record3DVideoSource;
  #videoTexture?: THREE.VideoTexture;

  #pointSize = 1;
  #rangeNear = 0.1;
  #rangeFar = 1;

  #rangeBox: THREE.LineSegments;

  constructor() {
    super();
    this.#videoObject = new THREE.Group();
    this.#videoMaterial = getPointCloudShaderMaterial();
    this.add(this.#videoObject);

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
    const boxMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, opacity: 0.5, transparent: true });
    this.#rangeBox = new THREE.LineSegments(boxEdges, boxMaterial);
  }

  async loadURL(url: string) {
    // TODO show loading screen
    const source = new Record3DVideoSource();
    await source.loadURL(url);
    this.setVideoSource(source);

    this.updateDepthRange();
  }

  get pointSize() {
    return this.#pointSize;
  }

  set pointSize(value: number) {
    this.#pointSize = value;
    this.setMaterialUniforms((uniforms) => (uniforms.ptSize.value = value));
  }

  get rangeNear() {
    return this.#rangeNear;
  }

  set rangeNear(value: number) {
    this.#rangeNear = Math.min(value, this.#rangeFar);
    this.updateDepthRange();
  }

  get rangeFar() {
    return this.#rangeFar;
  }

  set rangeFar(value: number) {
    this.#rangeFar = Math.max(value, this.#rangeNear);
    this.updateDepthRange();
  }

  get muted() {
    if (!this.#videoSource) return true;
    else return this.#videoSource.muted;
  }

  set muted(value: boolean) {
    if (this.#videoSource) {
      this.#videoSource.muted = value;
    }
  }

  setScale(scale: number) {
    this.setMaterialUniforms((uniforms) => (uniforms.scale.value = scale));
  }

  private updateDepthRange() {
    const size = this.#rangeFar - this.#rangeNear;

    this.setMaterialUniforms((uniforms) => {
      uniforms.depthRangeFilterNear.value = this.#rangeNear;
      uniforms.depthRangeFilterFar.value = this.#rangeFar;
    });

    this.#videoObject.position.z = this.#rangeNear;
    this.#rangeBox.position.z = -size/2;
    this.#rangeBox.scale.set(size, size, size);
  }

  private setVideoSource(videoSource: Record3DVideoSource) {
    if (this.#videoSource !== videoSource) {
      this.#videoSource = videoSource;

      videoSource.onVideoChange = () => {
        this.onVideoTagChanged();
      };
    }

    if (videoSource.isVideoLoaded) {
      this.onVideoTagChanged();
    }

    this.renderPoints();
  }

  private onVideoTagChanged() {
    if (this.#videoSource) {
      const { videoTag } = this.#videoSource;
      const { videoWidth, videoHeight } = videoTag;

      this.#videoTexture = new THREE.VideoTexture(videoTag);
      this.#videoTexture.minFilter = THREE.LinearFilter;
      this.#videoTexture.magFilter = THREE.LinearFilter;
      this.#videoTexture.format = THREE.RGBFormat;

      this.#videoSource.videoTag.play();

      this.#videoMaterial.uniforms.texSize.value = [videoWidth, videoHeight];
      this.#videoMaterial.uniforms.texImg.value = this.#videoTexture;

      const intrinsicMatrix = this.#videoSource.intrMat;
      const ifx = 1.0 / intrinsicMatrix.elements[0];
      const ify = 1.0 / intrinsicMatrix.elements[4];
      const itx = -intrinsicMatrix.elements[2] / intrinsicMatrix.elements[0];
      const ity = -intrinsicMatrix.elements[5] / intrinsicMatrix.elements[4];

      this.#videoMaterial.uniforms.iK.value = [ifx, ify, itx, ity];

      this.renderPoints();
      
      this.add(this.#rangeBox);
    }
  }

  private removeVideoObjectChildren() {
    while (this.#videoObject.children.length > 0) {
      this.#videoObject.remove(this.#videoObject.children[0]);
    }
  }

  private renderPoints() {
    this.removeVideoObjectChildren();

    if (this.#videoSource) {
      let { width, height } = this.#videoSource.getVideoSize();
      let numPoints = width * height;

      const buffIndices = new Uint32Array(numPoints);
      const buffPointIndicesAttr = new Float32Array(numPoints);

      for (let ptIdx = 0; ptIdx < numPoints; ptIdx++) {
        buffIndices[ptIdx] = ptIdx;
        // buffPointIndicesAttr[ptIdx] = parseFloat(ptIdx);
        buffPointIndicesAttr[ptIdx] = ptIdx;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('vertexIdx', new THREE.Float32BufferAttribute(buffPointIndicesAttr, 1));
      geometry.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(buffIndices), 1));

      const points = new THREE.Points(geometry, this.#videoMaterial);
      points.frustumCulled = false;
      this.#videoObject.add(points);
    }
  }

  private setMaterialUniforms(setter: (uniforms: any) => void) {
    for (const video of this.#videoObject.children) {
      setter(((video as THREE.Points).material as any).uniforms);
    }
  }
}
