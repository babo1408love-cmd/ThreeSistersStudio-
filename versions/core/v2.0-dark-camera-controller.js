// ============================================================
// 📷 몽글벨 웹엔진 - 카메라 컨트롤러 (4/8)
// ============================================================
// 3D 카메라: 추적, 줌, 회전, 흔들림, 시네마틱
//
// Claude Code: js/core/camera-controller.js 에 넣으세요
// ============================================================

const CameraController = {

  _camera: null,
  _target: null,
  _mode: 'follow',
  _shake: { active: false, intensity: 0, duration: 0, elapsed: 0, origX: 0, origY: 0, origZ: 0 },
  _zoom: { current: 10, target: 10, min: 3, max: 30, speed: 5 },
  _rotation: { yaw: 0, pitch: 0.8, targetYaw: 0, targetPitch: 0.8 },
  _offset: { x: 0, y: 8, z: 10 },
  _smoothing: 5,
  _cinematic: null,

  // ========== 카메라 프리셋 ==========
  PRESETS: {
    topDown:    { pitch: 1.2, yaw: 0, zoom: 15, offsetY: 12 },
    thirdPerson:{ pitch: 0.6, yaw: 0, zoom: 8, offsetY: 5 },
    isometric:  { pitch: 0.75, yaw: 0.785, zoom: 12, offsetY: 8 },
    cinematic:  { pitch: 0.3, yaw: 0, zoom: 6, offsetY: 3 },
    birdEye:    { pitch: 1.4, yaw: 0, zoom: 25, offsetY: 20 },
    closeUp:    { pitch: 0.4, yaw: 0, zoom: 4, offsetY: 2 },
    battle:     { pitch: 0.7, yaw: 0, zoom: 10, offsetY: 7 },
    map:        { pitch: 1.3, yaw: 0, zoom: 20, offsetY: 15 }
  },

  // ========== 초기화 ==========
  init(camera) {
    this._camera = camera;
    if (!camera && typeof THREE !== 'undefined') {
      this._camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    }
    this.applyPreset('topDown');
    console.log('[CameraController] 초기화 ✅');
    return this._camera;
  },

  // ========== 매 프레임 업데이트 ==========
  update(dt) {
    if (!this._camera) return;
    const d = dt || 0.016;

    // 줌 보간
    this._zoom.current += (this._zoom.target - this._zoom.current) * this._zoom.speed * d;

    // 회전 보간
    this._rotation.yaw += (this._rotation.targetYaw - this._rotation.yaw) * 3 * d;
    this._rotation.pitch += (this._rotation.targetPitch - this._rotation.pitch) * 3 * d;

    // 모드별 처리
    switch (this._mode) {
      case 'follow': this._updateFollow(d); break;
      case 'fixed': break;
      case 'cinematic': this._updateCinematic(d); break;
      case 'free': this._updateFree(d); break;
    }

    // 흔들림
    if (this._shake.active) this._updateShake(d);
  },

  // ========== 추적 모드 ==========
  _updateFollow(dt) {
    if (!this._target) return;

    const tx = this._target.x || (this._target.position ? this._target.position.x : 0);
    const ty = this._target.y || (this._target.position ? this._target.position.y : 0);
    const tz = this._target.z || (this._target.position ? this._target.position.z : 0);

    const zoom = this._zoom.current;
    const pitch = this._rotation.pitch;
    const yaw = this._rotation.yaw;

    const camX = tx + Math.sin(yaw) * Math.cos(pitch) * zoom;
    const camY = ty + Math.sin(pitch) * zoom;
    const camZ = tz + Math.cos(yaw) * Math.cos(pitch) * zoom;

    // 부드럽게 이동
    const s = this._smoothing * dt;
    this._camera.position.x += (camX - this._camera.position.x) * s;
    this._camera.position.y += (camY - this._camera.position.y) * s;
    this._camera.position.z += (camZ - this._camera.position.z) * s;

    this._camera.lookAt(tx, ty + 1, tz);
  },

  // ========== 시네마틱 모드 ==========
  playCinematic(keyframes, onComplete) {
    this._mode = 'cinematic';
    this._cinematic = {
      keyframes,
      currentIndex: 0,
      elapsed: 0,
      onComplete
    };
  },

  _updateCinematic(dt) {
    if (!this._cinematic) return;
    const c = this._cinematic;
    if (c.currentIndex >= c.keyframes.length - 1) {
      this._mode = 'follow';
      if (c.onComplete) c.onComplete();
      this._cinematic = null;
      return;
    }

    c.elapsed += dt;
    const kf = c.keyframes[c.currentIndex];
    const nextKf = c.keyframes[c.currentIndex + 1];
    const t = Math.min(1, c.elapsed / (kf.duration || 2));
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this._camera.position.x = kf.x + (nextKf.x - kf.x) * ease;
    this._camera.position.y = kf.y + (nextKf.y - kf.y) * ease;
    this._camera.position.z = kf.z + (nextKf.z - kf.z) * ease;

    const lookX = (kf.lookX || 0) + ((nextKf.lookX || 0) - (kf.lookX || 0)) * ease;
    const lookY = (kf.lookY || 0) + ((nextKf.lookY || 0) - (kf.lookY || 0)) * ease;
    const lookZ = (kf.lookZ || 0) + ((nextKf.lookZ || 0) - (kf.lookZ || 0)) * ease;
    this._camera.lookAt(lookX, lookY, lookZ);

    if (t >= 1) { c.currentIndex++; c.elapsed = 0; }
  },

  // ========== 흔들림 ==========
  shake(intensity, duration) {
    this._shake.active = true;
    this._shake.intensity = intensity || 0.3;
    this._shake.duration = duration || 0.5;
    this._shake.elapsed = 0;
    this._shake.origX = this._camera.position.x;
    this._shake.origY = this._camera.position.y;
    this._shake.origZ = this._camera.position.z;
  },

  _updateShake(dt) {
    const s = this._shake;
    s.elapsed += dt;
    if (s.elapsed >= s.duration) {
      s.active = false;
      return;
    }
    const decay = 1 - (s.elapsed / s.duration);
    const i = s.intensity * decay;
    this._camera.position.x += (Math.random() - 0.5) * i;
    this._camera.position.y += (Math.random() - 0.5) * i * 0.5;
    this._camera.position.z += (Math.random() - 0.5) * i;
  },

  // ========== API ==========
  setTarget(target) { this._target = target; },
  setMode(mode) { this._mode = mode; },
  
  zoomIn(amount) { this._zoom.target = Math.max(this._zoom.min, this._zoom.target - (amount || 2)); },
  zoomOut(amount) { this._zoom.target = Math.min(this._zoom.max, this._zoom.target + (amount || 2)); },
  setZoom(value) { this._zoom.target = Math.max(this._zoom.min, Math.min(this._zoom.max, value)); },

  rotate(yaw, pitch) {
    this._rotation.targetYaw += yaw || 0;
    this._rotation.targetPitch = Math.max(0.1, Math.min(1.5, this._rotation.targetPitch + (pitch || 0)));
  },

  applyPreset(name) {
    const p = this.PRESETS[name];
    if (!p) return;
    this._rotation.targetPitch = p.pitch;
    this._rotation.targetYaw = p.yaw;
    this._zoom.target = p.zoom;
    this._offset.y = p.offsetY;
  },

  getCamera() { return this._camera; },

  connectToEngine() { console.log('[CameraController] 카메라 컨트롤러 준비 완료 ✅'); }
};

if (typeof window !== 'undefined') window.CameraController = CameraController;
if (typeof module !== 'undefined') module.exports = CameraController;
