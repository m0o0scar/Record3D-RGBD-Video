import * as THREE from 'three';

const _pointer = new THREE.Vector2();

const _event = {
  type: '',
  data: _pointer,
};

const events: Record<string, string> = {
  'move': 'mousemove',
  'select': 'click',
  'selectstart': 'mousedown',
  'selectend': 'mouseup'
};

export class InteractiveGroup extends THREE.Group {
  readonly #raycaster: THREE.Raycaster;
  readonly #tempMatrix: THREE.Matrix4;

  readonly #renderer: THREE.WebGLRenderer;
  readonly #camera: THREE.PerspectiveCamera;
  readonly #pointerEventHandler: (event: PointerEvent | MouseEvent) => void;
  readonly #controllerEventHandler: (event: THREE.Event) => void;

  constructor(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    super();

    this.#raycaster = new THREE.Raycaster();
    this.#tempMatrix = new THREE.Matrix4(); // Pointer Events

    this.#renderer = renderer;
    this.#camera = camera;

    this.#pointerEventHandler = this.onPointerEvent.bind(this);
    this.#controllerEventHandler = this.onXRControllerEvent.bind(this);
  }

  setupEventHandlers() {
    const element = this.#renderer.domElement;
    element.addEventListener('pointerdown', this.#pointerEventHandler);
    element.addEventListener('pointerup', this.#pointerEventHandler);
    element.addEventListener('pointermove', this.#pointerEventHandler);
    element.addEventListener('mousedown', this.#pointerEventHandler);
    element.addEventListener('mouseup', this.#pointerEventHandler);
    element.addEventListener('mousemove', this.#pointerEventHandler);
    element.addEventListener('click', this.#pointerEventHandler); // WebXR Controller Events
    // TODO: Dispatch pointerevents too

    const controller1 = this.#renderer.xr.getController(0);
    controller1.addEventListener('move', this.#controllerEventHandler);
    controller1.addEventListener('select', this.#controllerEventHandler);
    controller1.addEventListener('selectstart', this.#controllerEventHandler);
    controller1.addEventListener('selectend', this.#controllerEventHandler);

    const controller2 = this.#renderer.xr.getController(1);
    controller2.addEventListener('move', this.#controllerEventHandler);
    controller2.addEventListener('select', this.#controllerEventHandler);
    controller2.addEventListener('selectstart', this.#controllerEventHandler);
    controller2.addEventListener('selectend', this.#controllerEventHandler);
  }

  removeEventHandlers() {
    const element = this.#renderer.domElement;
    element.removeEventListener('pointerdown', this.#pointerEventHandler);
    element.removeEventListener('pointerup', this.#pointerEventHandler);
    element.removeEventListener('pointermove', this.#pointerEventHandler);
    element.removeEventListener('mousedown', this.#pointerEventHandler);
    element.removeEventListener('mouseup', this.#pointerEventHandler);
    element.removeEventListener('mousemove', this.#pointerEventHandler);
    element.removeEventListener('click', this.#pointerEventHandler); // WebXR Controller Events
    // TODO: Dispatch pointerevents too

    const controller1 = this.#renderer.xr.getController(0);
    controller1.removeEventListener('move', this.#controllerEventHandler);
    controller1.removeEventListener('select', this.#controllerEventHandler);
    controller1.removeEventListener('selectstart', this.#controllerEventHandler);
    controller1.removeEventListener('selectend', this.#controllerEventHandler);

    const controller2 = this.#renderer.xr.getController(1);
    controller2.removeEventListener('move', this.#controllerEventHandler);
    controller2.removeEventListener('select', this.#controllerEventHandler);
    controller2.removeEventListener('selectstart', this.#controllerEventHandler);
    controller2.removeEventListener('selectend', this.#controllerEventHandler);
  }

  private onPointerEvent(event: PointerEvent | MouseEvent) {
    event.stopPropagation();
    _pointer.x = (event.clientX / this.#renderer.domElement.clientWidth) * 2 - 1;
    _pointer.y = -(event.clientY / this.#renderer.domElement.clientHeight) * 2 + 1;
    this.#raycaster.setFromCamera(_pointer, this.#camera);
    const intersects = this.#raycaster.intersectObjects(this.children);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const object = intersection.object;
      const uv = intersection.uv;
      _event.type = event.type;

      _event.data.set(uv.x, 1 - uv.y);

      object.dispatchEvent(_event);
    }
  }

  private onXRControllerEvent(event: THREE.Event) {
    const controller = event.target;
    this.#tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.#raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.#raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.#tempMatrix);
    const intersections = this.#raycaster.intersectObjects(this.children);

    if (intersections.length > 0) {
      const intersection = intersections[0];
      const object = intersection.object;
      const { x = 0, y = 0 } = intersection.uv || {};
      _event.type = events[event.type];
      _event.data.set(x, 1 - y);
      object.dispatchEvent(_event);
    }
  }
}
