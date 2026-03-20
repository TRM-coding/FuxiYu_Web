import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const ModelViewer = ({ modelPath = '/glb.glb' }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const [renderDisabled, setRenderDisabled] = useState(false);

  useEffect(() => {
    if (!containerRef.current || renderDisabled) return;

    // Enable Three.js internal asset cache (helps repeated loads in session)
    THREE.Cache.enabled = true;

    // 1. 初始化场景、相机、渲染器
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const container = containerRef.current;
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
      });
    } catch (error) {
      console.error('WebGL renderer init failed:', error);
      setRenderDisabled(true);
      return undefined;
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // 透明背景
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    
    // 清除可能存在的旧 canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 2. 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe7f0ff, 0xf2f4f8, 0.45);
    scene.add(hemiLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // 柔和补光（偏蓝、偏暖）
    const coolLight = new THREE.PointLight(0x9ec8ff, 0.5, 16);
    coolLight.position.set(2.8, 2.2, 3.2);
    scene.add(coolLight);

    const warmLight = new THREE.PointLight(0xffe7c2, 0.35, 14);
    warmLight.position.set(-2.4, 1.6, 2.6);
    scene.add(warmLight);

    // 简单光束（透明锥体）
    const createBeam = ({ color, position, target }) => {
      const beamGeo = new THREE.ConeGeometry(1.25, 4.8, 36, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.copy(position);
      beam.lookAt(target);
      scene.add(beam);
      return beam;
    };

    const beamA = createBeam({
      color: 0x9ec8ff,
      position: new THREE.Vector3(2.6, 2.8, 2.2),
      target: new THREE.Vector3(0.2, -0.8, 0),
    });

    const beamB = createBeam({
      color: 0xffe7c2,
      position: new THREE.Vector3(-2.6, 2.4, 1.8),
      target: new THREE.Vector3(-0.2, -0.7, 0),
    });

    // 3. 加载 GLB 模型
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    let modelRoot = null;
    const targetTilt = { x: 0, y: 0 };
    const normalizedMaterialCache = new WeakMap();

    // 运行时材质归一化：尽量修正“过黑+过粗糙”的外观
    const normalizeMaterial = (material) => {
      if (!material || !material.isMaterial) return material;

      const cached = normalizedMaterialCache.get(material);
      if (cached) return cached;

      const mat = material.clone();
      const blueTone = new THREE.Color(0x2f5ea8);
      const baseColor = mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1);

      const luma = 0.2126 * baseColor.r + 0.7152 * baseColor.g + 0.0722 * baseColor.b;
      const maxC = Math.max(baseColor.r, baseColor.g, baseColor.b);
      const minC = Math.min(baseColor.r, baseColor.g, baseColor.b);
      const sat = maxC - minC;
      const isDarkNeutral = luma < 0.18 && sat < 0.22;

      if (isDarkNeutral && mat.color) {
        const tintStrength = mat.map ? 0.35 : 0.56;
        mat.color.lerp(blueTone, tintStrength);
      }

      if ('roughness' in mat && typeof mat.roughness === 'number') {
        mat.roughness = isDarkNeutral ? Math.min(mat.roughness, 0.38) : Math.min(mat.roughness, 0.62);
      }

      if ('metalness' in mat && typeof mat.metalness === 'number') {
        mat.metalness = isDarkNeutral ? Math.max(mat.metalness, 0.24) : Math.max(mat.metalness, 0.12);
      }

      if ('envMapIntensity' in mat) {
        const oldIntensity = typeof mat.envMapIntensity === 'number' ? mat.envMapIntensity : 1;
        mat.envMapIntensity = isDarkNeutral ? Math.max(oldIntensity, 1.15) : Math.max(oldIntensity, 0.95);
      }

      if ('clearcoat' in mat) {
        mat.clearcoat = Math.max(mat.clearcoat || 0, isDarkNeutral ? 0.32 : 0.12);
        mat.clearcoatRoughness = Math.min(mat.clearcoatRoughness || 0.5, 0.28);
      }

      if ('emissive' in mat && mat.emissive) {
        if (isDarkNeutral) {
          mat.emissive = new THREE.Color(0x0f1f35);
          mat.emissiveIntensity = 0.04;
        } else {
          mat.emissiveIntensity = Math.min(mat.emissiveIntensity || 0, 0.02);
        }
      }

      mat.needsUpdate = true;
      normalizedMaterialCache.set(material, mat);
      return mat;
    };

    loader.load(
      modelPath,
      (gltf) => {
        modelRoot = gltf.scene;

        modelRoot.traverse((child) => {
          if (!child.isMesh || !child.material) return;
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) => normalizeMaterial(m));
          } else {
            child.material = normalizeMaterial(child.material);
          }
          child.castShadow = false;
          child.receiveShadow = false;
        });

        scene.add(modelRoot);
        
        // 自动调整模型大小和位置
        const box = new THREE.Box3().setFromObject(modelRoot);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // 计算合适的缩放比例
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        modelRoot.scale.setScalar(scale);
        
        // 居中模型
        modelRoot.position.x = -center.x * scale;
        modelRoot.position.y = -center.y * scale;
        modelRoot.position.z = -center.z * scale;
      },
      () => {},
      (error) => {
        console.error('模型加载失败:', error);
        // 加载失败时显示一个立方体作为备用
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x4f7fc6, roughness: 0.38, metalness: 0.25 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        modelRoot = cube;
      }
    );

    // 鼠标微弱跟随（全屏范围，禁止自由拖拽）
    const onPointerMove = (event) => {
      const nx = event.clientX / Math.max(1, window.innerWidth);
      const ny = event.clientY / Math.max(1, window.innerHeight);
      const x = (ny - 0.5) * 2; // up/down
      const y = (nx - 0.5) * 2; // left/right
      // 更克制的展厅感
      targetTilt.x = THREE.MathUtils.clamp(x * 0.07, -0.08, 0.08);
      targetTilt.y = THREE.MathUtils.clamp(y * 0.11, -0.12, 0.12);
    };

    const resetTilt = () => {
      targetTilt.x = 0;
      targetTilt.y = 0;
    };

    const onWindowPointerOut = (event) => {
      if (!event.relatedTarget) resetTilt();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerout', onWindowPointerOut);
    window.addEventListener('blur', resetTilt);

    // 5. 动画循环
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (modelRoot) {
        modelRoot.rotation.x += (targetTilt.x - modelRoot.rotation.x) * 0.035;
        modelRoot.rotation.y += (targetTilt.y - modelRoot.rotation.y) * 0.035;
      }
      // 光束轻微呼吸
      const t = performance.now() * 0.001;
      beamA.material.opacity = 0.065 + 0.015 * Math.sin(t * 0.9);
      beamB.material.opacity = 0.06 + 0.012 * Math.cos(t * 1.0);
      renderer.render(scene, camera);
    };
    animate();

    // 6. 窗口 resize 适配
    const onResize = () => {
      if (!containerRef.current) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', onResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onWindowPointerOut);
      window.removeEventListener('blur', resetTilt);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      // 清理 Three.js 资源
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m && m.dispose && m.dispose());
            } else if (child.material && child.material.dispose) {
              child.material.dispose();
            }
          }
        });
      }
      
      if (renderer) {
        renderer.dispose();
      }
      
      // 清理 DOM
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelPath, renderDisabled]);

  if (renderDisabled) {
    return (
      <div
        className="model-container"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#4f6b8a',
          fontSize: '14px',
          letterSpacing: '0.04em'
        }}
      >
        3D 预览当前不可用
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="model-container"
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '100%'
      }} 
    />
  );
};

export default ModelViewer;