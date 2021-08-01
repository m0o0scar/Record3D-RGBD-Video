import * as THREE from "three";
import * as dat from 'dat.gui';
import { Stage } from '@nospoon/3utils';
import { Record3DVideo } from './record3d/rgbd/Record3DVideo';

const DEFAULT_BACKGROUND_COLOR = 0x000000;

const stage = new Stage();
stage.renderer.setClearColor(new THREE.Color(DEFAULT_BACKGROUND_COLOR));

const video = new Record3DVideo();
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
