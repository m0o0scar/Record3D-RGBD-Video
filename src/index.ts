import * as THREE from "three";
import { Stage } from '@nospoon/3utils';
import { Record3DVideo } from './record3d/rgbd/Record3DVideo';

const stage = new Stage({ enableAxesHelper: true, enableGridHelper: true });

const video = new Record3DVideo();
video.depthRange = [0.1, 3];
stage.scene.add(video);
video.loadURL('/public/sample.mp4');
(window as any).video = video;

stage.beforeRender(() => {
  video.adjustPointSize(stage.camera.position);
});