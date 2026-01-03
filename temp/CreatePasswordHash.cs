using System;
using System.Security.Cryptography;
using System.Text;

namespace CreatePasswordHash
{
    class Program
    {
        static void Main(string[] args)
        {
            string password = "Jesus123!!";
            string email = "melissa.jean@gmail.com";
            
            Console.WriteLine("🔐 Ap jenere password hash pou Melissa...");
            string hash = HashPassword(password);
            Console.WriteLine($"✅ Hash kreye!");
            Console.WriteLine();
            Console.WriteLine($"📋 Kreyansyèl:");
            Console.WriteLine($"   Email: {email}");
            Console.WriteLine($"   Password: {password}");
            Console.WriteLine($"   Hash: {hash}");
            Console.WriteLine();
            Console.WriteLine("🔄 Itilize hash sa a nan script SQL la");
        }
        
        static string HashPassword(string password)
        {
            // ASP.NET Core Identity V3 format
            byte prf = 0x01; // HMACSHA256
            int iterationCount = 10000;
            int saltSize = 16;
            int subkeyLength = 32;
            
            // Generate random salt
            byte[] salt = new byte[saltSize];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(salt);
            }
            
            // Generate subkey using PBKDF2
            byte[] subkey;
            using (var pbkdf2 = new Rfc2898DeriveBytes(
                password, 
                salt, 
                iterationCount, 
                HashAlgorithmName.SHA256))
            {
                subkey = pbkdf2.GetBytes(subkeyLength);
            }
            
            // Build output buffer
            var output = new byte[1 + 1 + 4 + 4 + saltSize + subkeyLength];
            int position = 0;
            
            output[position++] = 0x01; // Format marker
            output[position++] = prf;  // PRF marker
            
            // Iteration count (big-endian)
            output[position++] = (byte)(iterationCount >> 24);
            output[position++] = (byte)(iterationCount >> 16);
            output[position++] = (byte)(iterationCount >> 8);
            output[position++] = (byte)iterationCount;
            
            // Salt size (big-endian)
            output[position++] = (byte)(saltSize >> 24);
            output[position++] = (byte)(saltSize >> 16);
            output[position++] = (byte)(saltSize >> 8);
            output[position++] = (byte)saltSize;
            
            // Salt
            Buffer.BlockCopy(salt, 0, output, position, saltSize);
            position += saltSize;
            
            // Subkey
            Buffer.BlockCopy(subkey, 0, output, position, subkeyLength);
            
            return Convert.ToBase64String(output);
        }
    }
}
