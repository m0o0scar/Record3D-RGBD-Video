import * as THREE from "three";
import { InteractiveGroup } from 'three/examples/jsm/interactive/InteractiveGroup';
import { HTMLMesh } from 'three/examples/jsm/interactive/HTMLMesh';
import * as dat from 'dat.gui';
import { Stage } from '@nospoon/3utils';
import { Record3DVideo } from './record3d/rgbd/Record3DVideo';

const DEFAULT_BACKGROUND_COLOR = 0x999999;

const stage = new Stage({ enableGridHelper: true, enableVR: true, enableControllerPointer: true });
stage.renderer.setClearColor(new THREE.Color(DEFAULT_BACKGROUND_COLOR));

const video = new Record3DVideo();
video.position.set(0, 1.5, -1);
stage.scene.add(video);
video.loadURL('/public/sample2.mp4');

const colors = {
  'background': DEFAULT_BACKGROUND_COLOR,
}
const gui = new dat.GUI();
const videoFolder = gui.addFolder('Video');
videoFolder.add(video, 'pointSize', 1, 10, 1);
videoFolder.add(video, 'rangeNear', 0.1, 3, 0.1);
videoFolder.add(video, 'rangeFar', 0.1, 3, 0.1);
videoFolder.addColor(colors, 'background').onChange((backgroundColor) => {
  stage.renderer.setClearColor(new THREE.Color(backgroundColor));
});
videoFolder.open();
gui.domElement.style.visibility = 'hidden';

const interactiveGroup = new InteractiveGroup(stage.renderer, stage.camera);
stage.scene.add(interactiveGroup);
const guiMesh = new HTMLMesh(gui.domElement);
guiMesh.position.set(-1, 1.2, -0.5);
guiMesh.rotation.y = Math.PI / 3;
guiMesh.scale.setScalar(2);
interactiveGroup.add(guiMesh);
