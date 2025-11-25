using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace NalaCreditAPI.TempTables;

public partial class NalakreditimachannDbContext : DbContext
{
    public NalakreditimachannDbContext()
    {
    }

    public NalakreditimachannDbContext(DbContextOptions<NalakreditimachannDbContext> options)
        : base(options)
    {
    }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                // Use environment variable or fallback local dev connection string.
                var conn = Environment.GetEnvironmentVariable("NALACREDIT_TEMP_DB")
                           ?? "Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=postgres";
                optionsBuilder.UseNpgsql(conn);
            }
        }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
