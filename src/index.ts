import * as THREE from "three";
import { Stage } from '@nospoon/3utils';
import { Record3DVideo } from './record3d/rgbd/Record3DVideo';

const stage = new Stage();
stage.renderer.setClearColor(new THREE.Color(0));

const video = new Record3DVideo();
video.depthRange = [0.1, 0.7];
stage.scene.add(video);
video.loadURL('/public/sample2.mp4');
(window as any).video = video;
