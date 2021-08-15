import * as THREE from 'three';
import { InteractiveGroup } from 'three/examples/jsm/interactive/InteractiveGroup';
import { HTMLMesh } from 'three/examples/jsm/interactive/HTMLMesh';
import * as dat from 'dat.gui';
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
  stage.scene.add(video);

  function saveConfig(name: string, value: any) {
    const key = video.hash;
    if (!key) return;

    const raw = localStorage.getItem(key);
    const config = raw ? JSON.parse(raw) : {};
    config[name] = value;
    localStorage.setItem(key, JSON.stringify(config));
  }

  function getConfig() {
    const key = video.hash;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  }

  // UI controls
  const controls = new dat.GUI({ width: 200 });
  controls.addFolder('Rotation');
  controls
    .add(video.rotation, 'x', -Math.PI / 4, Math.PI / 4, 0.1)
    .onChange((value) => saveConfig('rotation.x', value));
  controls.addFolder('Point Cloud');
  controls.add(video, 'pointSize', 1, 5, 1).onChange((value) => saveConfig('pointSize', value));
  controls.add(video, 'rangeFar', 1, 5).onChange((value) => saveConfig('rangeFar', value));
  controls.addFolder('Video');
  controls.add(video, 'muted');

  video.loadURL('/public/sample.mp4').then(() => {
    const config = getConfig();
    video.rotation.x = parseFloat(config['rotation.x'] || 0);
    video.pointSize = parseFloat(config['pointSize'] || 1);
    video.rangeFar = parseFloat(config['rangeFar'] || 1);
    controls.updateDisplay();
  });

  stage.vrButton?.onEnterVR.sub(() => {
    // render UI controls inside VR
    const interactiveGroup = new InteractiveGroup(stage.renderer, stage.camera);
    stage.scene.add(interactiveGroup);
    controls.domElement.style.visibility = 'hidden';
    const controlsMesh = new HTMLMesh(controls.domElement);
    controlsMesh.position.set(-0.75, 1.5, -0.2);
    controlsMesh.rotation.y = Math.PI / 4;
    controlsMesh.scale.setScalar(2);
    interactiveGroup.add(controlsMesh);

    // adjust video position and start playing
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
