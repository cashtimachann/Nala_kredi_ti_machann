using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NalaCreditAPI.Controllers.ClientAccounts;
using NalaCreditAPI.DTOs.ClientAccounts;
using NalaCreditAPI.Services.ClientAccounts;
using Xunit;

namespace NalaCreditAPI.UnitTests
{
    public class ClientAccountControllerTests
    {
        [Fact]
        public async Task GetAccountByNumber_WhenServiceThrows_Returns500WithGenericMessage()
        {
            var mockService = new Mock<IClientAccountService>();
            mockService.Setup(s => s.GetAccountByNumberAsync(It.IsAny<string>()))
                .ThrowsAsync(new NullReferenceException("Test NRE"));

            var controller = new ClientAccountController(mockService.Object, null);

            var result = await controller.GetAccountByNumber("ACC-123");

            var status = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(500, status.StatusCode);
            Assert.NotNull(status.Value);
            // Ensure we don't return raw exception message to the client
            Assert.DoesNotContain("NullReferenceException", status.Value.ToString(), StringComparison.OrdinalIgnoreCase);
        }
    }
}
