using System.Security.Cryptography;
using System.Text;

namespace NalaCreditAPI.Utilities;

public static class BranchIntegrationHelper
{
    public static bool TryParseBranchGuid(string? rawValue, out Guid branchGuid, out int? legacyBranchId)
    {
        legacyBranchId = null;

        if (string.IsNullOrWhiteSpace(rawValue))
        {
            branchGuid = Guid.Empty;
            return false;
        }

        if (Guid.TryParse(rawValue, out branchGuid))
        {
            return true;
        }

        if (int.TryParse(rawValue, out var parsedInt))
        {
            branchGuid = FromLegacyId(parsedInt);
            legacyBranchId = parsedInt;
            return true;
        }

        branchGuid = Guid.Empty;
        return false;
    }

    public static Guid FromLegacyId(int legacyBranchId)
    {
        using var md5 = MD5.Create();
        var seed = Encoding.UTF8.GetBytes($"branch:{legacyBranchId}");
        var hash = md5.ComputeHash(seed);

        // Force RFC 4122 variant & version 3 (name-based, MD5)
        hash[6] = (byte)((hash[6] & 0x0F) | 0x30);
        hash[8] = (byte)((hash[8] & 0x3F) | 0x80);

        return new Guid(hash);
    }
}
