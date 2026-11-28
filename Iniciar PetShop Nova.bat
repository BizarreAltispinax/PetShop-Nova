@echo off
rem =====================================================================
rem  PetShop Nova - inicio con doble clic
rem  1. Revisa Node.js y SQL Server.
rem  2. Prepara lo que falte (dependencias, .env, frontend compilado).
rem  3. Enciende la API en su propia ventana y abre la pagina en el navegador.
rem  Para apagar la pagina: cerrar la ventana "PetShop Nova - API".
rem =====================================================================
chcp 65001 >nul
setlocal
title PetShop Nova
set "RAIZ=%~dp0"
cd /d "%RAIZ%"

echo.
echo   PetShop Nova
echo   ------------
echo.

rem ---------- 1. Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
    echo   [X] No se encontro Node.js.
    echo       Instalelo desde https://nodejs.org ^(version LTS^) o con:  winget install OpenJS.NodeJS.LTS
    echo       Luego vuelva a abrir este archivo.
    goto :error
)
echo   [OK] Node.js instalado

rem ---------- 2. SQL Server ----------
sc query MSSQLSERVER | find "RUNNING" >nul 2>nul
if errorlevel 1 (
    echo   [..] SQL Server ^(MSSQLSERVER^) esta detenido. Intentando encenderlo...
    net start MSSQLSERVER >nul 2>nul
    sc query MSSQLSERVER | find "RUNNING" >nul 2>nul
    if errorlevel 1 (
        echo   [X] No se pudo encender SQL Server. Abra este archivo con clic derecho ^> "Ejecutar como administrador"
        echo       o encienda el servicio desde SQL Server Configuration Manager.
        goto :error
    )
)
echo   [OK] SQL Server encendido

rem ---------- 3. Backend: configuracion y dependencias ----------
if not exist "backend\.env" (
    echo   [..] Creando backend\.env a partir de .env.example
    copy /y "backend\.env.example" "backend\.env" >nul
)
if not exist "backend\node_modules" (
    echo   [..] Instalando dependencias del backend ^(solo la primera vez^)...
    pushd backend
    call npm install --no-fund --no-audit --loglevel=error
    popd
    if not exist "backend\node_modules" (
        echo   [X] No se pudieron instalar las dependencias del backend.
        goto :error
    )
)
echo   [OK] Backend listo

rem ---------- 4. Frontend compilado ----------
if not exist "frontend\dist\index.html" (
    echo   [..] Compilando el frontend ^(solo la primera vez, tarda un poco^)...
    pushd frontend
    if not exist "node_modules" call npm install --no-fund --no-audit --loglevel=error
    call npm run build
    popd
    if not exist "frontend\dist\index.html" (
        echo   [X] No se pudo compilar el frontend.
        goto :error
    )
)
echo   [OK] Frontend compilado

rem ---------- 5. Puerto y direccion de la pagina ----------
set "PUERTO=4000"
for /f "tokens=2 delims==" %%a in ('findstr /b /c:"PORT=" "backend\.env"') do set "PUERTO=%%a"
if "%PUERTO%"=="80" (set "URL=http://petshopnova.localhost") else (set "URL=http://petshopnova.localhost:%PUERTO%")
set "SALUD=http://localhost:%PUERTO%/api/salud"

rem ---------- 6. Encender la API (si no esta encendida ya) ----------
call :api_responde
if "%RESPUESTA%"=="200" (
    echo   [OK] La API ya estaba encendida
    goto :abrir
)
echo   [..] Encendiendo la API en una ventana nueva...
start "PetShop Nova - API" /d "%RAIZ%backend" cmd /k "title PetShop Nova - API (cierre esta ventana para apagar la pagina) & npm start"

rem Esperar hasta unos 40 segundos a que responda
set /a INTENTOS=0
:esperar_api
ping -n 3 127.0.0.1 >nul
call :api_responde
if "%RESPUESTA%"=="200" goto :api_lista
set /a INTENTOS+=1
if %INTENTOS% lss 15 goto :esperar_api
:api_lista
if not "%RESPUESTA%"=="200" (
    echo   [X] La API no respondio. Revise los mensajes en la ventana "PetShop Nova - API".
    echo       Problemas frecuentes: README.md, seccion "Problemas frecuentes".
    goto :error
)
echo   [OK] API encendida y conectada a SQL Server

:abrir
echo.
echo   Abriendo %URL%
start "" "%URL%"
echo.
echo   Cuentas de prueba ^(contrasena Nova12345^):
echo     admin@petshopnova.cr           administrador
echo     valeria.mora@correo-demo.cr    cliente
echo.
echo   Para apagar la pagina, cierre la ventana "PetShop Nova - API".
echo   Esta ventana se cierra sola.
ping -n 8 127.0.0.1 >nul
exit /b 0

rem ---------- funciones ----------
:api_responde
set "RESPUESTA=0"
for /f %%r in ('powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%SALUD%').StatusCode } catch { 0 }"') do set "RESPUESTA=%%r"
exit /b 0

:error
echo.
pause
exit /b 1
