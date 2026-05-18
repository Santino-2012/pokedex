#!/usr/bin/env pwsh
$TOTAL = 1025
$out = Join-Path $PSScriptRoot 'images'
if(-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }

function Get-ImageUrl($id){
    try{
        $url = "https://pokeapi.co/api/v2/pokemon/$id"
        $data = Invoke-RestMethod -Uri $url -UseBasicParsing -ErrorAction Stop
        $img = $data.sprites.other.'official-artwork'.front_default
        if(-not $img){ $img = $data.sprites.front_default }
        return $img
    } catch { return $null }
}

for($i=1;$i -le $TOTAL; $i++){
    $fname = Join-Path $out ('{0}.png' -f ($i.ToString('000')))
    if(Test-Path $fname){ continue }
    $img = Get-ImageUrl $i
    if($img){
        try{
            Invoke-WebRequest -Uri $img -OutFile $fname -UseBasicParsing -ErrorAction Stop
            Write-Output "Downloaded $i"
        } catch { Write-Output "Failed $i" }
    } else { Write-Output "No image for $i" }
    Start-Sleep -Milliseconds 150
}
