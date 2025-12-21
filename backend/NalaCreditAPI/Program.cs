using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using NalaCreditAPI.Services.Savings;
using NalaCreditAPI.Services.ClientAccounts;
using StackExchange.Redis;
using System.Text;
using Microsoft.Extensions.FileProviders;
using System.IO;

// Enable legacy timestamp behavior to avoid exceptions when DateTime Kind is Unspecified
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
// Ensure infinity timestamp values are converted by Npgsql (do NOT set to true)
AppContext.SetSwitch("Npgsql.DisableDateTimeInfinityConversions", false);

var builder = WebApplication.CreateBuilder(args);

// Configure URLs explicitly to avoid port conflicts
var urls = builder.Configuration["ASPNETCORE_URLS"] ?? "http://localhost:5000;https://localhost:5001";
builder.WebHost.UseUrls(urls.Split(';'));

// Add services to the container.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add Identity
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    // Password settings
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 8;

    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;

    // User settings
    options.User.RequireUniqueEmail = true;
    options.SignIn.RequireConfirmedAccount = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// JWT Configuration
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!)),
        ClockSkew = TimeSpan.Zero
    };
});

// Authorization
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SuperAdminPolicy", policy => policy.RequireRole("SuperAdmin"));
    options.AddPolicy("AdminPolicy", policy => policy.RequireRole("SuperAdmin", "Admin"));
    options.AddPolicy("BranchPolicy", policy => policy.RequireRole("SuperAdmin", "Manager", "Admin"));
    options.AddPolicy("CashierPolicy", policy => policy.RequireRole("SuperAdmin", "Manager", "Cashier"));
    options.AddPolicy("CreditPolicy", policy => policy.RequireRole("SuperAdmin", "Manager", "Employee"));
    options.AddPolicy("EmployeePolicy", policy => policy.RequireRole("SuperAdmin", "Manager", "Employee", "Support"));
});

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<TransactionService>();
builder.Services.AddScoped<ITransactionService, EnhancedTransactionService>();
builder.Services.AddScoped<ICreditService, CreditService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<IDashboardService, CachedDashboardService>();
builder.Services.AddScoped<IAuditService, AuditService>();

// Savings Module Services
builder.Services.AddScoped<ISavingsCustomerService, SavingsCustomerService>();
builder.Services.AddScoped<ISavingsAccountService, SavingsAccountService>();
builder.Services.AddScoped<ISavingsTransactionService, SavingsTransactionService>();

// Client Account Services
builder.Services.AddScoped<ICurrentAccountService, CurrentAccountService>();
builder.Services.AddScoped<ITermSavingsAccountService, TermSavingsAccountService>();
builder.Services.AddScoped<IClientAccountService, ClientAccountService>();

// File Storage Service
builder.Services.AddScoped<IFileStorageService, FileStorageService>();

// Microcredit Module Services
builder.Services.AddScoped<IMicrocreditFinancialCalculatorService, MicrocreditFinancialCalculatorService>();
builder.Services.AddScoped<IMicrocreditLoanApplicationService, MicrocreditLoanApplicationService>();

// Payroll Module Services
builder.Services.AddScoped<IPayrollService, PayrollService>();

// Currency Exchange Module Services
builder.Services.AddScoped<ICurrencyExchangeService, CurrencyExchangeService>();

// Branch Management Module Services
builder.Services.AddScoped<IBranchService, BranchService>();
builder.Services.AddScoped<IInterBranchTransferService, InterBranchTransferService>();
builder.Services.AddScoped<IBranchReportService, BranchReportService>();

// Redis Configuration
builder.Services.AddSingleton<ICacheService>(provider =>
{
    var configuration = provider.GetRequiredService<IConfiguration>();
    var logger = provider.GetRequiredService<ILogger<CacheService>>();
    var enabled = configuration.GetValue<bool?>("Redis:Enabled") ?? true;

    if (!enabled)
    {
        return new NoOpCacheService(logger);
    }

    var connectionString = configuration.GetConnectionString("Redis") ?? "localhost:6379";
    var options = ConfigurationOptions.Parse(connectionString);
    options.AbortOnConnectFail = false;
    options.ConnectRetry = 2;
    options.ConnectTimeout = 5000;
    options.SyncTimeout = 5000;

    try
    {
        var multiplexer = ConnectionMultiplexer.Connect(options);
        return new CacheService(multiplexer, logger);
    }
    catch (Exception ex)
    {
        var loggerFactory = provider.GetRequiredService<ILoggerFactory>();
        loggerFactory.CreateLogger("RedisStartup").LogWarning(ex, "Redis indisponib – cache an mode degrade");
        return new NoOpCacheService(logger);
    }
});

// RabbitMQ Configuration
builder.Services.AddSingleton<IMessageQueueService, MessageQueueService>();

// SignalR
builder.Services.AddSignalR();
builder.Services.AddSingleton<INotificationService, NotificationService>();

// AutoMapper
builder.Services.AddAutoMapper(typeof(Program));

// Controllers with camelCase JSON (for frontend compatibility)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Use camelCase for property names (JavaScript/TypeScript default)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Convert enums to strings for frontend compatibility
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Nala Kredi API", Version = "v1" });
    
    // JWT Bearer configuration
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Development origins
        var origins = new List<string>
        {
            "http://localhost:3000",
            "https://localhost:3000",
            "http://localhost:3001",
            "https://localhost:3001"
        };

        // Add production origins from configuration
        var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>();
        if (corsOrigins != null && corsOrigins.Length > 0)
        {
            origins.AddRange(corsOrigins);
        }

        policy.WithOrigins(origins.ToArray())
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Required for SignalR
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection(); // Commented out for development

app.UseCors("AllowFrontend");

// Serve static files from wwwroot/uploads
app.UseStaticFiles();

// Also serve files from content-root "uploads" directory at the same /uploads path
// This covers services that write to ContentRoot/uploads instead of wwwroot/uploads
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
if (Directory.Exists(uploadsPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(uploadsPath),
        RequestPath = "/uploads"
    });
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SignalR Hubs
app.MapHub<NotificationHub>("/notificationHub");

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    try
    {
        await DbInitializer.Initialize(dbContext, userManager, roleManager);
    }
    catch (Exception ex)
    {
        // Log full exception to help diagnose connectivity / Npgsql conversion issues during startup
        Console.WriteLine("[WARN] Database initialization failed:");
        Console.WriteLine(ex.ToString());
        Console.WriteLine("The API will continue to start, but database operations may fail until the database is reachable.");
    }
}

app.Run();