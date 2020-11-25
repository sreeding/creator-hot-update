@ECHO OFF

setlocal enabledelayedexpansion

RD /S /Q build\jsb-link\frameworks\runtime-src\proj.android-studio\res
RD /S /Q build\jsb-link\frameworks\runtime-src\proj.android-studio\src
RD /S /Q build\remote-assets

COPY /y version_generator.js build\jsb-link\version_generator.js
COPY /y pngquant\pngquant.exe build\jsb-link\assets\pngquant.exe
CD build\jsb-link\assets
REM for /R %%i in (*.png) do (
REM 	pngquant -f --ext .png --quality 50-80 "%%i"
REM )
del /S /Q pngquant.exe

CD ../
node version_generator.js

PAUSE
CD /D %~dp0
XCOPY /s/e/i/y proj.android-studio\res build\jsb-link\frameworks\runtime-src\proj.android-studio\res
XCOPY /s/e/i/y proj.android-studio\src build\jsb-link\frameworks\runtime-src\proj.android-studio\src
COPY /y proj.android-studio\app\AndroidManifest.xml build\jsb-link\frameworks\runtime-src\proj.android-studio\app\AndroidManifest.xml
COPY /y proj.android-studio\app\build.gradle build\jsb-link\frameworks\runtime-src\proj.android-studio\app\build.gradle
COPY /y proj.android-studio\game\build.gradle build\jsb-link\frameworks\runtime-src\proj.android-studio\game\build.gradle
COPY /y proj.android-studio\main.js build\jsb-link\main.js

PAUSE

D:\JAVA\CocosDashboard\resources\.editors\Creator\2.4.0\resources\cocos2d-x\tools\cocos2d-console\bin\cocos.py compile -p android --ap android-29 -m release -s build\jsb-link

PAUSE