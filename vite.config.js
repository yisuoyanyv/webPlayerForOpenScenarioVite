import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            // 正确指向Three.js主模块入口文件（根据实际安装结构调整，如果不同）
            // 'three': path.resolve(__dirname, 'node_modules/three/build/three.module.js'),
            // 准确指向GLTFLoader.js所在的目录，方便Vite正确解析其导入路径
            // 'three/addons/loaders': path.resolve(__dirname, 'node_modules/three/examples/jsm/loaders')
        }
    }
});