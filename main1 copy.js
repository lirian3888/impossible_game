import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log("main.js 开始执行");

// 声明变量
let demo1_model;
let targetObject;
let isRotating = false;
let rotationProgress = 0;
const targetRotation = -Math.PI / 2; // -90度
const rotationDuration = 2000; // 旋转持续时间（毫秒）
let rotationStartTime = 0;
// 新增：背景图相关变量
let backgroundTexture; // 背景纹理
let bgAspectRatio; // 背景图宽高比

// 调试信息面板
const debugInfo = document.getElementById('debugInfo');
function updateDebugInfo(message) {
  if (debugInfo) debugInfo.textContent = message;
}

// 获取已存在的canvas元素
const canvas = document.getElementById('gameCanvas');
canvas.style.display = 'block'; // 显示canvas

// 初始化场景
const scene = new THREE.Scene();
// 注释掉原有的纯色背景，改用图片背景
// scene.background = new THREE.Color(0x3E434D); 

// 新增：加载背景图并设置为居中显示
const textureLoader = new THREE.TextureLoader();
textureLoader.load(
  'level1_bg.png', // 替换为你的背景图路径（本地或网络地址）
  (texture) => {
    backgroundTexture = texture;
    // 禁用图片重复显示，避免空白区域出现重复图案
    backgroundTexture.wrapS = THREE.ClampToEdgeWrapping;
    backgroundTexture.wrapT = THREE.ClampToEdgeWrapping;
    // 计算背景图宽高比
    bgAspectRatio = texture.image.width / texture.image.height;
    // 设置为场景背景
    scene.background = backgroundTexture;
    // 初始适配窗口
    updateBackgroundCenterFit();
    updateDebugInfo("背景图加载完成，已居中显示");
  },
  (xhr) => {
    // 背景图加载进度
    const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
    updateDebugInfo(`背景图加载中: ${percent}%`);
  },
  (error) => {
    // 加载失败处理
    console.error('背景图加载失败:', error);
    updateDebugInfo("背景图加载失败，使用默认背景色");
    // 加载失败时使用原来的纯色背景
    scene.background = new THREE.Color(0x3E434D);
  }
);

// 新增：背景图居中适配逻辑（核心）
function updateBackgroundCenterFit() {
  if (!backgroundTexture || !bgAspectRatio) return;

  const windowAspect = window.innerWidth / window.innerHeight;

  if (windowAspect > bgAspectRatio) {
    // 窗口比图片宽：图片按高度缩放，水平居中，左右留空白
    backgroundTexture.repeat.set(bgAspectRatio / windowAspect, 1);
    backgroundTexture.offset.set((1 - backgroundTexture.repeat.x) / 2, 0);
  } else {
    // 窗口比图片高：图片按宽度缩放，垂直居中，上下留空白
    backgroundTexture.repeat.set(1, windowAspect / bgAspectRatio);
    backgroundTexture.offset.set(0, (1 - backgroundTexture.repeat.y) / 2);
  }
}

// 固定视角相机（等轴视角）
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(23.587, 27.852, 30.605);
camera.lookAt(0, 0, 0);

// 渲染器初始化
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  canvas: canvas // 使用已存在的canvas
});

// 修改：更新渲染器大小函数（添加背景图适配）
function updateRendererSize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  // 新增：窗口大小变化时，更新背景图居中适配
  updateBackgroundCenterFit();
  
  updateDebugInfo(`画布大小: ${width} x ${height} | 背景已居中适配`);
}

// 初始设置尺寸
updateRendererSize();

// 自适应窗口大小
window.addEventListener('resize', updateRendererSize);

// 光源
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Instantiate a loader
const loader = new GLTFLoader();

// 显示加载进度
updateDebugInfo("加载模型中...");

// Load a glTF resource
loader.load(
  // resource URL
  'scene_first.gltf',
  // called when the resource is loaded
  function (gltf) {
    scene.add(gltf.scene);
    demo1_model = gltf.scene; // 正确赋值
    
    updateDebugInfo("模型加载完成，正在查找目标对象...");
    
    // 查找名为Box_Parent的对象
    targetObject = demo1_model.getObjectByName('Box_Parent');
                
    if (targetObject) {
      console.log('找到目标对象:', targetObject.name);
      updateDebugInfo("找到目标对象: " + targetObject.name);
      // 添加点击事件监听
      initClickEvent();
    } else {
      console.log('未找到名为Box_Parent的对象，尝试递归查找');
      updateDebugInfo("未找到目标对象，正在递归查找...");
      // 递归查找
      targetObject = findObjectByNameRecursive(demo1_model, 'Box_Parent');
      if (targetObject) {
        console.log('递归找到目标对象:', targetObject.name);
        updateDebugInfo("递归找到目标对象: " + targetObject.name);
        // 添加点击事件监听
        initClickEvent();
      } else {
        console.log('未找到任何匹配的对象');
        updateDebugInfo("未找到任何匹配的对象");
      }
    }
  },
  // called while loading is progressing
  function (xhr) {
    const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
    console.log(percent + '% loaded');
    updateDebugInfo(`模型加载进度: ${percent}%`);
  },
  // called when loading has errors
  function (error) {
    console.log('An error happened:', error);
    updateDebugInfo("模型加载错误: " + error.message);
  }
);

// 递归查找对象的辅助函数
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

// 初始化点击事件
function initClickEvent() {
  updateDebugInfo("场景初始化完成，点击模型可旋转");
  
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // 鼠标点击事件
  document.addEventListener('click', (event) => {
    if (!targetObject || isRotating) return;
    
    // 计算鼠标在标准化设备坐标中的位置 (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // 通过鼠标位置更新射线
    raycaster.setFromCamera(mouse, camera);
    
    // 计算射线与场景中物体的交点
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // 检查是否点击了目标对象
    for (let i = 0; i < intersects.length; i++) {
      if (intersects[i].object === targetObject || isDescendant(intersects[i].object, targetObject)) {
        startRotation();
        break;
      }
    }
  }, false);
}

// 检查child是否是parent的子对象
function isDescendant(child, parent) {
  let current = child.parent;
  while (current) {
    if (current === parent) return true;
    current = current.parent;
  }
  return false;
}

// 开始旋转动画
function startRotation() {
  if (targetObject && !isRotating) {
    isRotating = true;
    rotationStartTime = Date.now();
    console.log('开始旋转动画');
    updateDebugInfo("旋转动画开始");
  }
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);
  
  // 更新调试信息
  if (isRotating && targetObject) {
    const now = Date.now();
    const elapsed = now - rotationStartTime;
    const progress = Math.min(elapsed / rotationDuration, 1);
    updateDebugInfo(`旋转进度: ${Math.round(progress * 100)}%`);
  }
  
  // 处理旋转动画
  if (isRotating && targetObject) {
    const now = Date.now();
    const elapsed = now - rotationStartTime;
    
    if (elapsed < rotationDuration) {
      // 计算当前进度（0-1之间）
      rotationProgress = elapsed / rotationDuration;
      
      // 使用缓动函数使动画更平滑
      const easeProgress = easeInOutCubic(rotationProgress);
      
      // 应用旋转（绕X轴旋转）
      targetObject.rotation.x = easeProgress * targetRotation;
    } else {
      // 确保最终角度精确
      targetObject.rotation.x = targetRotation;
      isRotating = false;
      console.log('旋转动画完成');
      updateDebugInfo("旋转动画完成，点击模型可再次旋转");
    }
  }

  renderer.render(scene, camera);
}
animate();

// 缓动函数 - 三次方缓入缓出
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}