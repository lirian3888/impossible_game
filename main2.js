import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log("main.js 开始执行");
// 第二个新增
let boxBreakObject; // Box_break对象 慢慢缩短对象
let box5Object; // Box5对象，慢慢抬升对象
let bosx5Object_init_y = 0
// Box_break缩短动画变量
let isBoxBreaking = false;
let boxBreakProgress = 0;
const boxBreakDuration = 4000; // 2秒缩短时间
let boxBreakStartTime = 0

// Box5伸长动画变量
let isBox5Extending = false;
let box5Progress = 0;
const box5Duration = 2000; // 2秒伸长时间
let box5StartTime = 0;

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
  new THREE.Vector3(-5, 4, 0.25),      // 起点
  new THREE.Vector3(0.25, 4, 0),      // 路径点1
  new THREE.Vector3(1, -1, 0),    // 路径点2
  new THREE.Vector3(4, -1, 0.25),     // 路径点3
  new THREE.Vector3(4, -1, 4),    // 路径点4
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
  'L2_blackground.jpeg', // 替换为你的背景图路径
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
camera.position.set(22.961, 27.078, 27.304);
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
  'level2.gltf',
  // called when the resource is loaded
  function (gltf) {
    scene.add(gltf.scene);
    demo1_model = gltf.scene; // 正确赋值
    
    updateDebugInfo("模型加载完成，正在查找目标对象...");
    
    // 查找名为Box_Parent的对象
    targetObject = demo1_model.getObjectByName('Box_Parent');
    // 设置 -90 度


    boxBreakObject = demo1_model.getObjectByName('Box_break');// 第二关 新增
    boxBreakObject.material.color.set(0x93edff); // 亮蓝色主色调
    if (boxBreakObject.material.emissive) {
        boxBreakObject.material.emissive.set(0x0088ff); // 稍暗一点的蓝色发光
        boxBreakObject.material.emissiveIntensity = 0.6; // 发光强度
    }

    boxBreakObject.material.transparent = true; // 设置透明度
    box5Object = demo1_model.getObjectByName('Box5');// 第二关 新增
    bosx5Object_init_y = box5Object.position.y
    // 在模型加载完成的回调中
    if (box5Object) {
        console.log('找到Box5对象');
        box5Object.userData.originalScale = new THREE.Vector3().copy(box5Object.scale);
    } else {
        console.error('未找到Box5对象，Box5伸长动画将不会执行');
        // 可以选择禁用相关动画逻辑
        startBox5Extend = () => console.log('Box5对象不存在，无法执行伸长动画');
    }

    // 保存Box_break的原始属性
    if (boxBreakObject) {
      console.log('找到Box_break对象');
      boxBreakObject.userData.originalScale = new THREE.Vector3().copy(boxBreakObject.scale);
      boxBreakObject.userData.originalPosition = new THREE.Vector3().copy(boxBreakObject.position);
    } else {
      console.error('未找到Box_break对象');
    }

    if (targetObject) {
      console.log('找到目标对象:', targetObject.name);
      updateDebugInfo("找到目标对象: " + targetObject.name);
      
      // 启用旋转按钮
      disableRotationButtons(false);
      
      // 新增：加载精灵模型
      loadSpriteModel();
      //关卡2新增
      startBoxBreak();
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


// 开始Box_break缩短动画
function startBoxBreak() {
  if (boxBreakObject && !isBoxBreaking) {
    isBoxBreaking = true;
    boxBreakStartTime = Date.now();
    // 保存原始长度（假设沿X轴缩放）
    boxBreakObject.userData.originalScale = new THREE.Vector3().copy(boxBreakObject.scale);
    console.log('开始Box_break缩短动画');
  }
}

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
        spriteModel.position.x = -5; 
        spriteModel.position.y = 4;
        spriteModel.position.z = 0.25; // 稍微抬高一点
        
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
  if (currentAngle === 0||currentAngle === 360) {
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
  } else if (isBoxBreaking) {
    const progress = Math.min((Date.now() - boxBreakStartTime) / boxBreakDuration, 1);
    updateDebugInfo(`Box_break消失进度: ${Math.round(progress * 100)}%`);
  } else if (isBox5Extending) {
    const progress = Math.min((Date.now() - box5StartTime) / box5Duration, 1);
    // updateDebugInfo(`Box5伸高进度: ${Math.round(progress * 100)}%`);
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
      if (currentAngle === 0||currentAngle === 360) {
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

  // 新增：处理Box_break从右到左缩短动画（2秒缩短一半）
  if (isBoxBreaking && boxBreakObject) {

    textOverlay.textContent = `维度正在断裂...`;
    textOverlay.style.fontSize = '32px';

    const now = Date.now();
    const elapsed = now - boxBreakStartTime;
    
    if (elapsed < boxBreakDuration) {
      const progress = elapsed / boxBreakDuration;
      const easeProgress = easeInOutCubic(progress);
      
      // 计算当前应有的缩放比例（从1到0.5）
      const currentScale = 1 - easeProgress * 0.5;
      
      // 保存原始属性
      const originalScale = boxBreakObject.userData.originalScale || new THREE.Vector3().copy(boxBreakObject.scale);
      const originalPosition = boxBreakObject.userData.originalPosition || new THREE.Vector3().copy(boxBreakObject.position);
      
      // 设置缩放（只在X轴方向缩短）
      boxBreakObject.scale.x = originalScale.x * currentScale;
      
      // 计算并应用位置调整（从右到左缩短，左边保持不动）
      // 向右移动的距离 = 原始宽度 * (1 - 当前缩放比例) * 0.5
      const positionOffset = originalScale.x * (1 - currentScale) * 0.5;
      boxBreakObject.position.x = originalPosition.x + positionOffset;
      boxBreakObject.material.opacity = 1-progress + 0.2
    } else {
      // 确保最终状态正确
      const originalScale = boxBreakObject.userData.originalScale || new THREE.Vector3().copy(boxBreakObject.scale);
      const originalPosition = boxBreakObject.userData.originalPosition || new THREE.Vector3().copy(boxBreakObject.position);
      
      boxBreakObject.scale.x = originalScale.x * 0.1;
      // boxBreakObject.material.opacity = 0
      boxBreakObject.visible = false;
      // boxBreakObject.position.x = originalPosition.x - originalScale.x  ; // 最终偏移量
      isBoxBreaking = false;
      textOverlay.style.opacity = '0';

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
      // 新增：精灵移动完成后，开始Box5伸长动画
      if (box5Object) {
        isBox5Extending = true;
        box5StartTime = Date.now();
      }

    }
  }

  // 新增：处理Box5伸长动画（2秒伸长一倍）
  if (isBox5Extending && box5Object) {
    const now = Date.now();
    const elapsed = now - box5StartTime;
    
    if (elapsed < box5Duration) {
      box5Progress = elapsed / box5Duration;
      const easeProgress = easeInOutCubic(box5Progress);
      box5Object.position.y = bosx5Object_init_y + easeProgress;
      spriteModel.position.y = box5Object.position.y+1
      // updateDebugInfo(`easeProgress：${easeProgress}，box5Progress：${box5Progress}`);
    } else {
      box5Object.position.y = bosx5Object_init_y + 1 ;  
      spriteModel.position.y = box5Object.position.y+1
      isBox5Extending = false;
      window.location.href = 'main200.html'; // 假设main200.js对应页面为main200.html
      console.log('Box5伸长完成');
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