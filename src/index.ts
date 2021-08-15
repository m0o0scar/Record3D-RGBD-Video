import * as THREE from 'three';
import { Stage, VRButton } from '@nospoon/3utils';
import { Record3DVideo } from './record3d/rgbd/Record3DVideo';

const DEFAULT_BACKGROUND_COLOR = 0x333333;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 0, 2);

async function main() {
  const supportVR = await VRButton.isVRSupported();

  // stage
  const stage = new Stage({
    cameraPosition: DEFAULT_CAMERA_POSITION,
    enableVR: supportVR,
    enableControllerPointer: true
  });
  stage.renderer.setClearColor(new THREE.Color(DEFAULT_BACKGROUND_COLOR));

  // rgbd video
  const video = new Record3DVideo();
  video.loadURL('/public/sample.mp4');
  stage.scene.add(video);

  stage.vrButton?.onEnterVR.sub(() => {
    video.position.set(0, 1.5, -0.3);
    video.play();
  });

  stage.vrButton?.onExitVR.sub(() => {
    video.position.set(0, 0, 0);
    video.pause();

    const { x, y, z } = DEFAULT_CAMERA_POSITION;
    stage.camera.position.set(x, y, z);
    stage.orbitControls.update();
  });
}

main();
