import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


window.onload = function () {
    // 尝试获取并设置OpenSCENARIO文件上次保存的路径显示（通过自定义属性方式）
    const savedOpenScenarioPath = localStorage.getItem('openscenario_file_path');
    if (savedOpenScenarioPath) {
        const fileInputOpenScenario = document.getElementById('fileInputOpenScenario');
        fileInputOpenScenario.dataset.lastPath = savedOpenScenarioPath;
        // 以下是一种展示路径给用户的示例方式，比如通过title属性（可根据实际需求调整展示方式）
        fileInputOpenScenario.title = `上次选择的OpenSCENARIO文件路径: ${savedOpenScenarioPath}`;
    }

    // 尝试获取并设置OpenDRIVE文件上次保存的路径显示（通过自定义属性方式）
    const savedOpenDrivePath = localStorage.getItem('opendrive_file_path');
    if (savedOpenDrivePath) {
        const fileInputOpenDrive = document.getElementById('fileInputOpenDrive');
        fileInputOpenDrive.dataset.lastPath = savedOpenDrivePath;
        fileInputOpenDrive.title = `上次选择的OpenDRIVE文件路径: ${savedOpenDrivePath}`;
    }
};

// 获取DOM元素
const fileInputOpenScenario = document.getElementById('fileInputOpenScenario');
const fileInputOpenDrive = document.getElementById('fileInputOpenDrive');
const sceneContainer = document.getElementById('scene-container');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const overviewButton = document.getElementById('overviewButton');
const followButton = document.getElementById('followButton');

// 创建Three.js场景、相机和渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// 将fov从75调整为60，使视野角度变小，可视范围更聚焦，可根据实际效果进一步调整该值
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(new THREE.Color(0xffffff)); // 设置白色背景，便于观察车辆
sceneContainer.appendChild(renderer.domElement);

// 用于控制动画播放暂停的状态变量
let isPlaying = false;
// 记录时间流逝，用于更新动画和行为逻辑
let elapsedTime = 0;
// 标记车辆模型是否加载完成
let vehicleModelLoaded = false;
// 创建GLTF加载器用于加载车辆3D模型
const gltfLoader = new GLTFLoader();
// 存储车辆模型（假设只有一个车辆交通参与者，可根据实际扩展）
let vehicleMesh;

// 用于标记两个文件是否都已选择，初始为false
let openScenarioFileSelected = false;
let openDriveFileSelected = false;

// 鼠标位置相关变量，用于记录拖拽旋转操作时的鼠标位置
let mouseX = 0;
let mouseY = 0;
let isDragging = false;

// 处理OpenSCENARIO文件上传及解析（按照OpenSCENARIO规范提取信息）
fileInputOpenScenario.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        console.log('成功获取到OpenSCENARIO用户选择的文件');
        openScenarioFileSelected = true;

        // 保存当前选择的文件路径到localStorage
        const fileInputOpenScenario = document.getElementById('fileInputOpenScenario');
        localStorage.setItem('openscenario_file_path', fileInputOpenScenario.value);

        const reader = new FileReader();
        reader.onload = function (event) {
            const xmlText = event.target.result;
            console.log('已成功读取OpenSCENARIO文件内容，准备进行XML解析');
            // 这里使用DOMParser解析XML，后续要按OpenSCENARIO规范提取信息
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            // 判断是OpenSCENARIO文件
            const rootElement = xmlDoc.documentElement.tagName;
            console.log('解析出的根元素名称为:', rootElement);
            if (rootElement === 'OpenSCENARIO') {
                console.log('识别为OpenSCENARIO文件，开始解析相关逻辑');

                // 解析Entities部分，获取交通参与者信息
                const entities = xmlDoc.getElementsByTagName('Entities')[0];
                if (entities) {
                    const entityElements = entities.getElementsByTagName('ScenarioObject');
                    console.log('共找到', entityElements.length, '个交通参与者（ScenarioObject）元素');
                    for (let i = 0; i < entityElements.length; i++) {
                        const entity = entityElements[i];
                        const entityName = entity.getAttribute('name');
                        console.log('正在处理交通参与者，名称为:', entityName);

                        // 获取车辆相关模型引用信息（这里以车辆为例，假设都是车辆类型，可根据实际拓展）
                        const vehicleCatalogRef = entity.getElementsByTagName('CatalogReference')[0];
                        const vehicleCatalogName = vehicleCatalogRef.getAttribute('catalogName');
                        const vehicleEntryName = vehicleCatalogRef.getAttribute('entryName');
                        console.log('车辆引用的catalog名称:', vehicleCatalogName, ', 入口名称:', vehicleEntryName);

                        // 获取车辆初始位置信息（从Storyboard的Init部分查找TeleportAction里的位置信息）
                        const storyboard = xmlDoc.getElementsByTagName('Storyboard')[0];
                        if (storyboard) {
                            const initSection = storyboard.getElementsByTagName('Init')[0];
                            if (initSection) {
                                const actions = initSection.getElementsByTagName('Actions')[0];
                                if (actions) {
                                    const privateActions = actions.getElementsByTagName('Private')[0];
                                    if (privateActions) {
                                        const teleportAction = privateActions.getElementsByTagName('TeleportAction')[0];
                                        if (teleportAction) {
                                            const position = teleportAction.getElementsByTagName('Position')[0];
                                            if (position) {
                                                const lanePosition = position.getElementsByTagName('LanePosition')[0];
                                                if (lanePosition) {
                                                    const x = parseFloat(lanePosition.getAttribute('s'));
                                                    const y = 0; // 简化，可根据实际车道横向坐标调整
                                                    const z = 0; // 简化，可根据实际高度坐标调整
                                                    console.log('获取到车辆初始位置信息：', { x, y, z });

                                                    // 使用GLTF加载器加载车辆3D模型（替换之前简单立方体）
                                                    gltfLoader.load('models/scene.gltf', (gltf) => {
                                                        vehicleMesh = gltf.scene;
                                                        vehicleMesh.position.set(x, y, z);
                                                        scene.add(vehicleMesh);
                                                        vehicleModelLoaded = true; // 标记车辆模型已加载完成
                                                        checkAndTriggerLogic();
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 解析Storyboard部分，获取行为和触发条件等信息（示例，可进一步拓展）
                const storyboard = xmlDoc.getElementsByTagName('Storyboard')[0];
                if (storyboard) {
                    console.log('开始解析故事板（Storyboard）信息');
                    // 解析Init部分（此处已在上面获取初始位置时处理了部分，可按需进一步提取其他信息）
                    const initSection = storyboard.getElementsByTagName('Init')[0];

                    // 解析Stories部分
                    const stories = storyboard.getElementsByTagName('Story');
                    console.log('共找到', stories.length, '个故事（Story）元素');
                    for (let i = 0; i < stories.length; i++) {
                        const story = stories[i];
                        console.log('正在解析第', (i + 1), '个故事');
                        const storyName = story.getAttribute('name');
                        console.log('故事名称:', storyName);

                        // 解析Acts部分
                        const acts = story.getElementsByTagName('Act');
                        for (let j = 0; j < acts.length; j++) {
                            const act = acts[j];
                            console.log('正在解析故事中的第', (j + 1), '个行为（Act）');
                            const actName = act.getAttribute('name');
                            console.log('行为名称:', actName);

                            // 解析ManeuverGroups部分（示例，可进一步深入解析动作等细节）
                            const maneuverGroups = act.getElementsByTagName('ManeuverGroup');
                            for (let k = 0; k < maneuverGroups.length; k++) {
                                const maneuverGroup = maneuverGroups[k];
                                console.log('正在解析行为中的第', (k + 1), '个动作组（ManeuverGroup）');
                                const maneuverGroupName = maneuverGroup.getAttribute('name');
                                console.log('动作组名称:', maneuverGroupName);

                                // 解析Actors部分（获取涉及的交通参与者）
                                const actors = maneuverGroup.getElementsByTagName('Actors')[0];
                                if (actors) {
                                    const entityRefs = actors.getElementsByTagName('EntityRef');
                                    console.log('该动作组涉及的交通参与者数量:', entityRefs.length);
                                    for (let l = 0; l < entityRefs.length; l++) {
                                        const entityRef = entityRefs[l];
                                        const entityRefName = entityRef.getAttribute('entityRef');
                                        console.log('涉及的交通参与者名称:', entityRefName);
                                    }
                                }
                            }
                        }
                    }

                    // 解析StopTrigger部分（示例，可根据触发条件做对应逻辑处理）
                    const stopTrigger = storyboard.getElementsByTagName('StopTrigger')[0];
                    if (stopTrigger) {
                        console.log('开始解析停止触发（StopTrigger）信息');
                        const conditionGroup = stopTrigger.getElementsByTagName('ConditionGroup')[0];
                        if (conditionGroup) {
                            const conditions = conditionGroup.getElementsByTagName('Condition');
                            for (let m = 0; m < conditions.length; m++) {
                                const condition = conditions[m];
                                console.log('正在解析第', (m + 1), '个停止触发条件');
                                const conditionName = condition.getAttribute('name');
                                console.log('条件名称:', conditionName);
                                // 这里可以根据具体条件做相应逻辑处理，比如判断是否满足停止条件等（示例未详细实现）
                            }
                        }
                    }

                }
            }
        };
        reader.readAsText(file);
    }
});

// 处理OpenDRIVE文件上传及解析，并按照更准确的方式绘制道路
fileInputOpenDrive.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        console.log('成功获取到OpenDRIVE用户选择的文件');
        openDriveFileSelected = true;
        // 保存当前选择的文件路径到localStorage
        const fileInputOpenDrive = document.getElementById('fileInputOpenDrive');
        localStorage.setItem('opendrive_file_path', fileInputOpenDrive.value);

        const reader = new FileReader();
        reader.onload = function (event) {
            const xodrText = event.target.result;
            console.log('已成功读取OpenDRIVE文件内容，准备进行XML解析');
            const parser = new DOMParser();
            const xodrDoc = parser.parseFromString(xodrText, 'text/xml');
            const roads = xodrDoc.getElementsByTagName('road');
            for (let i = 0; i < roads.length; i++) {
                const road = roads[i];
                const roadId = road.getAttribute('id');
                console.log('正在处理道路', roadId);
                const lanes = road.getElementsByTagName('lane');
                console.log('道路', roadId, '包含', lanes.length, '条车道');

                // 获取道路的平面布局（planView）里的几何元素列表
                const planView = road.getElementsByTagName('planView')[0];
                const geometryElements = planView.getElementsByTagName('geometry');
                let currentS = 0; // 记录当前的s坐标位置，用于确定车道分段位置

                // 定义材质变量，使其在后续处理不同类型车道几何时都能访问到
                const material = new THREE.MeshBasicMaterial({ color: 0x888888 });

                for (let j = 0; j < geometryElements.length; j++) {
                    const geometryElement = geometryElements[j];
                    const s = parseFloat(geometryElement.getAttribute('s'));
                    const x = parseFloat(geometryElement.getAttribute('x'));
                    const y = parseFloat(geometryElement.getAttribute('y'));
                    const hdg = parseFloat(geometryElement.getAttribute('hdg'));
                    const length = parseFloat(geometryElement.getAttribute('length'));
                    const geometryType = geometryElement.firstElementChild.tagName; // 获取几何类型，如line、spiral、arc等

                    // 假设存在一个关联元素或者属性来表示当前几何元素关联的车道范围，示例代码，需根据实际文件结构调整获取方式
                    const associatedLanesForGeometry = geometryElement.getAttribute('associatedLanes'); // 假设获取到关联车道的标识字符串，比如 "1-5" 表示车道1到车道5
                    const [startLaneId, endLaneId] = associatedLanesForGeometry.split('-').map(Number); // 解析出起始和结束车道编号，示例转换为数字类型，需根据实际情况验证数据格式

                    for (let k = 0; k < lanes.length; k++) {
                        const lane = lanes[k];
                        const laneId = parseInt(lane.getAttribute('id')); // 确保车道编号为数字类型进行比较
                        const laneType = lane.getAttribute('type');
                        // 这里只处理类型为 'driving' 的车道，可根据实际需求调整要处理的车道类型
                        if (laneType === 'driving' && laneId >= startLaneId && laneId <= endLaneId) {
                            console.log('正在处理车道', laneId);

                            // 获取车道宽度，考虑更准确的 sOffset 使用方式，结合所在 laneSection 的 s 值来计算相对 sOffset
                            const laneSection = lane.parentNode; // 假设 lane 元素的父元素就是 laneSection，需验证实际文件结构
                            const laneSectionS = parseFloat(laneSection.getAttribute('s'));
                            // 计算当前几何位置对应的相对 sOffset，这里是简单示意，实际可能更复杂
                            const relativeSOffset = s - laneSectionS; 

                            const laneWidthElement = lane.getElementsByTagName('width')[0];
                            let laneWidth;
                            if (laneWidthElement) {
                                const sOffset = relativeSOffset; // 使用调整后的相对 sOffset
                                const a = parseFloat(laneWidthElement.getAttribute('a'));
                                const b = parseFloat(laneWidthElement.getAttribute('b'));
                                const c = parseFloat(laneWidthElement.getAttribute('c'));
                                const d = parseFloat(laneWidthElement.getAttribute('d'));
                                // 计算当前位置（假设sOffset对应的就是当前要创建几何体位置的s坐标，实际可能要更精确判断）的车道宽度
                                laneWidth = a + b * sOffset + c * sOffset * sOffset + d * sOffset * sOffset * sOffset;
                            } else {
                                laneWidth = 3; // 设置默认车道宽度值为3，可根据实际需求调整
                            }

                            // 根据几何类型创建对应的Three.js几何体（这里简单处理了直线和弧线情况，其他类型需补充更准确逻辑）
                            if (geometryType === 'line') {
                                // 对于直线，创建PlaneGeometry表示（简化示例，实际要考虑宽度等更准确设置）
                                const geometry = new THREE.PlaneGeometry(length, laneWidth);
                                const laneMesh = new THREE.Mesh(geometry, material);
                                laneMesh.position.set(x, y, 0);
                                laneMesh.rotation.z = hdg; // 设置旋转角度，使其朝向正确（根据航向hdg）
                                scene.add(laneMesh);
                            } else if (geometryType === 'arc') {
                                // 对于弧线情况，简单近似用多个小的直线段组成的多边形来模拟（更准确可使用CurvePath等复杂几何处理）
                                const numSegments = 20; // 划分的线段数量，可根据精度需求调整
                                const angleIncrement = length / (numSegments * laneWidth); // 每个小线段对应的角度变化
                                const centerX = x + (laneWidth / 2) * Math.cos(hdg);
                                const centerY = y + (laneWidth / 2) * Math.sin(hdg);
                                for (let n = 0; n < 20; n++) {
                                    const startAngle = n * angleIncrement;
                                    const endAngle = (n + 1) * angleIncrement;
                                    const startX = centerX + (laneWidth / 2) * Math.cos(hdg + startAngle);
                                    const startY = centerY + (laneWidth / 2) * Math.sin(hdg + startAngle);
                                    const endX = centerX + (laneWidth / 2) * Math.cos(hdg + endAngle);
                                    const endY = centerY + (laneWidth / 2) * Math.sin(hdg + endAngle);
                                    const segmentGeometry = new THREE.PlaneGeometry(length / numSegments, laneWidth);
                                    const segmentMesh = new THREE.Mesh(segmentGeometry, material);
                                    segmentMesh.position.set((startX + endX) / 2, (startY + endY) / 2, 0);
                                    segmentMesh.rotation.z = hdg + (startAngle + endAngle) / 2;
                                    scene.add(segmentMesh);
                                }
                            }
                        }
                    }

                    currentS = s + length; // 更新当前s坐标位置
                }

            }
            checkAndTriggerLogic();
        };
        reader.readAsText(file);
    }
});
function checkAndTriggerLogic() {
    if (openScenarioFileSelected && openDriveFileSelected && vehicleModelLoaded) {
        camera.position.z = 5;
        setupButtons();
        setupMouseInteraction();
        animate();
    }
}

function setupButtons() {
    playButton.addEventListener('click', function () {
        isPlaying = true;
        startAnimationLoop();
        console.log('play button clicked'); // 添加日志输出，确认点击事件触发
    });
    pauseButton.addEventListener('click', function () {
        isPlaying = false;
        console.log('pause button clicked'); // 添加日志输出，确认点击事件触发
    });
    overviewButton.addEventListener('click', function () {
        // 设置俯瞰视角（示例，调整相机位置和朝向）
        camera.position.set(0, 10, 20);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    });
    followButton.addEventListener('click', function () {
        // 设置跟随车辆视角（示例，绑定相机到车辆位置并保持一定偏移，可根据实际优化）
        if (vehicleMesh) {
            camera.position.copy(vehicleMesh.position);
            camera.position.z += 5;
            camera.lookAt(vehicleMesh.position);
        }
    });
}

function setupMouseInteraction() {
    // 添加鼠标滚轮缩放事件监听器
    sceneContainer.addEventListener('wheel', function (event) {
        event.preventDefault();
        const delta = event.deltaY;
        camera.position.z -= delta * 0.01; // 根据滚轮滚动方向和幅度调整相机z轴位置，实现缩放效果，可调整系数优化缩放灵敏度
    });

    // 添加鼠标按下事件监听器，用于记录拖拽开始时的鼠标位置和状态
    sceneContainer.addEventListener('mousedown', function (event) {
        event.preventDefault();
        isDragging = true;
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

    // 添加鼠标移动事件监听器，用于在拖拽过程中根据鼠标移动量旋转相机
    sceneContainer.addEventListener('mousemove', function (event) {
        event.preventDefault();
        if (isDragging) {
            const offsetX = event.clientX - mouseX;
            const offsetY = event.clientY - mouseY;
            camera.rotation.y -= offsetX * 0.001; // 根据水平方向鼠标移动量旋转相机y轴（左右旋转），可调整系数优化旋转灵敏度
            camera.rotation.x -= offsetY * 0.001; // 根据垂直方向鼠标移动量旋转相机x轴（上下旋转），可调整系数优化旋转灵敏度
            mouseX = event.clientX;
            mouseY = event.clientY;
        }
    });

    // 添加鼠标松开事件监听器，用于标记拖拽结束
    sceneContainer.addEventListener('mouseup', function (event) {
        event.preventDefault();
        isDragging = false;
    });
}

function animate() {
    console.log('进入动画循环函数animate');
    if (isPlaying) {
        elapsedTime += 0.01; // 简单模拟时间流逝，可根据实际调整时间步长

        // 根据故事板里的行为逻辑以及当前时间更新车辆位置、状态等信息
        updateVehiclePositionBasedOnTime(vehicleMesh, elapsedTime);

        // 相机自动跟随车辆，保持一定距离（示例，可调整偏移值来优化效果）
        if (vehicleMesh) {
            camera.position.copy(vehicleMesh.position);
            camera.position.z += 5; // 保持在车辆后方一定距离
            camera.lookAt(vehicleMesh.position);
        }
    }

    renderer.render(scene, camera);
    if (isPlaying) {
        requestAnimationFrame(animate);
    }
}

function updateVehiclePositionBasedOnTime(vehicleMesh, elapsedTime) {
    const speed = 1; // 定义车辆移动速度，可以根据实际情况调整
    const xNewPosition = vehicleMesh.position.x - speed * elapsedTime; // 根据前面说的方向调整示例，这里假设向左移动，实际按正确方向来
    const minX = -100; // 场景x轴最小边界
    const maxX = 100; // 场景x轴最大边界
    vehicleMesh.position.x = Math.min(maxX, Math.max(minX, xNewPosition));

    // 先从场景中移除车辆模型
    scene.remove(vehicleMesh);

    // 设置新位置后再添加回场景
    vehicleMesh.position.set(vehicleMesh.position.x, vehicleMesh.position.y, vehicleMesh.position.z);
    scene.add(vehicleMesh);

    // 这里暂时只处理了x轴方向，对于y和z轴，如果有对应移动逻辑，也需要类似地进行边界判断处理
}

function startAnimationLoop() {
    requestAnimationFrame(animate);
}