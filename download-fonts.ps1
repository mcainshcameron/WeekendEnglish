$wc = New-Object System.Net.WebClient

# Font Awesome 6.0.0 font files from GitHub
$urls = @{
    "fa-solid-900.woff2" = "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.0.0/webfonts/fa-solid-900.woff2"
    "fa-brands-400.woff2" = "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.0.0/webfonts/fa-brands-400.woff2"
}

foreach ($file in $urls.Keys) {
    $url = $urls[$file]
    $destination = "fonts/fontawesome/$file"
    Write-Host "Downloading $file..."
    $wc.DownloadFile($url, $destination)
}

Write-Host "Font files downloaded successfully!"
