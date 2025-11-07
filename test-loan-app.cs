using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Text.Json;

class Program
{
    static async Task Main(string[] args)
    {
        var handler = new HttpClientHandler();
        handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true;

        using var client = new HttpClient(handler);
        client.BaseAddress = new Uri("https://localhost:5001/");

        try
        {
            // First, check if there are any savings customers
            Console.WriteLine("Checking for savings customers...");
            var customersResponse = await client.GetAsync("api/savings/customers");
            if (customersResponse.IsSuccessStatusCode)
            {
                var customers = await customersResponse.Content.ReadFromJsonAsync<JsonElement>();
                Console.WriteLine($"Found customers response");

                // Try to parse as array
                if (customers.ValueKind == JsonValueKind.Array)
                {
                    var customerArray = customers.EnumerateArray();
                    int count = 0;
                    foreach (var customer in customerArray)
                    {
                        count++;
                        if (count <= 3) // Show first 3 customers
                        {
                            Console.WriteLine($"Customer {count}: {customer}");
                        }
                    }
                    Console.WriteLine($"Total customers found: {count}");

                    if (count > 0)
                    {
                        // Get the first customer to use for testing
                        var firstCustomer = customerArray.First();
                        var customerId = firstCustomer.GetProperty("id").GetString();
                        var accountId = firstCustomer.GetProperty("savingsAccountId").GetString();

                        Console.WriteLine($"Using customer ID: {customerId}, Account ID: {accountId}");

                        // Now try to create a loan application
                        var testApplication = new
                        {
                            SavingsAccountId = accountId,
                            LoanAmount = 10000,
                            LoanTermMonths = 12,
                            InterestRate = 15.0,
                            Purpose = "Test loan application after fix"
                        };

                        Console.WriteLine("Testing loan application creation...");
                        var createResponse = await client.PostAsJsonAsync("api/microcredit/loan-applications", testApplication);
                        Console.WriteLine($"Create response: {createResponse.StatusCode}");

                        if (!createResponse.IsSuccessStatusCode)
                        {
                            var error = await createResponse.Content.ReadAsStringAsync();
                            Console.WriteLine($"Error: {error}");
                        }
                        else
                        {
                            var result = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
                            Console.WriteLine($"Success! Created loan application: {result}");
                        }
                    }
                }
                else
                {
                    Console.WriteLine($"Unexpected response format: {customers}");
                }
            }
            else
            {
                Console.WriteLine($"Failed to get customers: {customersResponse.StatusCode} - {await customersResponse.Content.ReadAsStringAsync()}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
        }
    }
}