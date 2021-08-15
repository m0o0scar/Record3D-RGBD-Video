import * as THREE from 'three';
import { Stage } from '@nospoon/3utils';

import ThreeMeshUI from 'three-mesh-ui';
import fontFamily from './assets/fonts/Roboto/Roboto-msdf.json';
import fontTexture from './assets/fonts/Roboto/Roboto-msdf.png';

async function main() {
  const stage = new Stage({ enableGridHelper: true });

  stage.beforeRender(() => {
    ThreeMeshUI.update();
  });

  const container = new ThreeMeshUI.Block({
    width: 1,
    height: 1,
    fontFamily,
    fontTexture,
    fontSize: 0.1
  });
  container.rotation.x = -0.55;
  stage.scene.add(container);

  const child1 = new ThreeMeshUI.Block({
    width: 0.5,
    height: 0.3,
    offset: 0.1,
    borderRadius: 0.1,
    alignContent: 'center',
    justifyContent: 'center'
  });
  const text1 = new ThreeMeshUI.Text({ content: 'Hello' });
  child1.add(text1);
  container.add(child1);
}

main();
