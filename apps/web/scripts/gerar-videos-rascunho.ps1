<#
.SYNOPSIS
  Gera os vídeos-RASCUNHO das aulas: slides com os destaques + narração sintética em pt-BR.

.DESCRIPTION
  Lê curso-kiwify/aulas.json (criado por `npm run curso:exportar`) e grava um MP4 (720p) por aula
  em curso-kiwify/videos-rascunho/. Usa só recursos do Windows: a voz pt-BR do Windows (SAPI), o
  desenho dos slides (GDI+) e a montagem do vídeo (Windows.Media.Editing). Requer o Windows
  PowerShell 5.1 (powershell.exe), que já vem no Windows 10/11.

  São rascunhos para montar e testar o curso (na Kiwify e no site) antes da gravação definitiva,
  com voz humana, seguindo os mesmos roteiros.

.PARAMETER Modulo
  Gera só as aulas deste módulo (1 a 8). Padrão: todos.

.PARAMETER Voz
  Nome da voz instalada. Padrão: a primeira voz pt-BR encontrada.

.PARAMETER Velocidade
  Velocidade da fala, de -10 a 10. Padrão: 1 (um pouco mais rápida que o normal).

.PARAMETER Refazer
  Gera de novo os vídeos que já existem.

.EXAMPLE
  npm run curso:videos
  npm run curso:videos -- -Modulo 3 -Refazer
#>
param(
  [ValidateRange(0, 99)][int]$Modulo = 0,
  [string]$Voz = '',
  [ValidateRange(-10, 10)][int]$Velocidade = 1,
  [switch]$Refazer
)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -eq 'Core') {
  throw 'Use o Windows PowerShell 5.1 (powershell.exe): a montagem de vídeo do Windows não está disponível no PowerShell 7.'
}

$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$manifesto = Join-Path $raiz 'curso-kiwify\aulas.json'
if (-not (Test-Path $manifesto)) { throw 'curso-kiwify\aulas.json não encontrado. Rode antes: npm run curso:exportar' }
$curso = Get-Content -Raw -Encoding UTF8 $manifesto | ConvertFrom-Json
$saida = Join-Path $raiz 'curso-kiwify\videos-rascunho'
New-Item -ItemType Directory -Force -Path $saida | Out-Null

Add-Type -AssemblyName System.Speech
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.CreationCollisionOption, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Editing.MediaComposition, Windows.Media.Editing, ContentType = WindowsRuntime]
$null = [Windows.Media.Editing.MediaClip, Windows.Media.Editing, ContentType = WindowsRuntime]
$null = [Windows.Media.Editing.BackgroundAudioTrack, Windows.Media.Editing, ContentType = WindowsRuntime]
$null = [Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime]
$null = [Windows.Media.Transcoding.TranscodeFailureReason, Windows.Media.Transcoding, ContentType = WindowsRuntime]

# ───────────── ponte para as APIs assíncronas do Windows (WinRT) ─────────────
$metodos = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTask = $metodos | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$asTaskProgresso = $metodos | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperationWithProgress`2' } | Select-Object -First 1
function Aguardar($operacao, [Type]$tipo) {
  $tarefa = $asTask.MakeGenericMethod($tipo).Invoke($null, @($operacao))
  $tarefa.Wait(-1) | Out-Null
  $tarefa.Result
}
function AguardarComProgresso($operacao, [Type]$tipo, [Type]$progresso) {
  $tarefa = $asTaskProgresso.MakeGenericMethod($tipo, $progresso).Invoke($null, @($operacao))
  $tarefa.Wait(-1) | Out-Null
  $tarefa.Result
}
function Adicionar($colecao, $item, [Type]$tipo) {
  # As coleções do WinRT chegam ao PowerShell sem o método Add: chama pela interface .NET.
  [System.Collections.Generic.ICollection``1].MakeGenericType($tipo).GetMethod('Add').Invoke($colecao, @($item)) | Out-Null
}
function Arquivo([string]$caminho) {
  Aguardar ([Windows.Storage.StorageFile]::GetFileFromPathAsync($caminho)) ([Windows.Storage.StorageFile])
}

# ───────────── voz ─────────────
$sintetizador = New-Object System.Speech.Synthesis.SpeechSynthesizer
$vozes = $sintetizador.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo }
if ($Voz) {
  $sintetizador.SelectVoice($Voz)
} else {
  $ptBR = $vozes | Where-Object { $_.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
  if (-not $ptBR) { throw 'Nenhuma voz pt-BR instalada. Instale em Configurações > Hora e idioma > Fala.' }
  $sintetizador.SelectVoice($ptBR.Name)
}
$sintetizador.Rate = $Velocidade
$formatoAudio = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
Write-Host "Voz: $($sintetizador.Voice.Name)"

# ───────────── slides ─────────────
$L = 1280; $A = 720
$cor = @{
  noite900 = [System.Drawing.Color]::FromArgb(21, 6, 38)
  noite600 = [System.Drawing.Color]::FromArgb(59, 33, 89)
  noite200 = [System.Drawing.Color]::FromArgb(217, 205, 232)
  rosa500  = [System.Drawing.Color]::FromArgb(224, 69, 123)
  rosa300  = [System.Drawing.Color]::FromArgb(244, 157, 191)
}

function Fonte([float]$tamanho, [System.Drawing.FontStyle]$estilo = [System.Drawing.FontStyle]::Regular) {
  New-Object System.Drawing.Font('Segoe UI', $tamanho, $estilo, [System.Drawing.GraphicsUnit]::Pixel)
}

function Desenhar-TextoAjustado($g, [string]$texto, [System.Drawing.RectangleF]$area, [float]$maior, [float]$menor, [System.Drawing.FontStyle]$estilo, $pincel) {
  $formato = New-Object System.Drawing.StringFormat
  $formato.Alignment = [System.Drawing.StringAlignment]::Center
  $formato.LineAlignment = [System.Drawing.StringAlignment]::Center
  $tamanho = $maior
  while ($true) {
    $fonte = Fonte $tamanho $estilo
    $medida = $g.MeasureString($texto, $fonte, [int]$area.Width, $formato)
    if ($medida.Height -le $area.Height -or $tamanho -le $menor) { break }
    $fonte.Dispose()
    $tamanho -= 2
  }
  $g.DrawString($texto, $fonte, $pincel, $area, $formato)
  $fonte.Dispose()
}

function Novo-Slide([string]$caminho, [string]$marca, [string]$rotulo, [string]$texto, [string]$subtitulo, [string]$rodape, [int]$atual, [int]$total) {
  $bmp = New-Object System.Drawing.Bitmap $L, $A
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $tela = New-Object System.Drawing.Rectangle 0, 0, $L, $A
  $fundo = New-Object System.Drawing.Drawing2D.LinearGradientBrush($tela, $cor.noite900, $cor.noite600, 35)
  $g.FillRectangle($fundo, $tela)
  $brilho = New-Object System.Drawing.Drawing2D.GraphicsPath
  $brilho.AddEllipse(-260, -300, 980, 760)
  $pincelBrilho = New-Object System.Drawing.Drawing2D.PathGradientBrush($brilho)
  $pincelBrilho.CenterColor = [System.Drawing.Color]::FromArgb(80, 224, 69, 123)
  $pincelBrilho.SurroundColors = [System.Drawing.Color[]]@([System.Drawing.Color]::FromArgb(0, 224, 69, 123))
  $g.FillPath($pincelBrilho, $brilho)

  $branco = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $rosa = New-Object System.Drawing.SolidBrush $cor.rosa500
  $rosaClaro = New-Object System.Drawing.SolidBrush $cor.rosa300
  $lilas = New-Object System.Drawing.SolidBrush $cor.noite200

  # marca no topo
  $g.FillEllipse($rosa, 56, 40, 44, 44)
  $coracao = New-Object System.Drawing.Font('Segoe UI Symbol', 22, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $centro = New-Object System.Drawing.StringFormat
  $centro.Alignment = [System.Drawing.StringAlignment]::Center
  $centro.LineAlignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString([string][char]0x2665, $coracao, $branco, (New-Object System.Drawing.RectangleF 56, 40, 44, 46), $centro)
  $fonteMarca = Fonte 26 ([System.Drawing.FontStyle]::Bold)
  $g.DrawString($marca, $fonteMarca, $branco, 112, 46)
  $fonteRotulo = Fonte 22 ([System.Drawing.FontStyle]::Bold)
  $medidaRotulo = $g.MeasureString($rotulo.ToUpper(), $fonteRotulo)
  $g.DrawString($rotulo.ToUpper(), $fonteRotulo, $rosaClaro, ($L - 56 - $medidaRotulo.Width), 50)

  # conteúdo
  if ($atual -eq 0) {
    Desenhar-TextoAjustado $g $texto (New-Object System.Drawing.RectangleF 120, 200, ($L - 240), 230) 72 40 ([System.Drawing.FontStyle]::Bold) $branco
    Desenhar-TextoAjustado $g $subtitulo (New-Object System.Drawing.RectangleF 160, 440, ($L - 320), 80) 34 22 ([System.Drawing.FontStyle]::Regular) $lilas
  } else {
    $g.FillRectangle($rosa, (($L / 2) - 40), 190, 80, 8)
    Desenhar-TextoAjustado $g $texto (New-Object System.Drawing.RectangleF 120, 220, ($L - 240), 300) 64 34 ([System.Drawing.FontStyle]::Bold) $branco
  }

  # rodapé: título da aula + progresso
  $fonteRodape = Fonte 22
  $g.DrawString($rodape, $fonteRodape, $lilas, 56, ($A - 72))
  for ($i = 0; $i -lt $total; $i++) {
    $pincelPonto = $(if ($i -eq $atual) { $rosa } else { New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90, 217, 205, 232)) })
    $g.FillEllipse($pincelPonto, ($L - 56 - (($total - $i) * 26)), ($A - 62), 12, 12)
  }

  $bmp.Save($caminho, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

# ───────────── geração ─────────────
$aulas = @($curso.aulas | Where-Object { $Modulo -eq 0 -or $_.modulo -eq $Modulo })
if (-not $aulas.Count) { throw "Nenhuma aula encontrada para o módulo $Modulo." }
$feitos = 0
foreach ($aula in $aulas) {
  $pastaSaida = Join-Path $saida $aula.pasta
  New-Item -ItemType Directory -Force -Path $pastaSaida | Out-Null
  $destino = Join-Path $pastaSaida $aula.arquivoVideo
  if ((Test-Path $destino) -and -not $Refazer) {
    Write-Host "= já existe: $($aula.arquivoVideo)"
    continue
  }

  $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("formula-video-" + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $temp | Out-Null
  try {
    # narração (uma pausa entre os parágrafos do roteiro)
    $wav = Join-Path $temp 'narracao.wav'
    $prompt = New-Object System.Speech.Synthesis.PromptBuilder([System.Globalization.CultureInfo]'pt-BR')
    foreach ($paragrafo in ($aula.roteiro -split '(?:\r?\n){2,}' | Where-Object { $_.Trim() })) {
      $prompt.AppendText($paragrafo.Trim())
      $prompt.AppendBreak([System.Speech.Synthesis.PromptBreak]::Medium)
    }
    $sintetizador.SetOutputToWaveFile($wav, $formatoAudio)
    $sintetizador.Speak($prompt)
    $sintetizador.SetOutputToNull()

    $faixa = Aguardar ([Windows.Media.Editing.BackgroundAudioTrack]::CreateFromFileAsync((Arquivo $wav))) ([Windows.Media.Editing.BackgroundAudioTrack])
    $duracao = $faixa.OriginalDuration.TotalSeconds + 1.0

    # slides: abertura + um por destaque, dividindo o tempo da narração
    $destaques = @($aula.destaques)
    $total = $destaques.Count + 1
    $abertura = [Math]::Min(4.0, $duracao * 0.15)
    $porDestaque = ($duracao - $abertura) / [Math]::Max(1, $destaques.Count)
    $rotulo = "Módulo $($aula.modulo)"
    $rodape = "Aula $($aula.aula) · $($aula.titulo)"

    $composicao = New-Object Windows.Media.Editing.MediaComposition
    $slide0 = Join-Path $temp 'slide-0.png'
    Novo-Slide $slide0 $curso.marca $rotulo $aula.titulo "Módulo $($aula.modulo) · $($aula.moduloTitulo)" $rodape 0 $total
    $clipe = Aguardar ([Windows.Media.Editing.MediaClip]::CreateFromImageFileAsync((Arquivo $slide0), [TimeSpan]::FromSeconds($abertura))) ([Windows.Media.Editing.MediaClip])
    Adicionar $composicao.Clips $clipe ([Windows.Media.Editing.MediaClip])
    for ($i = 0; $i -lt $destaques.Count; $i++) {
      $slide = Join-Path $temp "slide-$($i + 1).png"
      Novo-Slide $slide $curso.marca $rotulo $destaques[$i] '' $rodape ($i + 1) $total
      $clipe = Aguardar ([Windows.Media.Editing.MediaClip]::CreateFromImageFileAsync((Arquivo $slide), [TimeSpan]::FromSeconds($porDestaque))) ([Windows.Media.Editing.MediaClip])
      Adicionar $composicao.Clips $clipe ([Windows.Media.Editing.MediaClip])
    }
    Adicionar $composicao.BackgroundAudioTracks $faixa ([Windows.Media.Editing.BackgroundAudioTrack])

    $pasta = Aguardar ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($pastaSaida)) ([Windows.Storage.StorageFolder])
    $arquivoSaida = Aguardar ($pasta.CreateFileAsync($aula.arquivoVideo, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
    $perfil = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp4([Windows.Media.MediaProperties.VideoEncodingQuality]::HD720p)
    $resultado = AguardarComProgresso ($composicao.RenderToFileAsync($arquivoSaida, [Windows.Media.Editing.MediaTrimmingPreference]::Precise, $perfil)) ([Windows.Media.Transcoding.TranscodeFailureReason]) ([double])
    if ("$resultado" -ne 'None') { throw "Falha ao montar $($aula.arquivoVideo): $resultado" }

    # slides em PNG ao lado do vídeo: servem para regravar a aula com voz humana (CapCut, Canva…)
    $pastaSlides = Join-Path $pastaSaida ('slides-aula-' + ('{0:D2}' -f [int]$aula.aula))
    New-Item -ItemType Directory -Force -Path $pastaSlides | Out-Null
    Get-ChildItem -Path $temp -Filter 'slide-*.png' | ForEach-Object { Copy-Item $_.FullName (Join-Path $pastaSlides $_.Name) -Force }
    $feitos++
    Write-Host ("+ {0} ({1:N0} s)" -f $aula.arquivoVideo, $duracao)
  } finally {
    Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
  }
}
$sintetizador.Dispose()
Write-Host "Pronto: $feitos vídeo(s) gerado(s) em curso-kiwify\videos-rascunho."
