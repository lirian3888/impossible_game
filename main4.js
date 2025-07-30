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
// 背景图相关变量
let backgroundTexture; // 背景纹理对象
let bgAspectRatio; // 背景图宽高比

// 初始化场景 - 使用之前成功显示的深蓝色背景
const scene = new THREE.Scene();
// 加载背景图并设置
const textureLoader = new THREE.TextureLoader();
textureLoader.load(
  'blackground_last.jpg', // 替换为当前关卡的背景图路径
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


// 相机设置 - 保留成功版本的位置和朝向参数
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(41.274, 46.206, 34.775); // 维持指定位置
camera.lookAt(0, 0, 0); // 这个朝向在成功版本中能看到模型

// 初始化渲染器 - 确保正确添加到DOM
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas, 
    antialias: true,
    alpha: false // 关闭透明，避免背景融合问题
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvas.style.display = 'block';
canvas.style.zIndex = '10';
document.body.appendChild(renderer.domElement); // 明确添加到DOM，成功版本有这个

// 光照设置 - 使用成功版本的光照参数
const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.1);
directionalLight2.position.set(26.711, -4.452, 1.55); // 成功版本的光源位置
scene.add(directionalLight2);


const loader = new GLTFLoader();
// loader.setDRACOLoader(dracoLoader);

// 变量初始化
let level4Model, spriteModel;
let boxMoveL1, boxMoveL2;
let currentPointIndex = 0;
let isMoving = false; // 跟踪精灵是否正在移动
let moveDistance = 3.0; // 每次移动的距离
let moveInterval = null; // 用于存储长按定时器ID
const points = [
    { x: 19.129, y: 17.725, z: 11.5 }, // 起始位置
    { x: 17.5, y: 17.725, z: 11.5 }, // 点A
    { x: 6.513, y: 17.725, z: 11.5 },  // 点B
    { x: 6.513, y: 17.725, z: 7.411 },   // 点C
    { x: 12.183, y: 17.725, z: 7.411 },  // 点D
    { x: 12.183, y: 17.725, z: 17.817 }, // 点E
    { x: 22.653, y: 17.725, z: 17.817 }  // 终点
];

// 调试信息元素
const debugInfo = document.getElementById('debugInfo');
debugInfo.style.backgroundColor = 'rgba(0,0,0,0.7)';
debugInfo.style.color = 'white';
debugInfo.style.padding = '5px';

// 创建控制按钮
function createButtons() {
    // 旋转控制按钮
    const rotateControls = document.createElement('div');
    rotateControls.style.position = 'absolute';
    rotateControls.style.bottom = '20px';
    rotateControls.style.left = '50%';
    rotateControls.style.transform = 'translateX(-50%)';
    rotateControls.style.zIndex = '100';
    rotateControls.style.display = 'flex';
    rotateControls.style.gap = '10px';
    document.body.appendChild(rotateControls);

    const leftBtn = document.createElement('button');
    leftBtn.textContent = '向左旋转90度';
    leftBtn.style.padding = '10px 20px';
    leftBtn.style.fontSize = '16px';
    leftBtn.style.backgroundColor = 'rgba(0,0,0,0.7)';
    leftBtn.style.color = 'white';
    leftBtn.style.border = 'none';
    leftBtn.style.borderRadius = '4px';
    leftBtn.addEventListener('click', () => rotateBoxes(-Math.PI / 2));
    rotateControls.appendChild(leftBtn);

    const rightBtn = document.createElement('button');
    rightBtn.textContent = '向右旋转90度';
    rightBtn.style.padding = '10px 20px';
    rightBtn.style.fontSize = '16px';
    rightBtn.style.backgroundColor = 'rgba(0,0,0,0.7)';
    rightBtn.style.color = 'white';
    rightBtn.style.border = 'none';
    rightBtn.style.borderRadius = '4px';
    rightBtn.addEventListener('click', () => rotateBoxes(Math.PI / 2));
    rotateControls.appendChild(rightBtn);

    // 移动控制按钮
    const moveControls = document.createElement('div');
    moveControls.style.position = 'absolute';
    moveControls.style.bottom = '80px';
    moveControls.style.left = '50%';
    moveControls.style.transform = 'translateX(-50%)';
    moveControls.style.zIndex = '100';
    moveControls.style.display = 'flex';
    moveControls.style.gap = '10px';
    document.body.appendChild(moveControls);

    const forwardBtn = document.createElement('button');
    forwardBtn.textContent = '向前移动';
    forwardBtn.style.padding = '10px 20px';
    forwardBtn.style.fontSize = '16px';
    forwardBtn.style.backgroundColor = 'rgba(0,0,0,0.7)';
    forwardBtn.style.color = 'white';
    forwardBtn.style.border = 'none';
    forwardBtn.style.borderRadius = '4px';

    // 长按逻辑：鼠标事件
    forwardBtn.addEventListener('mousedown', startContinuousMove);
    forwardBtn.addEventListener('mouseup', stopContinuousMove);
    forwardBtn.addEventListener('mouseleave', stopContinuousMove);
    
    // 长按逻辑：触摸事件（适配移动设备）
    forwardBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // 防止触摸事件被识别为点击
        startContinuousMove();
    });
    forwardBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopContinuousMove();
    });
    forwardBtn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        stopContinuousMove();
    });

    moveControls.appendChild(forwardBtn);
}

// 开始持续移动（长按触发）
function startContinuousMove() {
    // 避免重复设置定时器
    if (moveInterval || !spriteModel) return;
    
    // 立即执行一次移动
    moveSpriteForward();
    
    // 设置定时器，每隔200ms（与动画时长一致）执行一次移动
    moveInterval = setInterval(moveSpriteForward, 200);
}

// 停止持续移动（松开按钮触发）
function stopContinuousMove() {
    if (moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null;
    }
}

// 旋转盒子
function rotateBoxes(angle) {
    if (boxMoveL1) {
        boxMoveL1.rotation.y += angle;
        normalizeRotation(boxMoveL1);
        if(boxMoveL1.rotation.y==0){
            boxMoveL1.rotation.y= Math.PI;            
        }if(boxMoveL1.rotation.y==-Math.PI/2){
            boxMoveL1.rotation.y= Math.PI/2;            
        }
    }
    
    if (boxMoveL2) {
        boxMoveL2.rotation.y += angle;
        normalizeRotation(boxMoveL2);
    }
    
    updateDebugInfo();
}

// 标准化旋转角度
function normalizeRotation(object) {
    object.rotation.y = ((object.rotation.y % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (object.rotation.y > Math.PI) {
        object.rotation.y -= 2 * Math.PI;
    }
}

// 计算两点之间的距离
function distanceBetweenPoints(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 精灵向前移动 - 逐步移动逻辑
function moveSpriteForward() {
    if (!spriteModel || isMoving) return;
    
    // 检查是否可以移动到下一个区域
    let canMove = true;
    
    // 点A到点B的限制
    if (currentPointIndex === 1) { 
        const box1Angle = Math.round(boxMoveL1.rotation.y * (180 / Math.PI));
        if (box1Angle !== 90 && box1Angle !== -90 && box1Angle !== 270) {
            canMove = false;
            alert('无法通过，请想办法！');
            stopContinuousMove(); // 无法移动时停止长按
        }
    }
    //第二段精灵的朝向
    if (currentPointIndex === 2) { 
        spriteModel.rotation.y = -180
    }

    if (currentPointIndex === 3) { 
        spriteModel.rotation.y = 90
    }

     // 点D到点E的限制
    if (currentPointIndex === 4) { 
        spriteModel.rotation.y = 0
        const box1Angle = Math.round(boxMoveL1.rotation.y * (180 / Math.PI));
        if (box1Angle !== 0 && box1Angle !== 180 && box1Angle !== 360) {
            canMove = false;
            alert('无法通过，请想办法！！');
            stopContinuousMove(); // 无法移动时停止长按
        }
    }
    
    // 点E到终点的限制
    if (currentPointIndex === 5) { 
        spriteModel.rotation.y = 90
        const box2Angle = Math.round(boxMoveL2.rotation.y * (180 / Math.PI));
        if (box2Angle !== 0 && box2Angle !== 180 && box2Angle !== 360) {
            canMove = false;
            alert('无法通过，请想办法！！！！');
            stopContinuousMove(); // 无法移动时停止长按
        }
    }
    
    if (!canMove) return;
    
    // 确定下一个目标点
    let targetPointIndex = currentPointIndex + 1;
    if (targetPointIndex >= points.length) {
        targetPointIndex = points.length - 1;
        stopContinuousMove(); // 到达终点时停止长按
    }
    
    const targetPoint = points[targetPointIndex];
    const currentPosition = {
        x: spriteModel.position.x,
        y: spriteModel.position.y,
        z: spriteModel.position.z
    };
    
    // 计算到目标点的距离
    const distance = distanceBetweenPoints(currentPosition, targetPoint);
    
    // 如果距离小于每次移动的距离，直接到达目标点并更新索引
    if (distance <= moveDistance) {
        spriteModel.position.set(targetPoint.x, targetPoint.y, targetPoint.z);
        currentPointIndex = targetPointIndex;
        
        // 检查是否到达终点
        if (currentPointIndex === points.length - 1) {
            alert('恭喜到达终点！');
            window.location.href = 'end_page.html';
        }
    } else {
        // 否则，计算移动方向并移动一步
        const direction = {
            x: (targetPoint.x - currentPosition.x) / distance,
            y: (targetPoint.y - currentPosition.y) / distance,
            z: (targetPoint.z - currentPosition.z) / distance
        };
        
        // 计算新位置
        const newPosition = {
            x: currentPosition.x + direction.x * moveDistance,
            y: currentPosition.y + direction.y * moveDistance,
            z: currentPosition.z + direction.z * moveDistance
        };
        
        // 开始移动动画
        startMovementAnimation(newPosition);
    }
    
    updateDebugInfo();
}

// 移动动画
function startMovementAnimation(targetPosition) {
    if (isMoving || !spriteModel) return;
    
    isMoving = true;
    const startPosition = {
        x: spriteModel.position.x,
        y: spriteModel.position.y,
        z: spriteModel.position.z
    };
    
    const duration = 200; // 动画持续时间（毫秒）- 与定时器间隔一致
    const startTime = Date.now();
    
    // 动画函数
    function animateMovement() {
        if (!isMoving) return;
        
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // 计算当前位置（线性插值）
        const currentPosition = {
            x: startPosition.x + (targetPosition.x - startPosition.x) * progress,
            y: startPosition.y + (targetPosition.y - startPosition.y) * progress,
            z: startPosition.z + (targetPosition.z - startPosition.z) * progress
        };
        
        // 更新精灵位置
        spriteModel.position.set(currentPosition.x, currentPosition.y, currentPosition.z);
        
        // 检查动画是否完成
        if (progress >= 1) {
            isMoving = false;
        } else {
            requestAnimationFrame(animateMovement);
        }
    }
    
    // 开始动画
    animateMovement();
}

// 更新调试信息
function updateDebugInfo() {
    let box1Angle = '未找到';
    let box2Angle = '未找到';
    let modelStatus = '加载中...';
    let spritePos = '未知';
    
    if (level4Model && spriteModel) modelStatus = '模型加载完成';
    else if (level4Model) modelStatus = '关卡模型已加载';
    else if (spriteModel) modelStatus = '精灵已加载';
    
    if (spriteModel) {
        spritePos = `(${spriteModel.position.x.toFixed(2)}, ${spriteModel.position.y.toFixed(2)}, ${spriteModel.position.z.toFixed(2)})`;
    }
    
    if (boxMoveL1) {
        box1Angle = Math.round(boxMoveL1.rotation.y * (180 / Math.PI)) + '°';
    }
    if (boxMoveL2) {
        box2Angle = Math.round(boxMoveL2.rotation.y * (180 / Math.PI)) + '°';
    }
    
    debugInfo.innerHTML = `
        ${modelStatus}<br>
        当前位置: ${getPointName(currentPointIndex)}<br>
        精灵坐标: ${spritePos}<br>
        Box1角度: ${box1Angle}<br>
        Box2角度: ${box2Angle}
    `;
}

// 获取点名称
function getPointName(index) {
    const names = ['起点', '点A', '点B', '点C', '点D', '点E', '终点'];
    return names[index] || `点${index}`;
}

// 加载精灵模型 - 保留成功版本的缩放设置
function loadSpriteModel() {
    const spriteLoader = new GLTFLoader();
    spriteLoader.setDRACOLoader(dracoLoader);
    spriteLoader.load(
        'sprite.glb',
        (gltf) => {
            spriteModel = gltf.scene;
            scene.add(spriteModel);
            
            // 关键：保留成功版本的精灵缩放
            spriteModel.scale.set(2.5, 2.5, 2.5); // 这个缩放让精灵可见
            spriteModel.rotation.y = -90;
            // 设置初始位置
            const startPos = points[0];
            spriteModel.position.set(startPos.x, startPos.y, startPos.z);
            
            updateDebugInfo();
        },
        (xhr) => {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            debugInfo.textContent = `精灵加载中: ${percent}%`;
        },
        (error) => {
            console.error('精灵加载错误:', error);
            debugInfo.textContent = '精灵加载错误';
        }
    );
}

// 加载关卡模型
let level4_mode = 'level4_new3.gltf';
loader.load(
    level4_mode,
    (gltf) => {
        level4Model = gltf.scene;
        scene.add(level4Model);
        
        level4Model.traverse((child) => {
            // 查找可移动盒子
            if (child.name === 'Box_move_l1') {
                boxMoveL1 = child;
                child.rotation.y = Math.PI ;
            }
            if (child.name === 'Box_move_l2') boxMoveL2 = child;
            if(child.name == 'Plane_4' && (child.position.x<10)){
                console.log(`Plane_4位置: (${child.position.x}, ${child.position.y}, ${child.position.z})`);
                if(level4_mode=='level4_new.gltf'){child.position.y = 11.638;}
                if(level4_mode=='level4_new1.gltf')
                    {
                        child.scale.y = 1.6;
                        child.scale.z= 1.1;
                        child.position.y = 8.888
                        child.position.y = 14.562;
                        child.position.z = 15.109;
                        
                    }
                
            }
            if(child.name == 'Box_5' && (child.position.x<10)){
                child.position.y = 10.602
                child.position.z = 13.988
            }
            if(child.name == 'Box_7' && (child.position.x>18)&&(level4_mode=='level4_new.gltf')){
                child.position.x = 21.072
                child.position.y = 12.048
                child.position.z = 17.068
                child.scale.x = 1.5;  // 放大2倍

            }
            
        });
        
        updateDebugInfo();
        loadSpriteModel();
    },
    (xhr) => {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        debugInfo.textContent = `关卡加载中: ${percent}%`;
    },
    (error) => {
        console.error('关卡加载错误:', error);
        debugInfo.textContent = '关卡加载错误';
        loadSpriteModel();
    }
);

// 窗口大小调整
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateBackgroundCenterFit();
});

// 创建控制按钮
createButtons();

// 初始化调试信息
updateDebugInfo();

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
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

  // 切换状态并保存到localStorage
  isMusicPlaying = !isMusicPlaying;
  localStorage.setItem('gameMusicEnabled', isMusicPlaying);
  

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
// 在相机初始化完成后调用
initAudio('music.mp3');

// 创建控制按钮（可选）
createMusicButton();
animate();