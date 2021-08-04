import * as THREE from "three";
import { HTMLMesh } from 'three/examples/jsm/interactive/HTMLMesh';
import * as dat from 'dat.gui';
import { Stage, VRButton } from '@nospoon/3utils';
import { InteractiveGroup } from './three/InteractiveGroup';
import { Record3DVideo } from './record3d/rgbd/Record3DVideo';

const DEFAULT_BACKGROUND_COLOR = 0x999999;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 0, 2);

async function main() {
  const supportVR = await VRButton.isVRSupported();

  // stage
  const stage = new Stage({
    cameraPosition: DEFAULT_CAMERA_POSITION,
    enableGridHelper: true,
    enableVR: supportVR,
    enableControllerPointer: true,
  });
  stage.renderer.setClearColor(new THREE.Color(DEFAULT_BACKGROUND_COLOR));

  // rgbd video
  const video = new Record3DVideo();
  video.loadURL('/public/sample2.mp4');
  stage.scene.add(video);

  // gui
  const gui = new dat.GUI();
  const guiContainer = gui.domElement.parentElement as HTMLElement;
  guiContainer.style.zIndex = '999999';
  const pointCloudFolder = gui.addFolder('Point Cloud');
  pointCloudFolder.add(video, 'pointSize', 1, 10, 1);
  pointCloudFolder.add(video, 'rangeNear', 0.1, 3, 0.1);
  pointCloudFolder.add(video, 'rangeFar', 0.1, 3, 0.1);
  pointCloudFolder.open();
  const videoFolder = gui.addFolder('Video');
  videoFolder.add(video, 'muted');
  videoFolder.open();

  // VR interaction
  const interactiveGroup = new InteractiveGroup(stage.renderer, stage.camera);
  stage.scene.add(interactiveGroup);
  const guiMesh = new HTMLMesh(gui.domElement);
  guiMesh.position.set(-1, 1.2, -0.5);
  guiMesh.rotation.y = Math.PI / 3;
  guiMesh.scale.setScalar(2);

  stage.vrButton?.onEnterVR.sub(() => {
    guiContainer.style.visibility = 'hidden';
    interactiveGroup.setupEventHandlers();
    interactiveGroup.add(guiMesh);

    video.position.set(0, 1.5, -1);
  });

  stage.vrButton?.onExitVR.sub(() => {
    guiContainer.style.visibility = 'visible';
    interactiveGroup.removeEventHandlers();
    interactiveGroup.remove(guiMesh);

    video.position.set(0, 0, 0);

    const {x, y, z} = DEFAULT_CAMERA_POSITION;
    stage.camera.position.set(x, y, z);
  });
}

main();
