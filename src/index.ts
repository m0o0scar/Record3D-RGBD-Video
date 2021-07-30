import { Stage } from '@nospoon/3utils';
import { Record3DVideo } from './record3d/rgbd/Record3DVideo';

const stage = new Stage({ enableAxesHelper: true, enableGridHelper: true });

const video = new Record3DVideo();
stage.scene.add(video.videoObject);
video.loadURL('/public/sample.mp4');
