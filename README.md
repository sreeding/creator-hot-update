# creator-hot-update
本项目为creator热更新功能实现流程，通过修改version_generator.js和bat文件实现一键部署。

## 1.使用方法
构建后运行根目录下 构建后使用.bat
## 2.目录结构
>project-folder</br>
&emsp;|--pngquant &emsp;&emsp;  // 包含bat文件需要的压缩图片文件，默认关闭</br>
&emsp;|--proj.android-studio &emsp;&emsp;  // 自定义原生文件夹，bat文件打包时用来复制</br>
&emsp;|--version_generator.js &emsp;&emsp;  // 热更新脚本文件</br>
&emsp;|--构建后使用.bat &emsp;&emsp;  // 脚本工具</br>
## 3.流程思路
`version_generator.js文件，实现了自动读取assets/Script/AppConfig.ts文件的url和version，生成manifest文件，自动拷贝生成资源文件夹build/remote-assets。
每次只需要把该文件夹放到对应的url下即可。remote-assets文件夹包含一个vX.X.X文件夹和project.manifest、version.manifest，其中X.X.X是AppConfig.ts中的version,
这样做的目的是在manifest的资源url中带有version参数，保证每次不一致，方便资源服务器部署更新。`</br></br>
`构建后使用.bat文件，大致包含三个阶段和PAUSE。第一次打包时需要完整运行，之后热更新时只需要运行第一阶段，即第一个PAUSE。`</br></br>
**ps: creator的编译路径为绝对路径，proj.android-studio中的文件不可直接使用，需要对应实际路径。**
