import * as THREE from 'three';
import { getPointCloudShaderMaterial } from './pointcloud-material';
import { Record3DVideoSource } from './Record3DVideoSource';

function distanceToPointSize(distance: number) {
  if (distance < 1) return 10;
  if (distance > 3) return 1;
  return distance * -4.5 + 14.5;
}

export class Record3DVideo extends THREE.Group {
  depthRange: number[] = [0.1, 1];

  #videoObject: THREE.Group;
  #videoMaterial: THREE.ShaderMaterial;
  #videoSource?: Record3DVideoSource;
  #videoTexture?: THREE.VideoTexture;

  #rangeBox: THREE.Mesh;

  constructor() {
    super();
    this.#videoObject = new THREE.Group();
    this.#videoMaterial = getPointCloudShaderMaterial();
    this.add(this.#videoObject);

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    this.#rangeBox = new THREE.Mesh(boxGeometry, boxMaterial);
    this.add(this.#rangeBox);
  }

  async loadURL(url: string) {
    // TODO show loading screen
    const source = new Record3DVideoSource();
    await source.loadURL(url);
    this.setVideoSource(source);
    this.setDepthRange(this.depthRange);
  }

  adjustPointSize(cameraPosition: THREE.Vector3) {
    if (this.#videoSource) {
      const resolution = this.#videoSource.getVideoSize().height;
      const multiplier = 640 / resolution;
      const distance = this.position.distanceTo(cameraPosition);
      const pointSize = distanceToPointSize(distance) * multiplier;
      this.setPointSize(pointSize);
    }
  }

  toggle(value = undefined) {
    this.#videoSource?.toggle(value);
  }

  setScale(scale: number) {
    this.setMaterialUniforms((uniforms) => (uniforms.scale.value = scale));
  }

  setPointSize(ptSize: number) {
    this.setMaterialUniforms((uniforms) => (uniforms.ptSize.value = ptSize));
  }

  setDepthRange(range: number[]) {
    this.depthRange = range;
    const [near, far] = this.depthRange;
    const size = far - near;

    this.setMaterialUniforms((uniforms) => {
      uniforms.depthRangeFilterNear.value = near;
      uniforms.depthRangeFilterFar.value = far;
    });

    this.#videoObject.position.z = near + size / 2;
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
