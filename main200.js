import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// 修复后期处理模块引用
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Audio, AudioLoader, AudioListener } from 'three';

import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// 创建DRACOLoader实例
const dracoLoader = new DRACOLoader();
// 使用CDN上的解码器，无需本地文件
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

// 音频相关变量（精简）
let backgroundMusic;       // 背景音乐对象
let isMusicPlaying = false; // 播放状态
console.log("main200.js 隐藏关卡开始执行");

// 新增：背景图片相关变量
let backgroundPlane;
let backgroundTexture;

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
  "当柱子升起时，通道将开启，...",
  "记事本向你展开，你将得到惊人的发现...",
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

// 添加从右到左的平行光（修改方向）
const rightToLeftLight = new THREE.DirectionalLight(0xffffff, 0.8);
// 设置光源位置在右侧
rightToLeftLight.position.set(10, 0, 0);
// 设置光线照射方向为左侧
rightToLeftLight.target.position.set(-10, 0, 0);
// 允许该光源产生阴影
rightToLeftLight.castShadow = true;
// 添加光源到场景
scene.add(rightToLeftLight);
// 添加光源目标到场景
scene.add(rightToLeftLight.target);


// 添加沿-45度方向的平行光（从后右方向前左方照射）
const diagonalLight = new THREE.DirectionalLight(0xffffff, 0.6);
// 光源位置：后方（负z）且右侧（正x），形成-45度方向
diagonalLight.position.set(10, 0, -10);
// 照射目标：前方（正z）且左侧（负x），与光源位置形成-45度夹角
diagonalLight.target.position.set(-10, 0, 10);
diagonalLight.castShadow = true;
scene.add(diagonalLight);
scene.add(diagonalLight.target);



// 相机设置
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.copy(fixedCameraPos);
camera.lookAt(fixedLookAtPos);
camera.layers.enable(1); // 确保相机能看到背景图层

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
  
  // 调整背景平面大小以适应窗口变化
  if (backgroundPlane) {
    const aspectRatio = width / height;
    backgroundPlane.scale.set(aspectRatio * 1.5, 1.5, 1);
  }
  
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
loader.setDRACOLoader(dracoLoader);
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
    'sprite.glb',
    (gltf) => {
      spriteModel = gltf.scene;
      spriteModel.scale.set(1, 1, 1);
      spriteModel.position.copy(movePath[0]);
      spriteModel.rotation.y = Math.PI/2;
      scene.add(spriteModel);
      updateDebugInfo("原有精灵加载完成");
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
    'sprite_b.glb', // 精灵B模型
    (gltf) => {
      spriteB = gltf.scene;
      spriteB.scale.set(0.5,0.4,0.5);
      spriteB.rotation.y=-Math.PI/2
      //spriteB.position.set(-0.622, 2.5, 4);（位置错误）
      spriteB.position.set(-2, 2.5, 4);
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
  if (segment==1){
    spriteModel.rotation.y = Math.PI;
  }
  if (segment==2){
    spriteModel.rotation.y = 3*Math.PI/2;
  }
  
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

// 添加状态标记，控制动画和记事本显示
let isAnimating = true;       // 动画是否继续运行
let notebookShown = false;    // 记事本是否已显示

function animate() {
  // 只有动画状态为true时才继续循环
  if (isAnimating) {
    requestAnimationFrame(animate);
  }

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
    
    if (progress >= 1&& !notebookShown) {
      updateDebugInfo("柱子完全升起，隐藏关卡结束");
      // window.location.href = 'impossible_game3.html'; //window.location.href = 'main200.html'; //
     updateDebugInfo("柱子完全升起，显示隐藏信息");
     // 标记记事本已显示，防止重复创建
    notebookShown = true;
    // 停止动画循环（可选，根据需求决定是否完全停止动画）
    isAnimating = false;
    // 创建记事本容器
    const notebookContainer = document.createElement('div');
    notebookContainer.style.position = 'fixed';
    notebookContainer.style.top = '0';
    notebookContainer.style.left = '0';
    notebookContainer.style.width = '100%';
    notebookContainer.style.height = '100%';
    notebookContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    notebookContainer.style.display = 'flex';
    notebookContainer.style.justifyContent = 'center';
    notebookContainer.style.alignItems = 'center';
    notebookContainer.style.zIndex = '1000';
    notebookContainer.id = 'notebookContainer';
    
    // 创建记事本元素
    const notebook = document.createElement('div');
    notebook.style.width = '80%';
    notebook.style.maxWidth = '600px';
    notebook.style.backgroundColor = '#f8f5e6';
    notebook.style.borderRadius = '8px';
    notebook.style.boxShadow = '0 0 20px 5px rgba(255, 255, 100, 0.8), 0 0 30px 10px rgba(255, 255, 150, 0.5)';
    notebook.style.padding = '30px';
    notebook.style.position = 'relative';
    notebook.style.transform = 'perspective(1000px) rotateX(5deg)';
    notebook.style.transition = 'all 0.3s ease';
    notebook.style.cursor = 'pointer';
    notebook.style.fontFamily = 'Arial, sans-serif';
    
    // 添加记事本悬停效果
    notebook.addEventListener('mouseover', () => {
        notebook.style.transform = 'perspective(1000px) rotateX(3deg) scale(1.02)';
        notebook.style.boxShadow = '0 0 25px 8px rgba(255, 255, 100, 0.9), 0 0 35px 15px rgba(255, 255, 150, 0.6)';
    });
    
    notebook.addEventListener('mouseout', () => {
        notebook.style.transform = 'perspective(1000px) rotateX(5deg)';
        notebook.style.boxShadow = '0 0 20px 5px rgba(255, 255, 100, 0.8), 0 0 30px 10px rgba(255, 255, 150, 0.5)';
    });
    
    // 添加记事本内容
    notebook.innerHTML = `
        <h2 style="text-align: center; color: #8b4513; margin-bottom: 20px;">神秘笔记</h2>
        <div style="color: #333; line-height: 1.8; padding: 10px; border-left: 2px solid #d2b48c;">
            <p>2125/7/8</p>
            <ul style="margin-left: 20px;">
                2050年，全球变暖日益严重，南极冰盖迅速融化，环境遭到污染；板块运动和火山爆发频发。<br>2090年，板块和地形发生了巨大改变，亚欧板块向东移动到东经10°~165°美洲板块向北移动至北极点，印度板块向东飘到从前夏威夷岛的位置，地球平均海拔降低10m，青藏高原海拔降低约830m，南非高原和科迪勒拉山系抬升约500m，部分陆地被海水淹没澳大利亚已变成西，东南，东北三个部分，日本沉入马里亚纳海沟......<br>2120年，孢子植物迅速繁衍，基因突变后影响人类生活，威胁北美洲，政府不得不建造空中城市。这些植物的基因突变正是因为废气、废水，甚至是核污染。<br>"维度裂隙"实为高维生命体的观察窗口，他们发现了地球污染，正在通过维度裂缝对人类行为进行了研究。
            </ul>
            <p style="margin-top: 15px;">点击笔记本继续前进...</p>
        </div>
    `;
    
    // 点击记事本后跳转，并确保动画循环已停止
    notebook.addEventListener('click', () => {
      document.body.removeChild(notebookContainer);
      window.location.href = 'impossible_game3.html';
    });

    notebookContainer.appendChild(notebook);
    document.body.appendChild(notebookContainer);
    }
  }

  // 使用后期处理渲染
  composer.render();
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
  // 如需更新按钮文字，可在此处添加
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
// 示例：传入当前关卡的音乐路径
initAudio('music.mp3');

// 创建控制按钮（可选）
createMusicButton();

animate();