import * as THREE from 'three';
import { Stage, VRButton } from '@nospoon/3utils';
import { Record3DVideo } from './record3d/rgbd/Record3DVideo';

import ThreeMeshUI from 'three-mesh-ui';
import FontJSON from './assets/fonts/Roboto/Roboto-msdf.json';
import FontImage from './assets/fonts/Roboto/Roboto-msdf.png';

const DEFAULT_BACKGROUND_COLOR = 0x333333;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 0, 2);

function makePanel(stage: Stage) {
  const container = new ThreeMeshUI.Block({
    justifyContent: 'center',
    alignContent: 'center',
    contentDirection: 'row-reverse',
    fontFamily: FontJSON,
    fontTexture: FontImage,
    fontSize: 0.07,
    padding: 0.02,
    borderRadius: 0.11
  });

  container.position.set(0, 0.6, -0.3);
  container.rotation.x = -0.55;
  stage.scene.add(container);

  const buttonOptions = {
    width: 0.4,
    height: 0.15,
    justifyContent: 'center',
    alignContent: 'center',
    offset: 0.05,
    margin: 0.02,
    borderRadius: 0.075
  };

  const buttonNext = new ThreeMeshUI.Block(buttonOptions);
  const buttonPrevious = new ThreeMeshUI.Block(buttonOptions);

  buttonNext.add(new ThreeMeshUI.Text({ content: 'next' }));
  buttonPrevious.add(new ThreeMeshUI.Text({ content: 'previous' }));

  container.add(buttonNext, buttonPrevious);
}

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

  makePanel(stage);
}

main();
