using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Windows;

namespace NalaCreditDesktop.Services
{
    /// <summary>
    /// Sèvis pou jere auto-update aplikasyon an
    /// Service for managing application auto-updates
    /// </summary>
    public class UpdateService
    {
        private readonly HttpClient _httpClient;
        private readonly string _versionCheckUrl;
        private readonly string _currentVersion;

        public UpdateService(string baseUrl, string currentVersion)
        {
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(30)
            };
            _versionCheckUrl = $"{baseUrl}/downloads/version.json";
            _currentVersion = currentVersion;
        }

        /// <summary>
        /// Tcheke si gen mizajou disponib
        /// Check if updates are available
        /// </summary>
        public async Task<UpdateInfo?> CheckForUpdatesAsync()
        {
            try
            {
                Debug.WriteLine($"[UpdateService] Checking for updates at: {_versionCheckUrl}");
                
                var response = await _httpClient.GetStringAsync(_versionCheckUrl);
                Debug.WriteLine($"[UpdateService] Response received: {response}");

                var updateInfo = JsonSerializer.Deserialize<UpdateInfo>(response, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (updateInfo != null)
                {
                    Debug.WriteLine($"[UpdateService] Current: {_currentVersion}, Latest: {updateInfo.LatestVersion}");
                    
                    if (IsNewerVersion(updateInfo.LatestVersion))
                    {
                        Debug.WriteLine("[UpdateService] Update available!");
                        return updateInfo;
                    }
                    
                    Debug.WriteLine("[UpdateService] Already up to date");
                }

                return null;
            }
            catch (HttpRequestException ex)
            {
                Debug.WriteLine($"[UpdateService] Network error checking updates: {ex.Message}");
                return null;
            }
            catch (JsonException ex)
            {
                Debug.WriteLine($"[UpdateService] JSON parsing error: {ex.Message}");
                return null;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[UpdateService] Unexpected error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Konpare vèsyon yo
        /// Compare versions
        /// </summary>
        private bool IsNewerVersion(string latestVersion)
        {
            try
            {
                var current = new Version(_currentVersion);
                var latest = new Version(latestVersion);
                return latest > current;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Telechaje epi enstale mizajou
        /// Download and install update
        /// </summary>
        public async Task<bool> DownloadAndInstallUpdateAsync(UpdateInfo updateInfo, IProgress<int>? progress = null)
        {
            var tempPath = Path.Combine(Path.GetTempPath(), "NalaDesktop-Update.exe");

            try
            {
                Debug.WriteLine($"[UpdateService] Downloading from: {updateInfo.DownloadUrl}");

                // Telechaje fichye
                using (var response = await _httpClient.GetAsync(updateInfo.DownloadUrl, HttpCompletionOption.ResponseHeadersRead))
                {
                    response.EnsureSuccessStatusCode();
                    
                    var totalBytes = response.Content.Headers.ContentLength ?? 0;
                    var downloadedBytes = 0L;

                    using var contentStream = await response.Content.ReadAsStreamAsync();
                    using var fileStream = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None, 8192, true);
                    
                    var buffer = new byte[8192];
                    int bytesRead;

                    while ((bytesRead = await contentStream.ReadAsync(buffer, 0, buffer.Length)) > 0)
                    {
                        await fileStream.WriteAsync(buffer, 0, bytesRead);
                        downloadedBytes += bytesRead;

                        if (totalBytes > 0)
                        {
                            var percentComplete = (int)((downloadedBytes * 100) / totalBytes);
                            progress?.Report(percentComplete);
                        }
                    }
                }

                Debug.WriteLine($"[UpdateService] Download complete: {tempPath}");

                // Verifye hash si disponib
                if (!string.IsNullOrEmpty(updateInfo.Sha256Hash))
                {
                    Debug.WriteLine("[UpdateService] Validating file integrity...");
                    
                    if (!await ValidateFileHashAsync(tempPath, updateInfo.Sha256Hash))
                    {
                        Debug.WriteLine("[UpdateService] Hash validation failed!");
                        File.Delete(tempPath);
                        MessageBox.Show(
                            "Fichye telechaje a pa valid. Mizajou annile.",
                            "Erè Sekirite",
                            MessageBoxButton.OK,
                            MessageBoxImage.Error
                        );
                        return false;
                    }
                    
                    Debug.WriteLine("[UpdateService] Hash validation passed");
                }

                // Lanse installer
                Debug.WriteLine("[UpdateService] Launching installer...");
                
                var startInfo = new ProcessStartInfo
                {
                    FileName = tempPath,
                    Arguments = "/SILENT /CLOSEAPPLICATIONS",
                    UseShellExecute = true,
                    Verb = "runas" // Run as administrator si nesesè
                };

                Process.Start(startInfo);

                // Fèmen aplikasyon aktyèl la
                Debug.WriteLine("[UpdateService] Shutting down for update...");
                Application.Current.Dispatcher.Invoke(() => Application.Current.Shutdown());

                return true;
            }
            catch (HttpRequestException ex)
            {
                Debug.WriteLine($"[UpdateService] Download error: {ex.Message}");
                MessageBox.Show(
                    $"Erè pandan telechajman: {ex.Message}",
                    "Erè",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error
                );
                return false;
            }
            catch (UnauthorizedAccessException ex)
            {
                Debug.WriteLine($"[UpdateService] Permission error: {ex.Message}");
                MessageBox.Show(
                    "Pa gen pèmisyon pou enstale mizajou. Eseye lanse aplikasyon kòm administratè.",
                    "Erè Pèmisyon",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error
                );
                return false;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[UpdateService] Installation error: {ex.Message}");
                MessageBox.Show(
                    $"Erè pandan enstalasyon: {ex.Message}",
                    "Erè",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error
                );
                return false;
            }
        }

        /// <summary>
        /// Valide checksum fichye a
        /// Validate file checksum
        /// </summary>
        private async Task<bool> ValidateFileHashAsync(string filePath, string expectedHash)
        {
            try
            {
                using var sha256 = SHA256.Create();
                using var stream = File.OpenRead(filePath);
                var hash = await Task.Run(() => sha256.ComputeHash(stream));
                var hashString = BitConverter.ToString(hash).Replace("-", "").ToLower();
                
                Debug.WriteLine($"[UpdateService] Expected hash: {expectedHash}");
                Debug.WriteLine($"[UpdateService] Actual hash: {hashString}");
                
                return hashString.Equals(expectedHash.ToLower(), StringComparison.OrdinalIgnoreCase);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[UpdateService] Hash validation error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Jwenn gwosè fichye an fòm lizib
        /// Get file size in human-readable format
        /// </summary>
        public static string FormatFileSize(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB" };
            double len = bytes;
            int order = 0;
            
            while (len >= 1024 && order < sizes.Length - 1)
            {
                order++;
                len = len / 1024;
            }
            
            return $"{len:0.##} {sizes[order]}";
        }
    }

    /// <summary>
    /// Enfòmasyon sou mizajou disponib
    /// Information about available update
    /// </summary>
    public class UpdateInfo
    {
        [JsonPropertyName("latestVersion")]
        public string LatestVersion { get; set; } = string.Empty;

        [JsonPropertyName("releaseDate")]
        public string ReleaseDate { get; set; } = string.Empty;

        [JsonPropertyName("downloadUrl")]
        public string DownloadUrl { get; set; } = string.Empty;

        [JsonPropertyName("fileSize")]
        public long FileSize { get; set; }

        [JsonPropertyName("sha256Hash")]
        public string? Sha256Hash { get; set; }

        [JsonPropertyName("minimumVersion")]
        public string MinimumVersion { get; set; } = string.Empty;

        [JsonPropertyName("releaseNotes")]
        public string ReleaseNotes { get; set; } = string.Empty;

        [JsonPropertyName("mandatory")]
        public bool Mandatory { get; set; }

        /// <summary>
        /// Jwenn gwosè fichye an fòm lizib
        /// </summary>
        public string FileSizeFormatted => UpdateService.FormatFileSize(FileSize);
    }
}
