// @ts-ignore
const md5 = require("md5");

const { ccclass, property } = cc._decorator;

@ccclass
export default class UpdateScene extends cc.Component {

    @property(cc.Label)
    upTit: cc.Label = null;
    @property(cc.ProgressBar)
    upPro: cc.ProgressBar = null;
    @property(cc.Label)
    progress: cc.Label = null;
    @property(cc.Label)
    rate: cc.Label = null;

    private _updating: boolean = false;
    private _am: jsb.AssetsManager = null;
    private _currPer: number = null;
    private _failCount: number = 0;

    private _newVerCall: Function = null;
    private _dowloading: Function = null;

    /**
     * 加载游戏主场景
     */
    loadAppScene() {
        cc.director.loadScene("AppScene");
    }

    /**
     * 设置回调
     */
    setUpdateCall() {
        this._newVerCall = (bytes: number) => {
            const mb = Math.floor(bytes / (1024 * 1024)) + "MB";
            this.upTit.string = "发现新版本，大小：" + mb;
        }
        this._dowloading = (down, total, per) => {
            this.rate.string = `${Math.floor(down / (1024 * 1024))}MB/${Math.floor(total / (1024 * 1024))}MB`;
            this.progress.string = Math.floor(per * 100) + "%";
        }
    }

    start() {
        this.upTit.string = "加载中...";
        this.upPro.node.active = false;
        if (!cc.sys.isNative) {
            this.loadAppScene();
            return;
        }

        this.setUpdateCall();

        const rootpath = jsb && jsb.fileUtils ? jsb.fileUtils.getWritablePath() : "/";
        const storageTempPath = rootpath + "remote-assets";
        let versionCompareHandle = (versionA, versionB) => {
            console.log("本地版本：" + versionA + "，远程版本：" + versionB);
            if (versionA == versionB) return 0;
            let vA = versionA.split(".");
            let vB = versionB.split(".");
            for (let i = 0; i < vA.length; ++i) {
                let a = parseInt(vA[i]);
                let b = parseInt(vB[i] || 0);
                if (a != b) return a - b;
            }
            return (vB.length > vA.length) ? -1 : 0;
        }
        const os = "";
        // 固定返回 false ，即 oldManifest = "project.manifest";
        // 也可加载缓存中的manifest，与包内原始版本做区分，am会自动比较较新的版本
        // let oldManifest = jsb.fileUtils.isFileExist(storageTempPath + "/project.manifest") ? (storageTempPath + "/project.manifest") : ("project.manifest");
        let oldManifest = jsb.fileUtils.isFileExist(rootpath + "project.manifest") ? (rootpath + "project.manifest") : ("project.manifest");
        this._am = new jsb.AssetsManager(oldManifest, storageTempPath, versionCompareHandle);
        this.checkUpdate();
    }

    loadLocalManifest() {
        // 固定不相等，应该是因为new的时候传入了manifest路径，而不是""
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            const rootpath = jsb && jsb.fileUtils ? jsb.fileUtils.getWritablePath() : "/";
            const os = "";
            let oldManifest = jsb.fileUtils.isFileExist(rootpath + "project.manifest") ? (rootpath + "project.manifest") : ("project.manifest");
            this._am.loadLocalManifest(oldManifest);
        }
        let manifest = this._am.getLocalManifest();
        console.log("本地版本加载成功：" + manifest.getVersion());
    }

    checkUpdate() {
        console.log("---------- 检查更新 ----------");
        if (this._updating) {
            return;
        }
        this.loadLocalManifest();
        if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()) {
            this.upTit.string = "加载本地版本信息失败！";
            this.loadAppScene();
            return;
        }
        this._am.setVerifyCallback((path, asset) => {
            return true;
            // 当path所在的文件太大时md5运算可能会导致堆栈内存不足
            // 正常情况默认返回true，需要验证推荐crc等算法验证，而非md5，需要同时改造version_generator.js
            // @ts-ignore
            const data = jsb.fileUtils.getDataFromFile(path);
            const currMD5 = md5(data);
            const expectedMD5 = asset.md5;  // 文件MD5值

            if (currMD5 == expectedMD5) {
                console.log("MD5校验成功：" + asset.path);
                return true;
            }

            // MD5不相同，删除下载文件
            // if (jsb.fileUtils.isFileExist(path)) {
            //     jsb.fileUtils.removeFile(path);
            // }
            console.log("MD5校验失败：" + asset.path, "当前MD5：" + currMD5 + " 目标MD5：" + expectedMD5);
            return false;
        })

        this._am.setEventCallback(this.checkCb.bind(this));
        this._am.checkUpdate();
        this._updating = true;
    }

    checkCb(event: jsb.EventAssetsManager) {
        let over = false;
        let hoting = false;
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                console.log("没有找到本地manifest文件，跳过热更新！");
                over = true;
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
                console.log("下载manifest文件失败，跳过热更新！");
                over = true;
                break;
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                console.log("解析manifest文件失败，跳过热更新！");
                over = true;
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                const bytes = this._am.getTotalBytes();
                console.log("发现新版本，需要热更新！大小：" + bytes + "bytes");
                hoting = true;
                this.hotUpdate();
                if (this._newVerCall) this._newVerCall(bytes);
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                console.log("已经是最新版本了！");
                over = true;
                break;
            default:
                return;
        }
        if (!hoting) {
            this._am.setEventCallback(null);
            this._updating = false;
        }
        if (over) {
            this.loadAppScene();
            return;
        }
    }

    hotUpdate() {
        console.log("---------- 开始更新 ----------");
        if (this._am) {
            this.upPro.progress = 0;
            this.rate.string = "";
            this.progress.string = "";
            this.upPro.node.active = true;

            this._am.setEventCallback(this.updateCb.bind(this));
            this.loadLocalManifest();
            this._failCount = 0;
            this._am.update();
            this._updating = true;
        } else {
            console.log("更新时缺少am，跳过热更新！");
            this.loadAppScene();
        }
    }

    updateCb(event: jsb.EventAssetsManager) {
        let needRestart = false;
        let failed = false;
        let over = false;
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                console.log("没有找到本地manifest文件，跳过热更新！");
                failed = true;
                over = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                let percent = event.getPercent();
                if (!this._currPer) this._currPer = percent || 0;
                if (percent >= this._currPer) {
                    this._currPer = percent;
                }
                this.upPro.progress = this._currPer;
                let downBytes = event.getDownloadedBytes(),
                    totalBytes = event.getTotalBytes(),
                    downFiles = event.getDownloadedFiles(),
                    totalFiles = event.getTotalFiles()

                if (this._dowloading) this._dowloading(downBytes, totalBytes, this._currPer);
                let msg = event.getMessage();
                console.log("已更新进度：" + (msg ? msg : this._currPer));
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                console.log("下载或解析manifest文件失败，跳过热更新！");
                failed = true;
                over = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                console.log("已经更新到最新版本了！");
                failed = true;
                over = true;
                break;
            case jsb.EventAssetsManager.ASSET_UPDATED:
                console.log("更新资源：" + event.getAssetId());
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                console.log("更新完成: " + event.getMessage());
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                console.log("更新失败：" + event.getMessage());
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                console.log("更新错误：" + event.getMessage());
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                console.log("解压错误：" + event.getMessage());
                break;
            default:
                break;
        }

        if (failed) {
            this._am.setEventCallback(null);
            this._updating = false;
            this.upTit.string = "更新失败！";
        }
        if (over) {
            this.upTit.string = "加载中...";
            this.loadAppScene();
            return;
        }
        if (needRestart) {
            this._am.setEventCallback(null);

            let searchPaths = jsb.fileUtils.getSearchPaths();
            let newPaths = this._am.getLocalManifest().getSearchPaths();
            let paths = [];
            for (let i = 0; i < newPaths.length; i++) {
                paths.push(newPaths[i]);
            }
            for (let i = 0; i < searchPaths.length; i++) {
                if (paths.indexOf(searchPaths[i]) >= 0) continue;
                paths.push(searchPaths[i]);
            }
            cc.sys.localStorage.setItem("HotUpdateSearchPaths", JSON.stringify(paths));
            jsb.fileUtils.setSearchPaths(paths);

            cc.audioEngine.stopAll();
            cc.game.restart();
        }
    }
}
