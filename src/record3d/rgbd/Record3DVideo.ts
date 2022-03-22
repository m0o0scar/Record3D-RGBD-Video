import * as THREE from 'three';
import { getPointCloudShaderMaterial } from './pointcloud-material';
import { Record3DVideoSource } from './Record3DVideoSource';

export class Record3DVideo extends THREE.Group {
  #videoObject: THREE.Group;
  #videoMaterial: THREE.ShaderMaterial;
  #videoSource?: Record3DVideoSource;
  #videoTexture?: THREE.VideoTexture;

  #pointSize = 1;
  #flatness = 1;
  #rangeNear = 0.1;
  #rangeFar = 1.1;
  #showDepthMap = false;

  #rangeBox: THREE.LineSegments;
  #progressBar: THREE.Mesh;

  constructor() {
    super();
    this.#videoObject = new THREE.Group();
    this.#videoMaterial = getPointCloudShaderMaterial();
    this.add(this.#videoObject);

    const size = this.#rangeFar - this.#rangeNear;

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
    const boxMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, opacity: 0.5, transparent: true });
    this.#rangeBox = new THREE.LineSegments(boxEdges, boxMaterial);
    this.#rangeBox.position.z = -size / 2;
    this.add(this.#rangeBox);

    const progressBarHeight = 0.02;
    this.#progressBar = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(size, progressBarHeight, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    this.#progressBar.position.y = -(size + progressBarHeight) / 2;
    this.#progressBar.scale.x = 0;
    this.add(this.#progressBar);
  }

  async loadURL(url: string) {
    const source = new Record3DVideoSource();
    await source.loadURL(url, (_loaded, _total, progress) => {
      if (progress === 1) {
        this.#progressBar.scale.x = 0;
      } else {
        this.#progressBar.scale.x = progress;
        this.#progressBar.position.x = (progress - 1) / 2;
      }
    });
    this.setVideoSource(source);

    this.updateDepthRange();
  }

  get hash() {
    return this.#videoSource?.hash || '';
  }

  get pointSize() {
    return this.#pointSize;
  }

  set pointSize(value: number) {
    this.#pointSize = value;
    this.setMaterialUniforms(uniforms => uniforms.ptSize.value = value);
  }

  get flatness() {
    return this.#flatness;
  }

  set flatness(value: number) {
    this.#flatness = value;
    this.setMaterialUniforms(uniforms => uniforms.flatness.value = value);
  }

  get showDepthMap() {
    return this.#showDepthMap;
  }

  set showDepthMap(value: boolean) {
    this.#showDepthMap = value;
    this.setMaterialUniforms(uniforms => uniforms.showDepthMap.value = value);
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
    if (!this.#videoSource) return false;
    else return this.#videoSource.muted;
  }

  set muted(value: boolean) {
    if (this.#videoSource) {
      this.#videoSource.muted = value;
    }
  }

  play() {
    this.#videoSource?.videoTag.play();
  }

  pause() {
    this.#videoSource?.videoTag.pause();
  }

  toggle() {
    if (this.#videoSource) {
      if (this.#videoSource.videoTag.paused) {
        this.#videoSource.videoTag.play();
      } else {
        this.#videoSource.videoTag.pause();
      }
    }
  }

  setScale(scale: number) {
    this.setMaterialUniforms(uniforms => uniforms.scale.value = scale);
  }

  private updateDepthRange() {
    const size = this.#rangeFar - this.#rangeNear;

    this.setMaterialUniforms(uniforms => {
      uniforms.depthRangeFilterNear.value = this.#rangeNear;
      uniforms.depthRangeFilterFar.value = this.#rangeFar;
    });

    this.#videoObject.position.z = this.#rangeNear;
    this.#rangeBox.position.z = -size / 2;
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

    this.render();
  }

  private onVideoTagChanged() {
    if (this.#videoSource) {
      const { videoTag } = this.#videoSource;
      const { videoWidth, videoHeight } = videoTag;

      this.#videoTexture = new THREE.VideoTexture(videoTag);
      this.#videoTexture.minFilter = THREE.LinearFilter;
      this.#videoTexture.magFilter = THREE.LinearFilter;
      this.#videoTexture.format = THREE.RGBFormat;

      const { duration } = this.#videoSource.videoTag;
      this.#videoSource.videoTag.currentTime = Math.min(1, duration);

      this.#videoMaterial.uniforms.texSize.value = [videoWidth, videoHeight];
      this.#videoMaterial.uniforms.texImg.value = this.#videoTexture;

      const intrinsicMatrix = this.#videoSource.intrMat;
      const ifx = 1.0 / intrinsicMatrix.elements[0];
      const ify = 1.0 / intrinsicMatrix.elements[4];
      const itx = -intrinsicMatrix.elements[2] / intrinsicMatrix.elements[0];
      const ity = -intrinsicMatrix.elements[5] / intrinsicMatrix.elements[4];

      this.#videoMaterial.uniforms.iK.value = [ifx, ify, itx, ity];

      this.render();
    }
  }

  private removeVideoObjectChildren() {
    while (this.#videoObject.children.length > 0) {
      this.#videoObject.remove(this.#videoObject.children[0]);
    }
  }

  private render() {
    // this.renderMesh();
    this.renderPoints();
  }

  private renderPoints() {
    this.removeVideoObjectChildren();

    if (this.#videoSource) {
      const { width, height } = this.#videoSource.getVideoSize();
      const numPoints = width * height;

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

  private renderMesh() {
    this.removeVideoObjectChildren();

    if (this.#videoSource) {
      const { width, height } = this.#videoSource.getVideoSize();
      const numPoints = width * height;

      const buffIndices = new Uint32Array((width - 1) * (height - 1) * 6);
      const buffPointIndicesAttr = new Float32Array(numPoints);

      for (let ptIdx = 0; ptIdx < numPoints; ptIdx++) {
        buffPointIndicesAttr[ptIdx] = ptIdx;
      }

      let indicesIdx = 0;
      const numRows = height;
      const numCols = width;
      for (let row = 1; row < numRows; row++) {
        for (let col = 0; col < numCols - 1; col++) {
          const tlIdx = (row - 1) * numCols + col;
          const trIdx = tlIdx + 1;

          const blIdx = row * numCols + col;
          const brIdx = blIdx + 1;

          buffIndices[indicesIdx++] = blIdx;
          buffIndices[indicesIdx++] = trIdx;
          buffIndices[indicesIdx++] = tlIdx;

          buffIndices[indicesIdx++] = blIdx;
          buffIndices[indicesIdx++] = brIdx;
          buffIndices[indicesIdx++] = trIdx;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('vertexIdx', new THREE.Float32BufferAttribute(buffPointIndicesAttr, 1));
      geometry.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(buffIndices), 1));

      const mesh = new THREE.Mesh(geometry, this.#videoMaterial);
      mesh.frustumCulled = false;
      this.#videoObject.add(mesh);
    }
  }

  private setMaterialUniforms(setter: (uniforms: any) => void) {
    for (const video of this.#videoObject.children) {
      setter(((video as THREE.Points).material as any).uniforms);
    }
  }
}
