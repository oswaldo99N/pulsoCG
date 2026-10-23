# Windows: ejecuta Pulso CG con un Node propio dentro del proyecto
# (.node\win-x64 o .node\win-arm64). No instala nada en el sistema.
# Uso: start.ps1 [--open | test]
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$NodeVersion = "22.23.3"
$Arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
$EnvDir = Join-Path $PSScriptRoot ".node\win-$Arch"
$Node = Join-Path $EnvDir "node.exe"

function Test-NodeVersion($Path) {
  try { return ((& $Path -v) -eq "v$NodeVersion") } catch { return $false }
}

if (-not (Test-Path -LiteralPath $Node) -or -not (Test-NodeVersion $Node)) {
  Write-Host "Preparando Pulso CG por primera vez (descargando Node $NodeVersion)..."
  $Zip = Join-Path $env:TEMP "pulso-node-$NodeVersion.zip"
  $Tmp = Join-Path $env:TEMP "pulso-node-$NodeVersion"
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-$Arch.zip" -OutFile $Zip -UseBasicParsing
    if (Test-Path -LiteralPath $Tmp) { Remove-Item -LiteralPath $Tmp -Recurse -Force }
    Expand-Archive -LiteralPath $Zip -DestinationPath $Tmp -Force
    if (Test-Path -LiteralPath $EnvDir) { Remove-Item -LiteralPath $EnvDir -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $EnvDir | Out-Null
    Copy-Item -Path (Join-Path $Tmp "node-v$NodeVersion-win-$Arch\*") -Destination $EnvDir -Recurse -Force
  } catch {
    # Sin internet: si el equipo ya tiene Node 20 o superior, se usa ese.
    $System = Get-Command node -ErrorAction SilentlyContinue
    if ($System -and [int]((& $System.Source -p "process.versions.node.split('.')[0]")) -ge 20) {
      $Node = $System.Source
    } else {
      Write-Host "No se pudo descargar Node. Conectate a internet una vez y vuelve a intentarlo."
      exit 1
    }
  } finally {
    Remove-Item -LiteralPath $Zip, $Tmp -Recurse -Force -ErrorAction SilentlyContinue
  }
}

if ($args[0] -eq "stress") {
  & $Node tools\stress.mjs
  exit $LASTEXITCODE
}
if ($args[0] -eq "test") {
  & $Node --test (Get-ChildItem -Path "test\*.mjs" | ForEach-Object { $_.FullName })
  exit $LASTEXITCODE
}
& $Node server.mjs @args
