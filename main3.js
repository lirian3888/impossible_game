import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Audio, AudioLoader, AudioListener } from 'three';

import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// 创建DRACOLoader实例
const dracoLoader = new DRACOLoader();
// 使用CDN上的解码器，无需本地文件
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

// 音频相关变量（精简）
let backgroundMusic;       // 背景音乐对象
let isMusicPlaying = false; // 播放状态
console.log("main3.js 开始执行");

// 新增：背景图相关变量
let backgroundTexture; // 背景纹理
let bgAspectRatio; // 背景图宽高比

// 声明变量
let scene, camera, renderer;
let demo3_model;
let spriteModel;

// 物体引用
let boxOneObject; // Box_one - 精灵在第一个box上
let boxMoveObject; // Box_move - 可移动的物体
let boxBigObject; // Box_big - 可旋转的大物体
let planeObject; // Plane - 用于遮盖的平面

// 按钮引用
let leftRotationBtn, rightRotationBtn;

// 边界范围
let boxOneBounds = {
    min: new THREE.Vector3(),
    max: new THREE.Vector3()
};
let boxBigBounds = {
    min: new THREE.Vector3(),
    max: new THREE.Vector3()
};

// 状态变量
let isSpriteControllable = true; // 精灵是否可控制
let isMovingBoxMove = false; // Box_move是否正在移动
let boxBigRotationState = Math.PI/4; // 记录旋转的角度最新状态，初始是45度
let isBoxBigRotating = false; // Box_big是否正在旋转
let isSpriteNotOnBoxOne = false; // 精灵是否不在Box_one上
let isMovingToEnd = false; // 精灵是否正在移动到终点
let isSpriteOnBoxMove = false; // 精灵是否正在可移动的box上
let isBigBoxCloseToMoveBox = false; // bigBox和moveBox是否满足条件
let isSpriteOnBoxBig = false; // 精灵是否在bigBox上

// 移动状态变量
let isMovingForward = false;
let isMovingBackward = false;

// 动画变量
let moveProgress = 0;
const moveDuration = 2000; // 移动持续时间
let moveStartTime = 0;
let targetPosition;

// 终点坐标和MoveBox目标位置
const endPoint = new THREE.Vector3(0.5, 0.5, 4); // 终点位置
const moveBoxTargetPosition = new THREE.Vector3(0.4, -1, -13.5); // MoveBox的指定目标位置
const positionThreshold = 0.1; // 位置判断阈值
const endPointThreshold = 0.8; // 终点检测阈值
const moveBoxAvoidThreshold = 1.5; // 避免回到movbox的阈值

// 调试信息面板
let debugInfo;
function updateDebugInfo(message) {
    
    debugInfo = document.getElementById('debugInfo');
    debugInfo.textContent = message;
    // console.log(`调试信息: ${message}`);
}

// 新增：创建界面提示元素的函数
function showCompletionMessage() {
    // 创建提示容器
    const messageContainer = document.createElement('div');
    messageContainer.id = 'completionMessage';
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '50%';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translate(-50%, -50%)';
    messageContainer.style.padding = '30px 50px';
    messageContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    messageContainer.style.color = 'white';
    messageContainer.style.borderRadius = '10px';
    messageContainer.style.fontFamily = 'Arial, sans-serif';
    messageContainer.style.fontSize = '24px';
    messageContainer.style.textAlign = 'center';
    messageContainer.style.zIndex = '9999'; // 确保在最上层显示
    messageContainer.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
    
    // 添加提示文本
    messageContainer.innerHTML = `
        <p style="margin: 0 0 15px 0; font-size: 28px; color: #4CAF50;">任务完成！</p>
        <p style="margin: 0; font-size: 18px;">2秒后自动跳转下一关...</p>
    `;
    
    // 添加到页面
    document.body.appendChild(messageContainer);
    
    // 2秒后移除提示并跳转
    setTimeout(() => {
        messageContainer.remove();
        window.location.href = 'impossible_game4.html';
    }, 2000);
}

// 背景图居中适配函数：保证图片完整显示且居中，不拉伸变形
function updateBackgroundCenterFit() {
  if (!backgroundTexture || !bgAspectRatio) return;

  const windowAspect = window.innerWidth / window.innerHeight; // 窗口宽高比

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

// 初始化场景
function init() {
    debugInfo = document.getElementById('debugInfo');
    updateDebugInfo("初始化场景...");

    // 创建场景
    scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x2c3e50);
    // 加载背景图并设置
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
  'L3.jpg', // 替换为当前关卡的背景图路径
  (texture) => {
    backgroundTexture = texture;
    // 禁用图片重复显示（边缘拉伸而非重复）
    backgroundTexture.wrapS = THREE.ClampToEdgeWrapping;
    backgroundTexture.wrapT = THREE.ClampToEdgeWrapping;
    // 计算背景图宽高比（用于适配窗口）
    bgAspectRatio = texture.image.width / texture.image.height;
    // 设置为场景背景
    scene.background = backgroundTexture;
    // 初始适配窗口
    updateBackgroundCenterFit();
    console.log("背景图加载完成，已居中显示");
  },
  (xhr) => {
    // 加载进度反馈
    const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
    console.log(`背景图加载中: ${percent}%`);
  },
  (error) => {
    console.error('背景图加载失败:', error);
    // 加载失败时使用默认背景色
    scene.background = new THREE.Color(0x3E434D); // 可自定义默认色
  }
);

    // 创建渲染器
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('未找到gameCanvas元素');
        return;
    }

    canvas.style.display = 'block';
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas,
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 创建相机（固定角度）
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(-0.045, 20.503, 9.528);
    camera.lookAt(0, 0, 0);

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    scene.add(directionalLight);

    // 创建UI按钮
    createRotationButtons();
    createMovementButtons();

    // 加载模型
    loadModels();

    // 窗口大小调整
    window.addEventListener('resize', onWindowResize);

    // 在相机初始化完成后调用
    // 示例：传入当前关卡的音乐路径
    initAudio('music.mp3');

    // 创建控制按钮（可选）
    createMusicButton();

    // 开始动画循环
    animate();
}

// 创建移动控制按钮（上、下）
function createMovementButtons() {
    const moveContainer = document.createElement('div');
    moveContainer.style.position = 'fixed';
    moveContainer.style.bottom = '20px';
    moveContainer.style.left = 'calc(50% + 200px)';
    moveContainer.style.transform = 'translateX(0)';
    moveContainer.style.display = 'flex';
    moveContainer.style.flexDirection = 'column';
    moveContainer.style.gap = '10px';
    moveContainer.style.zIndex = '100';

    // 上移按钮
    const upBtn = document.createElement('button');
    upBtn.textContent = '上';
    upBtn.style.padding = '15px 20px';
    upBtn.style.fontSize = '16px';
    upBtn.addEventListener('mousedown', () => isMovingForward = true);
    upBtn.addEventListener('mouseup', () => isMovingForward = false);
    upBtn.addEventListener('mouseleave', () => isMovingForward = false);

    // 下移按钮
    const downBtn = document.createElement('button');
    downBtn.textContent = '下';
    downBtn.style.padding = '15px 20px';
    downBtn.style.fontSize = '16px';
    downBtn.addEventListener('mousedown', () => isMovingBackward = true);
    downBtn.addEventListener('mouseup', () => isMovingBackward = false);
    downBtn.addEventListener('mouseleave', () => isMovingBackward = false);

    moveContainer.appendChild(upBtn);
    moveContainer.appendChild(downBtn);
    document.body.appendChild(moveContainer);
}

// 创建旋转按钮
function createRotationButtons() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.bottom = '20px';
    buttonContainer.style.left = '50%';
    buttonContainer.style.transform = 'translateX(-50%)';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.zIndex = '100';

    // 左旋转按钮
    leftRotationBtn = document.createElement('button');
    leftRotationBtn.textContent = '向左旋转 45°';
    leftRotationBtn.style.padding = '10px 20px';
    leftRotationBtn.style.fontSize = '16px';
    leftRotationBtn.addEventListener('click', () => rotateBoxBig(1));

    // 右旋转按钮
    rightRotationBtn = document.createElement('button');
    rightRotationBtn.textContent = '向右旋转 45°';
    rightRotationBtn.style.padding = '10px 20px';
    rightRotationBtn.style.fontSize = '16px';
    rightRotationBtn.addEventListener('click', () => rotateBoxBig(-1));

    buttonContainer.appendChild(leftRotationBtn);
    buttonContainer.appendChild(rightRotationBtn);
    document.body.appendChild(buttonContainer);

    // 添加控制说明
    const instructions = document.createElement('div');
    instructions.style.position = 'fixed';
    instructions.style.bottom = '80px';
    instructions.style.width = '100%';
    instructions.style.textAlign = 'center';
    instructions.style.color = 'white';
    instructions.style.zIndex = '100';
    instructions.innerHTML = `
        <p>使用上下按钮控制角色移动 </p>
    `;
    document.body.appendChild(instructions);
}

// 加载模型
function loadModels() {
    updateDebugInfo("加载模型中...");

    const loader = new GLTFLoader();

    loader.load(
        'level3.gltf',
        function (gltf) {
            scene.add(gltf.scene);
            demo3_model = gltf.scene;

            // 查找场景中的物体
            findSceneObjects();

            // 加载精灵模型
            loadSpriteModel();
        },
        function (xhr) {
            const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
            updateDebugInfo(`模型加载进度: ${percent}%`);
        },
        function (error) {
            console.error('模型加载错误:', error);
            updateDebugInfo("模型加载失败: " + error.message);
        }
    );
}

// 查找场景中的物体
function findSceneObjects() {
    // 查找Box_one
    boxOneObject = findObjectByNameRecursive(demo3_model, 'Box_one');
    if (boxOneObject) {
        console.log('找到Box_one对象');
        calculateBoxOneBounds();
    } else {
        console.error('未找到Box_one对象');
        updateDebugInfo("错误: 未找到Box_one对象");
    }

    // 查找Box_move
    boxMoveObject = findObjectByNameRecursive(demo3_model, 'Box_move');
    if (boxMoveObject) {
        console.log('找到Box_move对象');
    } else {
        console.error('未找到Box_move对象');
    }

    // 查找Box_big
    boxBigObject = findObjectByNameRecursive(demo3_model, 'Box_big');
    if (boxBigObject) {
        console.log('找到Box_big对象');
        boxBigObject.userData.originalRotation = boxBigObject.rotation.y;
        calculateBoxBigBounds();
    } else {
        console.error('未找到Box_big对象');
    }

    // 查找Plane
    planeObject = findObjectByNameRecursive(boxBigObject, 'Plane');
    if (planeObject) {
        console.log('找到Plane对象');
    } else {
        console.error('未找到Plane对象');
    }
}

// 计算Box_one的边界范围
function calculateBoxOneBounds() {
    if (!boxOneObject) return;

    const box = new THREE.Box3().setFromObject(boxOneObject);
    boxOneBounds.min.copy(box.min);
    boxOneBounds.max.copy(box.max);
    boxOneBounds.max.z -= 1;
    boxOneBounds.min.z -= 1;
    console.log('Box_one边界:', boxOneBounds);
}

// 计算Box_big的边界范围
function calculateBoxBigBounds() {
    if (!boxBigObject) return;

    const box = new THREE.Box3().setFromObject(boxBigObject);
    boxBigBounds.min.copy(box.min);
    boxBigBounds.max.copy(box.max);
    boxBigBounds.min.y += 0.5;
    boxBigBounds.max.y += 0.5;
    console.log('Box_big边界:', boxBigBounds);
}

// 加载精灵模型
function loadSpriteModel() {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
        'sprite.glb',
        function (gltf) {
            spriteModel = gltf.scene;

            // 设置精灵初始位置
            if (boxOneObject) {
                const boxPosition = new THREE.Vector3();
                boxOneObject.getWorldPosition(boxPosition);
                spriteModel.position.set(
                    boxPosition.x,
                    boxPosition.y + 0.5,
                    boxPosition.z + 8
                );
            }
            spriteModel.rotation.y = Math.PI;
            // 设置精灵大小
            spriteModel.scale.set(2, 2, 2);
            scene.add(spriteModel);

            updateDebugInfo("精灵加载完成，使用上下按钮移动");
        },
        function (xhr) {
            const percent = (xhr.loaded / xhr.total * 100).toFixed(1);
            updateDebugInfo(`精灵模型加载进度: ${percent}%`);
        },
        function (error) {
            console.error('精灵模型加载错误:', error);
            updateDebugInfo("精灵模型加载失败");
        }
    );
}

// 旋转Box_big
function rotateBoxBig(targetState) {
    if (!boxBigObject || isBoxBigRotating) return;

    // 计算目标角度
    let targetRotation;
    switch (targetState) {
        case 1: // 左旋转45度
            if (boxBigRotationState == Math.PI/4){
                targetRotation = Math.PI / 4;
            }else{
                boxBigRotationState = boxBigRotationState + Math.PI / 4
                targetRotation = boxBigRotationState
            }  
            break;
        case -1: // 右旋转45度
            if (boxBigRotationState == -Math.PI/4){
                    targetRotation = -Math.PI / 4;
                }else{
                    boxBigRotationState = boxBigRotationState - Math.PI / 4
                    targetRotation = boxBigRotationState
                }
            break;
        default:
            targetRotation = 0;
    }

    // 更新状态
    isBoxBigRotating = true;
    // 禁用按钮防止多次点击
    setRotationButtonsState(false);

    // 快速旋转
    const startRotation = boxBigObject.rotation.y;
    const startTime = Date.now();
    const rotationDuration = 80;

    function rotateAnimation() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / rotationDuration, 1);

        boxBigObject.rotation.y = startRotation + (targetRotation - startRotation) * progress;
        updatePlanePosition();

        if (progress < 1) {
            requestAnimationFrame(rotateAnimation);
        } else {
            isBoxBigRotating = false;
            updateDebugInfo(`Box_big当前角度: ${Math.round(boxBigRotationState * 180 / Math.PI)}°`);
            // 恢复按钮状态
            updateRotationButtonsState();
        }
    }

    rotateAnimation();
}

// 更新Plane位置
function updatePlanePosition() {
    if (!planeObject) return;

    switch (boxBigRotationState) {
        case Math.PI/4: // 左45度
            planeObject.scale.set(1, 1, 1);
            planeObject.position.set(-0.9, 2, 1);
            break;
        case -Math.PI/4: // 右45度
            planeObject.scale.set(1, 1, 1);
            planeObject.position.set(0.85, 2, 0);
            break;
        default: // 0度
            planeObject.position.set(-0.04, 2, 1);
            planeObject.scale.set(0.7, 1, 1);
    }
}

// 检查精灵是否在Box_move上
function checkSpriteOnBoxMove() {
    if (!spriteModel || !boxMoveObject) return false;

    const spritePos = spriteModel.position;
    const boxMovePos = boxMoveObject.position;
    const distance = spritePos.distanceTo(boxMovePos);
    
    // 只有在两个条件不满足时才强制位置同步
    if (distance < 1) {
        isSpriteOnBoxMove = true;
        spriteModel.rotation.y = 0;
        if (!isBigBoxCloseToMoveBox) {
            spritePos.x = boxMovePos.x;
            spritePos.z = boxMovePos.z;
        }
    } else {
        isSpriteOnBoxMove = false;
    }
    return isSpriteOnBoxMove;
}

// 检查位置是否接近movbox
function isPositionNearMoveBox(position) {
    if (!boxMoveObject) return false;
    const distance = position.distanceTo(boxMoveObject.position);
    return distance < moveBoxAvoidThreshold;
}

// 检查是否满足两个条件：MoveBox在指定位置且BigBox角度为0度
function checkBigBoxCloseBoxMove() {
    if (!boxBigObject || !boxMoveObject) {
        isBigBoxCloseToMoveBox = false;
        return false;
    }

    // 条件1：MoveBox是否到达指定位置
    const distanceToTarget = boxMoveObject.position.distanceTo(moveBoxTargetPosition);
    const isMoveBoxAtTarget = distanceToTarget < positionThreshold;
    
    // 条件2：BigBox角度是否为0度
    const isBigBoxZeroDegree = Math.abs(boxBigRotationState) < 0.01; // 接近0弧度
    
    // 同时满足两个条件才为true
    isBigBoxCloseToMoveBox = isMoveBoxAtTarget && isBigBoxZeroDegree;

    // 新状态
    const newState = isMoveBoxAtTarget && isBigBoxZeroDegree;
    
    // 调试信息显示当前状态
    let statusText = "";
    if (!isMoveBoxAtTarget) {
        statusText += "MoveBox未到达指定位置 | ";
    } else {
        statusText += "MoveBox已在指定位置 | ";
    }
    
    if (!isBigBoxZeroDegree) {
        statusText += `BigBox角度: ${Math.round(boxBigRotationState * 180 / Math.PI)}° (需要0°)`;
    } else {
        statusText += "BigBox角度: 0°";
    }
    
    if (isBigBoxCloseToMoveBox) {
        statusText += " | 条件满足，精灵可移动";
        isSpriteControllable = true;
    } else {
        statusText += " | 条件未满足，精灵不可移动";
    }
    
    // 添加精灵是否在bigbox上的状态
    if (isSpriteOnBoxBig) {
        statusText += " | 精灵在大平台上，无法旋转";
    }
    // updateDebugInfo(statusText);
    
    return isBigBoxCloseToMoveBox;
}

// 检查精灵是否在boxBig上
function checkSpriteOnBoxBig() {
    if (!spriteModel || !boxBigObject) return false;

    const spritePos = spriteModel.position;
    isSpriteOnBoxBig = (
        spritePos.x >= boxBigBounds.min.x &&
        spritePos.x <= boxBigBounds.max.x &&
        spritePos.z >= (boxBigBounds.min.z-2.1) &&
        spritePos.z <= boxBigBounds.max.z+2
    );
    
    // 根据精灵是否在bigbox上更新旋转按钮状态
    updateRotationButtonsState();
    
    return isSpriteOnBoxBig;
}

// 更新旋转按钮状态
function updateRotationButtonsState() {
    // 如果精灵在bigbox上或者正在旋转，则禁用按钮
    const shouldDisable = isSpriteOnBoxBig || isBoxBigRotating;
    setRotationButtonsState(!shouldDisable);
}

// 设置旋转按钮状态（启用/禁用）
function setRotationButtonsState(enabled) {
    if (leftRotationBtn) leftRotationBtn.disabled = !enabled;
    if (rightRotationBtn) rightRotationBtn.disabled = !enabled;
    
    // 添加视觉反馈
    if (leftRotationBtn) {
        leftRotationBtn.style.opacity = enabled ? "1" : "0.5";
        leftRotationBtn.style.cursor = enabled ? "pointer" : "not-allowed";
    }
    if (rightRotationBtn) {
        rightRotationBtn.style.opacity = enabled ? "1" : "0.5";
        rightRotationBtn.style.cursor = enabled ? "pointer" : "not-allowed";
    }
}

// 移动Box_move和精灵到目标位置
function moveBoxMoveAndSprite() {
    if (isMovingBoxMove || !boxMoveObject || !spriteModel) return;
    if (!isSpriteOnBoxMove) return;

    isMovingBoxMove = true;
    isSpriteControllable = false;
    moveStartTime = Date.now();

    // 记录起始位置
    const startBoxPos = new THREE.Vector3().copy(boxMoveObject.position);
    const startSpritePos = new THREE.Vector3().copy(spriteModel.position);
    boxMoveObject.userData.startPos = startBoxPos;
    spriteModel.userData.startPos = startSpritePos;

    // 目标位置（使用预设的指定位置）
    targetPosition = moveBoxTargetPosition;

    updateDebugInfo("开始移动到指定位置...");
}

// 检查是否到达终点
function checkReachEndPoint() {
    if (!spriteModel) return false;
    
    const distance = spriteModel.position.distanceTo(endPoint);
    if (distance < endPointThreshold){
        isMovingToEnd = true
    }
    return distance < endPointThreshold;
}

// 更新精灵位置（基于按钮控制）
function updateSpritePosition(deltaTime) {
    if (!spriteModel || !isSpriteControllable) return;

    const moveSpeed = 5 * deltaTime;
    const newPosition = new THREE.Vector3().copy(spriteModel.position);

    // 计算移动方向
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // 检查状态
    checkSpriteOnBoxMove();
    checkBigBoxCloseBoxMove();
    checkSpriteOnBoxBig();

    // 终点检测
    if (checkReachEndPoint()) {
        // updateDebugInfo("到达终点，跳转下一关！");
        // 延时2000毫秒（2秒）后再跳转
       showCompletionMessage();
        return;
    }

    // 满足条件时的特殊移动逻辑
    if (isBigBoxCloseToMoveBox) {
        // 关键修改：在bigbox上允许向前和向后移动
        if (isMovingForward) {
            newPosition.addScaledVector(forward, moveSpeed);
        }
        if (isMovingBackward) {
            newPosition.addScaledVector(forward, -moveSpeed);
        }

        // 限制在boxBig范围内
        newPosition.x = Math.max(boxBigBounds.min.x, Math.min(newPosition.x, boxBigBounds.max.x));
        newPosition.z = Math.max(boxBigBounds.min.z-2, Math.min(newPosition.z, boxBigBounds.max.z+2));
        if (newPosition.z>=-7.5&&newPosition.z<=-5.23){
            newPosition.y=2.5
            newPosition.z=-5.23
        }
        if (newPosition.z>-5.23&&newPosition.z<=0.432){
            newPosition.y=2.5
        }
        if (newPosition.z>=0.432){
            newPosition.y=0.5
        }
        // 关键修改：如果精灵在bigbox上，防止移动到movbox附近
        // if (isSpriteOnBoxBig && isPositionNearMoveBox(newPosition)) {
        //     // 不更新位置，阻止向movbox移动
        //     updateDebugInfo("精灵在大平台上，不能返回移动平台");
        //     return;
        // }
    } 
    // 普通移动逻辑
    else {
        if (isMovingForward) {
            newPosition.addScaledVector(forward, moveSpeed);
        }
        if (isMovingBackward) {
            newPosition.addScaledVector(forward, -moveSpeed);
        }

        // 检查精灵不在boxone上
        if (Math.abs(boxOneBounds.min.x - newPosition.x) > 2) {
            isSpriteNotOnBoxOne = true;
        }

        // 应用普通边界限制
        if (!isSpriteOnBoxMove || !isSpriteNotOnBoxOne) {
            if (boxOneObject) {
                newPosition.x = Math.max(boxOneBounds.min.x, Math.min(newPosition.x, boxOneBounds.max.x));
                newPosition.z = Math.max(boxOneBounds.min.z, Math.min(newPosition.z, boxOneBounds.max.z));
            }
        }
    }

    // 只有当条件不满足时，才自动移动boxMove
    if (isSpriteOnBoxMove && !isMovingBoxMove && !isBigBoxCloseToMoveBox) {
        moveBoxMoveAndSprite();
    }

    // 更新精灵位置
    spriteModel.position.copy(newPosition);
    // console.log("newPosition",newPosition)
}

// 窗口大小调整
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateBackgroundCenterFit();
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = 0.016;

    // 更新精灵位置
    if (!isMovingBoxMove && !isMovingToEnd) {
        updateSpritePosition(deltaTime);
    }

    // 处理Box_move和精灵的移动动画
    if (isMovingBoxMove) {
        const now = Date.now();
        const elapsed = now - moveStartTime;
        const progress = Math.min(elapsed / moveDuration, 1);
        const easeProgress = easeInOutCubic(progress);

        if (boxMoveObject && targetPosition) {
            boxMoveObject.position.lerpVectors(
                boxMoveObject.userData.startPos,
                targetPosition,
                easeProgress
            );

            // 保持精灵在Box_move上
            const offset = new THREE.Vector3().copy(spriteModel.userData.startPos)
                .sub(boxMoveObject.userData.startPos);
            spriteModel.position.copy(boxMoveObject.position).add(offset);
        }

        updateDebugInfo(`移动到指定位置进度: ${Math.round(progress * 100)}%`);

        if (progress >= 1) {
            isMovingBoxMove = false;
            isSpriteControllable = true;
            checkBigBoxCloseBoxMove(); // 移动完成后检查条件
        }
    }

        renderer.render(scene, camera);
}

// 缓动函数
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 递归查找对象
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

// 初始化音频（固定相机专用）
function initAudio(musicPath) {
  // 创建监听者（无需跟随相机移动，因为相机固定）
  const audioListener = new AudioListener();
  
  // 监听者仍需添加到相机（但相机不动，所以只需添加一次）
  camera.add(audioListener);
  
  // 加载音乐
  const audioLoader = new AudioLoader();
  audioLoader.load(
    musicPath,
    (buffer) => {
      backgroundMusic = new Audio(audioListener);
      backgroundMusic.setBuffer(buffer);
      backgroundMusic.setLoop(true); // 循环播放
      backgroundMusic.setVolume(0.5); // 音量
      console.log("背景音乐加载完成");

      // 读取localStorage中的音乐状态
      const savedMusicState = localStorage.getItem('gameMusicEnabled');
      isMusicPlaying = savedMusicState === 'true';

      // 根据保存的状态决定是否播放
      if (isMusicPlaying) {
        backgroundMusic.play().catch(err => {
          console.log("自动播放需要用户交互，等待用户操作...", err);
        });
      }
    },
    (xhr) => console.log(`音乐加载中: ${(xhr.loaded/xhr.total*100).toFixed(1)}%`),
    (err) => console.error("音乐加载失败:", err)
  );
}

// 播放/暂停控制（简化）
function toggleMusic() {
  if (!backgroundMusic) return;
  
  isMusicPlaying ? backgroundMusic.pause() : backgroundMusic.play();
  isMusicPlaying = !isMusicPlaying;
  localStorage.setItem('gameMusicEnabled', isMusicPlaying);
  // 如需更新按钮文字，可在此处添加
}

// 创建控制按钮（可选，固定样式）
function createMusicButton() {
  const btn = document.createElement('button');
  btn.textContent = '音乐开启/关闭';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 8px 16px;
    z-index: 100;
  `;
  btn.onclick = toggleMusic;
  document.body.appendChild(btn);
}


// 启动游戏
init();