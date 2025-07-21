import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log("main.js 开始执行");

// 声明变量
let demo1_model;
let targetObject;
let isRotating = false;
let rotationProgress = 0;
const targetRotation = -Math.PI / 2; // -90度（目标角度）
const rotationStep = Math.PI / 2; // 每次旋转90度（弧度）
const rotationDuration = 1000; // 旋转持续时间（毫秒）
let rotationStartTime = 0;
let currentTargetRotation = 0; // 当前目标旋转角度

// 新增：精灵相关变量
let spriteModel;
let isMoving = false;
let moveProgress = 0;
const moveDuration = 3000; // 移动持续时间（毫秒）
let moveStartTime = 0;
// 移动路径点数组（可自定义路径）
const movePath = [
  new THREE.Vector3(-1, -0.85, 0),      // 起点
  new THREE.Vector3(-5, -0.85, 0),      // 路径点1
  new THREE.Vector3(0, 4, 4),    // 路径点2
  new THREE.Vector3(0, 4, 0),     // 路径点3
  new THREE.Vector3(-5, 4, 0),    // 路径点4
];

// 新增：背景图相关变量
let backgroundTexture; // 背景纹理
let bgAspectRatio; // 背景图宽高比

// 调试信息面板
const debugInfo = document.getElementById('debugInfo');
function updateDebugInfo(message) {
  if (debugInfo) debugInfo.textContent = message;
}

// 创建旋转控制按钮
function createRotationButtons() {
  // 创建按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '20px';
  buttonContainer.style.left = '50%';
  buttonContainer.style.transform = 'translateX(-50%)';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  buttonContainer.style.zIndex = '100'; // 确保按钮在canvas上方
  
  // 创建顺时针按钮
  const clockwiseBtn = document.createElement('button');
  clockwiseBtn.textContent = '顺时针旋转';
  clockwiseBtn.style.padding = '10px 20px';
  clockwiseBtn.style.fontSize = '16px';
  clockwiseBtn.id = 'clockwiseBtn';
  clockwiseBtn.addEventListener('click', () => startDirectionalRotation(false));
  
  // 创建逆时针按钮
  const counterClockwiseBtn = document.createElement('button');
  counterClockwiseBtn.textContent = '逆时针旋转';
  counterClockwiseBtn.style.padding = '10px 20px';
  counterClockwiseBtn.style.fontSize = '16px';
  counterClockwiseBtn.id = 'counterClockwiseBtn';
  counterClockwiseBtn.addEventListener('click', () => startDirectionalRotation(true));
  
  // 添加按钮到容器
  buttonContainer.appendChild(clockwiseBtn);
  buttonContainer.appendChild(counterClockwiseBtn);
  document.body.appendChild(buttonContainer);
  
  // 初始禁用按钮，等待模型加载完成
  disableRotationButtons(true);
}

// 启用/禁用旋转按钮
function disableRotationButtons(disabled) {
  const clockwiseBtn = document.getElementById('clockwiseBtn');
  const counterClockwiseBtn = document.getElementById('counterClockwiseBtn');
  
  if (clockwiseBtn) clockwiseBtn.disabled = disabled;
  if (counterClockwiseBtn) counterClockwiseBtn.disabled = disabled;
  
  if (disabled) {
    updateDebugInfo("等待模型加载完成...");
  } else {
    updateDebugInfo("请点击按钮旋转物体");
  }
}

// 获取已存在的canvas元素
const canvas = document.getElementById('gameCanvas');
canvas.style.display = 'block'; // 显示canvas

// 初始化场景
const scene = new THREE.Scene();

// 新增：加载背景图并设置为居中显示
const textureLoader = new THREE.TextureLoader();
textureLoader.load(
  'level1_bg.png', // 替换为你的背景图路径
  (texture) => {
    backgroundTexture = texture;
    // 禁用图片重复显示
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
    console.error('背景图加载失败:', error);
    updateDebugInfo("背景图加载失败，使用默认背景色");
    // 加载失败时使用原来的纯色背景
    scene.background = new THREE.Color(0x3E434D);
  }
);

// 新增：背景图居中适配逻辑
function updateBackgroundCenterFit() {
  if (!backgroundTexture || !bgAspectRatio) return;

  const windowAspect = window.innerWidth / window.innerHeight;

  if (windowAspect > bgAspectRatio) {
    // 窗口比图片宽：图片按高度缩放，水平居中
    backgroundTexture.repeat.set(bgAspectRatio / windowAspect, 1);
    backgroundTexture.offset.set((1 - backgroundTexture.repeat.x) / 2, 0);
  } else {
    // 窗口比图片高：图片按宽度缩放，垂直居中
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

// 初始化GLTF加载器
const loader = new GLTFLoader();

// 显示加载进度
updateDebugInfo("加载模型中...");

// 创建旋转按钮
createRotationButtons();

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
      
      // 启用旋转按钮
      disableRotationButtons(false);
      
      // 新增：加载精灵模型
      loadSpriteModel();
    } else {
      console.log('未找到名为Box_Parent的对象，尝试递归查找');
      updateDebugInfo("未找到目标对象，正在递归查找...");
      // 递归查找
      targetObject = findObjectByNameRecursive(demo1_model, 'Box_Parent');
      if (targetObject) {
        console.log('递归找到目标对象:', targetObject.name);
        updateDebugInfo("递归找到目标对象: " + targetObject.name);
        
        // 启用旋转按钮
        disableRotationButtons(false);
        
        // 新增：加载精灵模型
        loadSpriteModel();
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

// 新增：加载精灵模型
function loadSpriteModel() {
  const spriteLoader = new GLTFLoader();
  updateDebugInfo("加载精灵模型中...");
  
  spriteLoader.load(
    'sprite.gltf', // 替换为你的精灵模型路径
    function(gltf) {
      spriteModel = gltf.scene;
      
      // 设置精灵初始位置
      if (targetObject) {
        const targetPosition = new THREE.Vector3();
        targetObject.getWorldPosition(targetPosition);
        spriteModel.position.copy(targetPosition);
        spriteModel.position.x = -1; 
        spriteModel.position.y = -0.85;
        spriteModel.position.z = 0; // 稍微抬高一点
        
        // 设置精灵大小
        spriteModel.scale.set(0.5, 0.5, 0.5);
        
        scene.add(spriteModel);
        updateDebugInfo("精灵模型加载完成，请点击按钮旋转物体");
      } else {
        updateDebugInfo("未找到目标对象，无法放置精灵");
      }
    },
    function(xhr) {
      const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
      updateDebugInfo(`精灵模型加载进度: ${percent}%`);
    },
    function(error) {
      console.error('精灵模型加载失败:', error);
      updateDebugInfo("精灵模型加载失败");
    }
  );
}

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

// 开始方向旋转（isCounterClockwise: true为逆时针, false为顺时针）
function startDirectionalRotation(isCounterClockwise) {
  // 检查是否可以旋转
  if (!targetObject || isRotating || isMoving) return;
  
  // 检查当前角度是否已达到目标角度(-90度)
  const currentAngle = Math.round(targetObject.rotation.x * 180 / Math.PI);
  if (currentAngle === -90||currentAngle === 270) {
    updateDebugInfo("已达到目标角度，不能继续旋转");
    return;
  }
  
  // 计算旋转方向和目标角度
  if (isCounterClockwise) {
    // 逆时针旋转90度（正值）
    currentTargetRotation = targetObject.rotation.x + rotationStep;
    updateDebugInfo("开始逆时针旋转");
  } else {
    // 顺时针旋转90度（负值）
    currentTargetRotation = targetObject.rotation.x - rotationStep;
    updateDebugInfo("开始顺时针旋转");
  }
  
  // 开始旋转动画
  isRotating = true;
  rotationStartTime = Date.now();
  console.log('开始旋转动画');
}

// 开始移动动画
function startMoving() {
  if (spriteModel && !isMoving) {
    isMoving = true;
    moveStartTime = Date.now();
    moveProgress = 0;
    console.log('开始移动动画');
    updateDebugInfo("旋转到位，开始移动精灵");
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
  } else if (isMoving && spriteModel) {
    const now = Date.now();
    const elapsed = now - moveStartTime;
    const progress = Math.min(elapsed / moveDuration, 1);
    updateDebugInfo(`移动进度: ${Math.round(progress * 100)}%`);
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
      targetObject.rotation.x = targetObject.rotation.x + 
        (currentTargetRotation - targetObject.rotation.x) * easeProgress;
    } else {
      // 确保最终角度精确
      targetObject.rotation.x = currentTargetRotation;
      isRotating = false;
      console.log('旋转动画完成');
      
      // 检查是否达到目标角度(-90度)
      const currentAngle = Math.round(targetObject.rotation.x * 180 / Math.PI);
      if (currentAngle === -90||currentAngle === 270) {
        updateDebugInfo("已达到目标角度，准备移动精灵");
        // 旋转完成后开始移动动画
        if (spriteModel) {
          startMoving();
        } else {
          updateDebugInfo("旋转到位，但精灵模型未加载");
        }
        // 禁用旋转按钮
        disableRotationButtons(true);
      } else {
        updateDebugInfo("旋转完成，请继续旋转");
      }
    }
  }

  // 在全局作用域中添加一个标志变量,控制展示下一关按钮
  let nextLevelButtonCreated = false;
  // 处理移动动画
  if (isMoving && spriteModel) {
    const now = Date.now();
    const elapsed = now - moveStartTime;
    
    if (elapsed < moveDuration) {
      // 计算当前进度（0-1之间）
      moveProgress = elapsed / moveDuration;
      
      // 使用缓动函数使动画更平滑
      const easeProgress = easeInOutCubic(moveProgress);
      
      // 根据进度计算在路径上的位置
      const position = calculatePositionOnPath(easeProgress);
      spriteModel.position.copy(position);
    } else {
      // 确保最终位置精确
      spriteModel.position.copy(movePath[movePath.length - 1]);
      isMoving = false;
      console.log('移动动画完成');
      updateDebugInfo("精灵移动完成");
      // 下一关
      // 确保只创建一次按钮
      if (!nextLevelButtonCreated) {
        createNextLevelButton();
        nextLevelButtonCreated = true;
      }
    }
  }

  renderer.render(scene, camera);
}

// 将创建按钮的逻辑封装到单独的函数中
function createNextLevelButton() {
  // 创建按钮元素
  const fin_btn = document.createElement('button');
  fin_btn.textContent = '你已经对第一个维度缝隙进行了修补，现在点击进入下一个维度断层';
  fin_btn.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding: 16px 32px; background: #4a6cf7; color: white; border-radius:8px; font-size:18px; z-index:100;';
  fin_btn.onclick = () => window.location.href = 'impossible_game2.html';

  // 添加到页面
  document.body.appendChild(fin_btn);
}
animate();

// 计算在路径上的位置
function calculatePositionOnPath(progress) {
  // 计算总段数
  const totalSegments = movePath.length - 1;
  
  // 计算当前所在段
  const segment = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
  
  // 计算在当前段中的进度
  const segmentProgress = (progress * totalSegments) - segment;
  
  // 计算当前段的起点和终点
  const start = movePath[segment];
  const end = movePath[segment + 1];
  
  // 线性插值计算位置
  const position = new THREE.Vector3();
  position.lerpVectors(start, end, segmentProgress);
  
  return position;
}

// 缓动函数 - 三次方缓入缓出
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}