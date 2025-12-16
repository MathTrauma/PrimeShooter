import * as THREE from 'three';

export class SceneManager {
  constructor(container) {
    this.container = container;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.Fog(0x111111, 60, 150);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(0, 0, -10);

    // Camera follow settings
    this.cameraOffset = new THREE.Vector3(0, 10, 10);
    this.cameraLookAtOffset = new THREE.Vector3(0, 0, -5);
    this.cameraDamping = 0.08;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Lights
    this.setupLights();

    // Grid
    this.setupGrid();

    // Title
    this.createTitle();

    // Resize handler
    this.boundHandleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.boundHandleResize);
  }

  setupLights() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
  }

  setupGrid() {
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x111111);
    this.scene.add(gridHelper);
  }

  createTitle() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.clearRect(0, 0, 1024, 256);

      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 150px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("MathTrauma", 512, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8
    });
    const geometry = new THREE.PlaneGeometry(40, 10);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 15, -40);
    mesh.rotation.x = 0.2;
    this.scene.add(mesh);
  }

  updateCamera(targetPosition, deltaTime) {
    const targetCameraPos = new THREE.Vector3(
      targetPosition.x + this.cameraOffset.x,
      this.cameraOffset.y,
      targetPosition.z + this.cameraOffset.z
    );

    const targetLookAt = new THREE.Vector3(
      targetPosition.x + this.cameraLookAtOffset.x,
      this.cameraLookAtOffset.y,
      targetPosition.z + this.cameraLookAtOffset.z
    );

    const lerpFactor = 1 - Math.pow(1 - this.cameraDamping, deltaTime);

    this.camera.position.lerp(targetCameraPos, lerpFactor);

    const currentLookAt = new THREE.Vector3();
    this.camera.getWorldDirection(currentLookAt);
    currentLookAt.multiplyScalar(10).add(this.camera.position);
    currentLookAt.lerp(targetLookAt, lerpFactor);
    this.camera.lookAt(currentLookAt);
  }

  handleResize() {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }

  dispose() {
    window.removeEventListener('resize', this.boundHandleResize);

    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
