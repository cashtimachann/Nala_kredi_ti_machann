using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("=".PadRight(70, '='));
        Console.WriteLine("TEST API CREDITS ACTIFS");
        Console.WriteLine("=".PadRight(70, '='));

        var client = new HttpClient();
        client.BaseAddress = new Uri("http://localhost:5000/api/");
        
        // Test 1: Sans filtres
        Console.WriteLine("\nTest 1: Tous les crédits (sans filtres)");
        try
        {
            var response = await client.GetAsync("MicrocreditLoan?page=1&pageSize=100");
            var content = await response.Content.ReadAsStringAsync();
            
            Console.WriteLine($"  Status: {response.StatusCode}");
            Console.WriteLine($"  Content Length: {content.Length}");
            
            if (response.IsSuccessStatusCode)
            {
                // Parse simple pour compter
                int loansCount = content.Split("\"loanNumber\"").Length - 1;
                Console.WriteLine($"  Loans found: ~{loansCount}");
                
                if (content.Length < 1000)
                {
                    Console.WriteLine($"  Response: {content}");
                }
            }
            else
            {
                Console.WriteLine($"  Error: {content}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  EXCEPTION: {ex.Message}");
        }

        // Test 2: Status Active
        Console.WriteLine("\nTest 2: Status=Active");
        try
        {
            var response = await client.GetAsync("MicrocreditLoan?page=1&pageSize=100&status=Active");
            var content = await response.Content.ReadAsStringAsync();
            
            Console.WriteLine($"  Status: {response.StatusCode}");
            Console.WriteLine($"  Content Length: {content.Length}");
            
            if (response.IsSuccessStatusCode)
            {
                int loansCount = content.Split("\"loanNumber\"").Length - 1;
                Console.WriteLine($"  Loans found: ~{loansCount}");
                
                if (content.Length < 1000)
                {
                    Console.WriteLine($"  Response: {content}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  EXCEPTION: {ex.Message}");
        }
        
        // Test 3: Status Overdue
        Console.WriteLine("\nTest 3: Status=Overdue");
        try
        {
            var response = await client.GetAsync("MicrocreditLoan?page=1&pageSize=100&status=Overdue");
            var content = await response.Content.ReadAsStringAsync();
            
            Console.WriteLine($"  Status: {response.StatusCode}");
            Console.WriteLine($"  Content Length: {content.Length}");
            
            if (response.IsSuccessStatusCode)
            {
                int loansCount = content.Split("\"loanNumber\"").Length - 1;
                Console.WriteLine($"  Loans found: ~{loansCount}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  EXCEPTION: {ex.Message}");
        }

        Console.WriteLine("\n" + "=".PadRight(70, '='));
        Console.WriteLine("FIN DES TESTS");
        Console.WriteLine("=".PadRight(70, '='));
        
        Console.WriteLine("\nPress any key to exit...");
        Console.ReadKey();
    }
}
