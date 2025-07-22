import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// 修复后期处理模块引用
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

console.log("main200.js 隐藏关卡开始执行");



// 画面加载状态变量（从模糊到清晰）
let blurIntensity = 15; // 初始模糊强度
let isFadingIn = true; // 是否处于淡入状态

// 3D模型变量
let demo1_model;
let targetPillar; // 最终升高的柱子

// 相机固定角度（与第二关一致）
const fixedCameraPos = new THREE.Vector3(6.019, 20.513, 15.427);
const fixedLookAtPos = new THREE.Vector3(0, 0, 0); //-53.06, 13.20, 16.89

// 精灵相关变量
let spriteModel; // 原有精灵
let spriteB; // 新增精灵B
let isMoving = false;
let moveProgress = 0;
const moveDuration = 4000; // 原有精灵移动时间延长
let moveStartTime = 0;

// 精灵B对话变量
let spriteBText = [
  "这里是另一个维度的缝隙...",
  "小心前方的未知存在...",
  "当柱子升起时，通道将开启...",
  "再见了，勇敢的探索者..."
]; // 可修改的对话内容
let currentTextIndex = 0;
let textDisplayProgress = 0;
let textCharIndex = 0;
let isSpriteBSpeaking = false;
let isSpriteBFading = false;
let spriteBFadeProgress = 0;

// 原有精灵移动路径（终点为柱子位置）
const movePath = [
  new THREE.Vector3(-2.876, 2.746, 4),
  new THREE.Vector3(1, 2.5, 4),
  new THREE.Vector3(1, 1.37, 0.05),
  new THREE.Vector3(-3.13, 0.68, -0.16),
  // new THREE.Vector3(4, -1, 8) // 最终停在柱子旁
];

// 柱子动画变量
let isPillarRising = false;
let pillarProgress = 0;
const pillarRiseDuration = 3000;
let pillarStartTime = 0;
let pillarInitY = 0;

// 调试信息
const debugInfo = document.getElementById('debugInfo');
function updateDebugInfo(message) {
  if (debugInfo) debugInfo.textContent = message;
}

// 创建文本显示元素（用于精灵B对话）
const createTextElement = () => {
  const textDiv = document.createElement('div');
  textDiv.id = 'spriteBText';
  textDiv.style.position = 'fixed';
  textDiv.style.bottom = '20%';
  textDiv.style.left = '50%';
  textDiv.style.transform = 'translateX(-50%)';
  textDiv.style.color = 'rgba(255, 255, 255, 0)';
  textDiv.style.fontSize = '24px';
  textDiv.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.8)';
  textDiv.style.whiteSpace = 'nowrap';
  textDiv.style.zIndex = '100';
  textDiv.style.transition = 'opacity 0.5s ease';
  document.body.appendChild(textDiv);
  return textDiv;
};
const spriteBTextElement = createTextElement();

// 场景初始化
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a); // 神秘深色背景

// 相机设置
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.copy(fixedCameraPos);
camera.lookAt(fixedLookAtPos);

// 渲染器（带模糊效果）
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  canvas: canvas
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// 初始化后期处理（从模糊到清晰效果）
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.strength = 0.8;
composer.addPass(bloomPass);

// 窗口大小适配
function updateRendererSize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  bloomPass.setSize(width, height);
  
  updateDebugInfo(`画面尺寸: ${width}x${height} | 神秘场景加载中`);
}
updateRendererSize();
window.addEventListener('resize', updateRendererSize);



const directionalLight = new THREE.DirectionalLight(0x444488, 0.3);
directionalLight.position.set(-5, 8, -3);
scene.add(directionalLight);

const directionalLight1 = new THREE.DirectionalLight(0x444488, 0.3);
directionalLight1.position.set(2.28, 10.6, 6.82);
scene.add(directionalLight1);



// 加载模型
const loader = new GLTFLoader();

// 加载隐藏关卡专属3D模型
loader.load(
  'level2.1_1.gltf', // 复用修改后的模型文件
  (gltf) => {
    scene.add(gltf.scene);
    demo1_model = gltf.scene;
    
    // 查找柱子模型（增加递归查找）
    targetPillar = findObjectByNameRecursive(demo1_model, 'Pillar_Target');
    if (targetPillar) {
      pillarInitY = targetPillar.position.y;
      updateDebugInfo("找到目标柱子");
    } else {
      console.warn("未找到柱子模型，将使用默认位置");
      // 创建备用柱子
      const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
      const material = new THREE.MeshStandardMaterial({color: 0x8888aa});
      targetPillar = new THREE.Mesh(geometry, material);
      targetPillar.position.set(4, 0, 8);
      pillarInitY = 0;
      scene.add(targetPillar);
    }
    
    // 加载原有精灵
    loadSpriteModel();
    
    // 加载精灵B
    loadSpriteB();
  
  },
  (xhr) => {
    const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
    updateDebugInfo(`加载基础场景: ${percent}%`);
  },
  (error) => console.error("基础模型加载失败:", error)
);

// 递归查找对象的辅助函数（确保能找到嵌套的柱子模型）
function findObjectByNameRecursive(parent, name) {
  if (parent.name === name) {
    return parent;
  }
  
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    const result = findObjectByNameRecursive(child, name);
    if (result) {
      return result;
    }
  }
  
  return null;
}

// 加载原有精灵
function loadSpriteModel() {
  loader.load(
    'sprite.gltf',
    (gltf) => {
      spriteModel = gltf.scene;
      spriteModel.scale.set(0.25, 0.25, 0.25);
      spriteModel.position.copy(movePath[0]);
      scene.add(spriteModel);
      updateDebugInfo("原有精灵加载完成");
      
      // // 延迟开始移动（等待精灵B对话开始后再移动）--->对话结束后再移动，
      // setTimeout(() => {
      //   isMoving = true;
      //   moveStartTime = Date.now();
      // }, 3000);
    },
    (xhr) => {
      const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
      updateDebugInfo(`加载原有精灵: ${percent}%`);
    },
    (error) => console.error("原有精灵加载失败:", error)
  );
}

// 加载精灵B
function loadSpriteB() {
  loader.load(
    'sprite_b.gltf', // 精灵B模型
    (gltf) => {
      spriteB = gltf.scene;
      spriteB.scale.set(0.25, 0.25, 0.25);
      spriteB.position.set(-0.622, 2.5, 4);
      scene.add(spriteB);
      
      // 确保精灵B材质支持透明度
      spriteB.traverse((child) => {
        if (child.material) {
          child.material.transparent = true;
        }
      });
      
      updateDebugInfo("精灵B加载完成，准备对话");
      
      // 开始对话
      setTimeout(() => {
        isSpriteBSpeaking = true;
        textDisplayProgress = 0;
        textCharIndex = 0;
      }, 1000);
    },
    (xhr) => {
      const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
      updateDebugInfo(`加载精灵B: ${percent}%`);
    },
    (error) => console.error("精灵B加载失败:", error)
  );
}

// 开始柱子升起动画
function startPillarRise() {
  if (targetPillar && !isPillarRising) {
    isPillarRising = true;
    pillarStartTime = Date.now();
    updateDebugInfo("柱子开始升起...");
  }
}

// 计算路径位置
function calculatePositionOnPath(progress) {
  const totalSegments = movePath.length - 1;
  const segment = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
  const segmentProgress = (progress * totalSegments) - segment;
  const start = movePath[segment];
  const end = movePath[segment + 1];
  const position = new THREE.Vector3();
  position.lerpVectors(start, end, segmentProgress);
  return position;
}

// 缓动函数
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);

  // 画面从模糊到清晰效果
  if (isFadingIn) {
    blurIntensity = Math.max(0, blurIntensity - 0.02);
    bloomPass.radius = blurIntensity;
    if (blurIntensity <= 0) {
      isFadingIn = false;
      updateDebugInfo("场景加载完成，神秘维度展开");
    }
  }

  // 精灵B对话动画
  if (isSpriteBSpeaking && spriteB && currentTextIndex < spriteBText.length) {
    textDisplayProgress += 0.015;
    const currentText = spriteBText[currentTextIndex];
    
    // 逐字显示
    const targetCharCount = Math.floor(textDisplayProgress * currentText.length);
    if (targetCharCount > textCharIndex) {
      textCharIndex = Math.min(targetCharCount, currentText.length);
      spriteBTextElement.textContent = currentText.substring(0, textCharIndex);
      spriteBTextElement.style.color = `rgba(255, 255, 255, ${Math.min(1, textCharIndex / currentText.length)})`;
    }

    // 当前文本显示完成
    if (textCharIndex >= currentText.length && textDisplayProgress > 1.5) {
      currentTextIndex++;
      textDisplayProgress = 0;
      textCharIndex = 0;
      
      // 所有文本说完后开始消失
      if (currentTextIndex >= spriteBText.length) {
        isSpriteBSpeaking = false;
        isSpriteBFading = true;
        spriteBFadeProgress = 0;
      }
    }
  }

  // 精灵B消失动画
  if (isSpriteBFading && spriteB) {
    spriteBFadeProgress += 0.01;
    const opacity = 1 - easeInOutCubic(spriteBFadeProgress);
    
    // 递归设置所有子材质透明度
    spriteB.traverse((child) => {
      if (child.material) {
        child.material.opacity = opacity;
      }
    });
    
    spriteBTextElement.style.opacity = 1 - spriteBFadeProgress;
    
    if (spriteBFadeProgress >= 1) {
      isSpriteBFading = false;
      scene.remove(spriteB);
      spriteBTextElement.style.display = 'none';
      // 消失后才能移动
       isMoving = true;
       moveStartTime = Date.now();
    }
  }

  // 原有精灵移动
  if (isMoving && spriteModel) {
    const now = Date.now();
    const elapsed = now - moveStartTime;
    const progress = Math.min(elapsed / moveDuration, 1);
    const easeProgress = easeInOutCubic(progress);
    
    spriteModel.position.copy(calculatePositionOnPath(easeProgress));
    
    // 移动完成后开始柱子升起
    if (progress >= 1) {
      isMoving = false;
      startPillarRise();
    }
  }

  // 柱子升起动画
  if (isPillarRising && targetPillar) {
    const now = Date.now();
    const elapsed = now - pillarStartTime;
    const progress = Math.min(elapsed / pillarRiseDuration, 1);
    const easeProgress = easeInOutCubic(progress);
    
    targetPillar.position.y = pillarInitY + easeProgress * 16; // 升高8单位
    spriteModel.position.y = targetPillar.position.y+2
    
    // 柱子升起时添加发光效果
    if (targetPillar.material) {
      targetPillar.material.emissiveIntensity = easeProgress * 0.5;
    }
    
    if (progress >= 1) {
      updateDebugInfo("柱子完全升起，隐藏关卡结束");
      // 关卡结束逻辑
      setTimeout(() => {
        // window.location.href = 'next_level.html'; // 替换为实际下一关卡
      }, 2000);
    }
  }

  // 使用后期处理渲染
  composer.render();
}

animate();