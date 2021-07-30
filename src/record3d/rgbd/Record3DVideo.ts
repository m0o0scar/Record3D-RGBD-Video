import * as THREE from 'three';
import { getPointCloudShaderMaterial } from './pointcloud-material';
import { Record3DVideoSource } from './Record3DVideoSource';

export class Record3DVideo {
  videoObject: THREE.Group;
  #videoSource: Record3DVideoSource;
  #videoTexture: THREE.VideoTexture;
  #videoMaterial: THREE.ShaderMaterial;

  constructor() {
    this.videoObject = new THREE.Group();
    this.#videoMaterial = getPointCloudShaderMaterial();
  }

  async loadURL(url: string) {
    // TODO show loading screen
    const source = new Record3DVideoSource();
    await source.loadURL(url);
    this.setVideoSource(source);
  }

  toggle(value = undefined) {
    this.#videoSource.toggle(value);
  }

  setScale(scale: number) {
    this.setMaterialUniforms((uniforms) => (uniforms.scale.value = scale));
  }

  setPointSize(ptSize: number) {
    this.setMaterialUniforms((uniforms) => (uniforms.ptSize.value = ptSize));
  }

  setDepthRange(near: number, far: number) {
    this.setMaterialUniforms((uniforms) => {
      uniforms.depthRangeFilterNear.value = near;
      uniforms.depthRangeFilterFar.value = far;
    });
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
  }

  private removeVideoObjectChildren() {
    while (this.videoObject.children.length > 0) {
      this.videoObject.remove(this.videoObject.children[0]);
    }
  }

  private renderPoints() {
    this.removeVideoObjectChildren();

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
    this.videoObject.add(points);
  }

  private setMaterialUniforms(setter: (uniforms: any) => void) {
    for (const video of this.videoObject.children) {
      setter(((video as THREE.Points).material as any).uniforms);
    }
  }
}
